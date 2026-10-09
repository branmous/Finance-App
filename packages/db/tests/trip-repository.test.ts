import { describe, expect, it } from "vitest";

import {
  TripParticipantInUseError,
  TripParticipantNotFoundError,
  TripParticipantRuleError,
  createTripRepository,
} from "../src/trip-repository";
import { createUserRepository } from "../src/user-repository";
import { createTestDb } from "./helpers";

async function setup() {
  const db = await createTestDb();
  const users = createUserRepository(db);
  const alice = await users.createUser({ username: "alice", email: "alice@x.com", passwordHash: "h" });
  const bob = await users.createUser({ username: "bob", email: "bob@x.com", passwordHash: "h" });
  const repo = createTripRepository(db);
  const group = await repo.create(alice.id, {
    name: "Santander",
    kind: "group",
    startDate: "2026-12-20",
    endDate: "2026-12-28",
    participants: ["Me", "Ana", "Leo"],
  });
  const detail = (await repo.get(alice.id, group.id))!;
  const [me, ana, leo] = detail.participants as [
    (typeof detail.participants)[number],
    (typeof detail.participants)[number],
    (typeof detail.participants)[number],
  ];
  const expense = (paidById: string | null, shareIds: string[]) => ({
    description: "Hotel",
    category: "lodging" as const,
    amountMinor: 900_000,
    spentOn: null,
    status: paidById ? ("paid" as const) : ("pending" as const),
    paidById,
    shareIds,
  });
  return { repo, alice, bob, group, me, ana, leo, expense };
}

describe("trip repository", () => {
  it("creates a trip with its people in order", async () => {
    const { repo, alice, group } = await setup();
    const detail = await repo.get(alice.id, group.id);
    expect(detail?.participants.map((p) => p.name)).toEqual(["Me", "Ana", "Leo"]);
    expect(detail?.trip).toMatchObject({ name: "Santander", kind: "group", startDate: "2026-12-20" });
  });

  it("lists trips with people count and expense total", async () => {
    const { repo, alice, group, me, ana, leo, expense } = await setup();
    await repo.createExpense(alice.id, group.id, expense(me.id, [me.id, ana.id, leo.id]));
    await repo.createExpense(alice.id, group.id, expense(null, [me.id]));
    const [item] = await repo.list(alice.id);
    expect(item).toMatchObject({ name: "Santander", participantCount: 3, totalMinor: 1_800_000, settled: false });
  });

  it("flags a trip as settled once everything is paid and nobody owes", async () => {
    const { repo, alice, group, me, ana, leo, expense } = await setup();
    await repo.createExpense(alice.id, group.id, expense(me.id, [me.id, ana.id, leo.id]));
    expect((await repo.list(alice.id))[0]?.settled).toBe(false);

    // Ana and Leo each owe Me 300.000; the trip is settled when both have paid.
    await repo.createSettlement(alice.id, group.id, { fromId: ana.id, toId: me.id, amountMinor: 300_000, paidOn: null });
    expect((await repo.list(alice.id))[0]?.settled).toBe(false);
    await repo.createSettlement(alice.id, group.id, { fromId: leo.id, toId: me.id, amountMinor: 300_000, paidOn: null });
    expect((await repo.list(alice.id))[0]?.settled).toBe(true);

    // A pending expense reopens it.
    await repo.createExpense(alice.id, group.id, expense(null, [me.id]));
    expect((await repo.list(alice.id))[0]?.settled).toBe(false);
  });

  it("does not mix the accounts of two trips in the list", async () => {
    const { repo, alice, group, me, expense } = await setup();
    const solo = await repo.create(alice.id, {
      name: "Solo",
      kind: "individual",
      startDate: null,
      endDate: null,
      participants: ["Me"],
    });
    const soloMe = (await repo.get(alice.id, solo.id))!.participants[0]!;
    await repo.createExpense(alice.id, solo.id, expense(soloMe.id, [soloMe.id]));
    await repo.createExpense(alice.id, group.id, expense(null, [me.id]));

    const byName = Object.fromEntries((await repo.list(alice.id)).map((item) => [item.name, item]));
    expect(byName["Solo"]).toMatchObject({ participantCount: 1, totalMinor: 900_000, settled: true });
    expect(byName["Santander"]).toMatchObject({ participantCount: 3, totalMinor: 900_000, settled: false });
  });

  it("stores an expense with its shares and lets a person be left out", async () => {
    const { repo, alice, group, me, ana, leo, expense } = await setup();
    const created = await repo.createExpense(alice.id, group.id, expense(me.id, [me.id, ana.id]));
    expect(created?.shareIds).toEqual([me.id, ana.id]);

    const detail = await repo.get(alice.id, group.id);
    expect(detail?.expenses[0]?.shareIds).toEqual([me.id, ana.id]);
    expect(detail?.expenses[0]?.shareIds).not.toContain(leo.id);
  });

  it("toggles shares and payment without touching the rest", async () => {
    const { repo, alice, group, me, ana, leo, expense } = await setup();
    const created = (await repo.createExpense(alice.id, group.id, expense(null, [me.id, ana.id, leo.id])))!;

    expect(await repo.setExpenseShares(alice.id, created.id, [me.id, leo.id])).toBe(true);
    expect(await repo.setExpensePayment(alice.id, created.id, { status: "paid", paidById: ana.id })).toBe(true);

    const [saved] = (await repo.get(alice.id, group.id))!.expenses;
    expect(saved).toMatchObject({ status: "paid", paidById: ana.id, amountMinor: 900_000 });
    expect(saved?.shareIds).toEqual([me.id, leo.id]);

    await repo.setExpensePayment(alice.id, created.id, { status: "pending", paidById: ana.id });
    expect((await repo.get(alice.id, group.id))!.expenses[0]).toMatchObject({ status: "pending", paidById: null });
  });

  it("updates an expense and replaces its shares", async () => {
    const { repo, alice, group, me, ana, expense } = await setup();
    const created = (await repo.createExpense(alice.id, group.id, expense(null, [me.id, ana.id])))!;
    const updated = await repo.updateExpense(alice.id, created.id, {
      ...expense(me.id, [me.id]),
      amountMinor: 500_000,
    });
    expect(updated).toMatchObject({ amountMinor: 500_000, status: "paid", shareIds: [me.id] });
  });

  it("rejects people that are not in the trip", async () => {
    const { repo, alice, group, me, expense } = await setup();
    const other = await repo.create(alice.id, { name: "Other", kind: "individual", startDate: null, endDate: null, participants: ["Me"] });
    const stranger = (await repo.get(alice.id, other.id))!.participants[0]!;
    await expect(repo.createExpense(alice.id, group.id, expense(me.id, [stranger.id]))).rejects.toBeInstanceOf(
      TripParticipantNotFoundError,
    );
  });

  it("records settlements", async () => {
    const { repo, alice, group, me, ana } = await setup();
    const created = await repo.createSettlement(alice.id, group.id, {
      fromId: ana.id,
      toId: me.id,
      amountMinor: 100_000,
      paidOn: null,
    });
    expect(created).toMatchObject({ amountMinor: 100_000, fromId: ana.id, toId: me.id });
    expect((await repo.get(alice.id, group.id))!.settlements).toHaveLength(1);
    expect(await repo.removeSettlement(alice.id, created!.id)).toBe(true);
  });

  it("adds a person, and blocks removing one who paid or settled", async () => {
    const { repo, alice, group, me, ana, leo, expense } = await setup();
    const added = await repo.addParticipant(alice.id, group.id, "Sofia");
    expect(added).toMatchObject({ name: "Sofia", position: 3 });
    await expect(repo.addParticipant(alice.id, group.id, "ana")).rejects.toMatchObject({
      code: "duplicatePeople",
    });

    await repo.createExpense(alice.id, group.id, expense(ana.id, [me.id, ana.id]));
    await expect(repo.removeParticipant(alice.id, group.id, ana.id)).rejects.toBeInstanceOf(TripParticipantInUseError);

    expect(await repo.removeParticipant(alice.id, group.id, leo.id)).toBe(true);
  });

  it("keeps individual trips at one person and group trips at two or more", async () => {
    const { repo, alice, group, me, ana } = await setup();
    const solo = await repo.create(alice.id, { name: "Punta Cana", kind: "individual", startDate: null, endDate: null, participants: ["Me"] });
    await expect(repo.addParticipant(alice.id, solo.id, "Ana")).rejects.toBeInstanceOf(TripParticipantRuleError);
    await expect(repo.addParticipant(alice.id, solo.id, "Ana")).rejects.toMatchObject({ code: "individualOnlyYou" });

    await repo.removeParticipant(alice.id, group.id, (await repo.get(alice.id, group.id))!.participants[2]!.id);
    await expect(repo.removeParticipant(alice.id, group.id, ana.id)).rejects.toBeInstanceOf(TripParticipantRuleError);
    await expect(repo.removeParticipant(alice.id, group.id, ana.id)).rejects.toMatchObject({ code: "groupNeedsTwo" });
    expect(me.id).toBeDefined();
  });

  it("deletes a trip with all its expenses and payments", async () => {
    const { repo, alice, group, me, ana, expense } = await setup();
    await repo.createExpense(alice.id, group.id, expense(ana.id, [me.id, ana.id]));
    await repo.createSettlement(alice.id, group.id, { fromId: me.id, toId: ana.id, amountMinor: 1, paidOn: null });
    expect(await repo.remove(alice.id, group.id)).toBe(true);
    expect(await repo.get(alice.id, group.id)).toBeNull();
    expect(await repo.list(alice.id)).toEqual([]);
  });

  it("does not let another user see or change my trip", async () => {
    const { repo, alice, bob, group, me, expense } = await setup();
    const created = (await repo.createExpense(alice.id, group.id, expense(me.id, [me.id])))!;

    expect(await repo.get(bob.id, group.id)).toBeNull();
    expect(await repo.list(bob.id)).toEqual([]);
    expect(await repo.update(bob.id, group.id, { name: "x", startDate: null, endDate: null })).toBeNull();
    expect(await repo.createExpense(bob.id, group.id, expense(me.id, [me.id]))).toBeNull();
    expect(await repo.setExpenseShares(bob.id, created.id, [me.id])).toBe(false);
    expect(await repo.setExpensePayment(bob.id, created.id, { status: "pending", paidById: null })).toBe(false);
    expect(await repo.removeExpense(bob.id, created.id)).toBe(false);
    expect(await repo.remove(bob.id, group.id)).toBe(false);
    expect(await repo.get(alice.id, group.id)).not.toBeNull();
  });
});
