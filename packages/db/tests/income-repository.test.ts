import { describe, expect, it } from "vitest";

import { createIncomeRepository } from "../src/income-repository";
import { createUserRepository } from "../src/user-repository";
import { createTestDb } from "./helpers";

async function setup() {
  const db = await createTestDb();
  const users = createUserRepository(db);
  const alice = await users.createUser({ username: "alice", email: "alice@x.com", passwordHash: "h" });
  const bob = await users.createUser({ username: "bob", email: "bob@x.com", passwordHash: "h" });
  const input = { type: "payroll", amountMinor: 3000000, period: "2026-09", note: "" } as const;
  return { repo: createIncomeRepository(db), alice, bob, input };
}

describe("income repository", () => {
  it("creates an income and lists it by period", async () => {
    const { repo, alice, input } = await setup();
    const created = await repo.create(alice.id, input);
    expect(created).toMatchObject({ ...input, userId: alice.id, currency: "COP" });
    expect(await repo.listByPeriod(alice.id, "2026-09")).toHaveLength(1);
    expect(await repo.listByPeriod(alice.id, "2026-10")).toHaveLength(0);
  });

  it("sums the month and returns 0 for an empty one", async () => {
    const { repo, alice, input } = await setup();
    await repo.create(alice.id, input);
    await repo.create(alice.id, { ...input, type: "other", amountMinor: 500000 });
    expect(await repo.totalByPeriod(alice.id, "2026-09")).toBe(3500000);
    expect(await repo.totalByPeriod(alice.id, "2026-10")).toBe(0);
  });

  it("updates and bumps updatedAt", async () => {
    const { repo, alice, input } = await setup();
    const created = await repo.create(alice.id, input);
    const updated = await repo.update(alice.id, created.id, { ...input, amountMinor: 1 });
    expect(updated?.amountMinor).toBe(1);
    expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
  });

  it("removes an income", async () => {
    const { repo, alice, input } = await setup();
    const created = await repo.create(alice.id, input);
    expect(await repo.remove(alice.id, created.id)).toBe(true);
    expect(await repo.listByPeriod(alice.id, "2026-09")).toHaveLength(0);
  });

  it("isolates users", async () => {
    const { repo, alice, bob, input } = await setup();
    const created = await repo.create(alice.id, input);
    expect(await repo.listByPeriod(bob.id, "2026-09")).toHaveLength(0);
    expect(await repo.totalByPeriod(bob.id, "2026-09")).toBe(0);
    expect(await repo.update(bob.id, created.id, input)).toBeNull();
    expect(await repo.remove(bob.id, created.id)).toBe(false);
  });
});
