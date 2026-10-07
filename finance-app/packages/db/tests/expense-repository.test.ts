import { describe, expect, it } from "vitest";

import { CategoryInUseError, createCategoryRepository } from "../src/category-repository";
import { ExpenseCategoryNotFoundError, createExpenseRepository } from "../src/expense-repository";
import { createUserRepository } from "../src/user-repository";
import { createTestDb } from "./helpers";

const categoryInput = { name: "Rent", type: "fixed", color: "#0f766e", icon: "home" } as const;

async function setup() {
  const db = await createTestDb();
  const users = createUserRepository(db);
  const alice = await users.createUser({ username: "alice", email: "alice@x.com", passwordHash: "h" });
  const bob = await users.createUser({ username: "bob", email: "bob@x.com", passwordHash: "h" });
  const categories = createCategoryRepository(db);
  const rent = await categories.create(alice.id, categoryInput);
  const bobCategory = await categories.create(bob.id, categoryInput);
  const input = {
    categoryId: rent.id,
    amountMinor: 2000000,
    period: "2026-09",
    paidOn: "2026-10-03",
    note: "",
  };
  return { repo: createExpenseRepository(db), categories, alice, bob, rent, bobCategory, input };
}

describe("expense repository", () => {
  it("creates an expense owned by the user and lists it with its category", async () => {
    const { repo, alice, rent, input } = await setup();
    const created = await repo.create(alice.id, input);

    expect(created).toMatchObject({ ...input, userId: alice.id, currency: "COP" });
    const [listed] = await repo.listByPeriod(alice.id, "2026-09");
    expect(listed).toMatchObject({
      id: created.id,
      amountMinor: 2000000,
      paidOn: "2026-10-03",
      categoryName: "Rent",
      categoryColor: rent.color,
      categoryIcon: rent.icon,
    });
  });

  it("files an expense under the month it belongs to, not the month it was paid", async () => {
    const { repo, alice, input } = await setup();
    await repo.create(alice.id, input); // September rent, paid in October

    await expect(repo.listByPeriod(alice.id, "2026-09")).resolves.toHaveLength(1);
    await expect(repo.listByPeriod(alice.id, "2026-10")).resolves.toHaveLength(0);
  });

  it("lists the most recently paid expense first", async () => {
    const { repo, alice, input } = await setup();
    await repo.create(alice.id, { ...input, paidOn: "2026-09-01", amountMinor: 1 });
    await repo.create(alice.id, { ...input, paidOn: "2026-09-20", amountMinor: 2 });
    await repo.create(alice.id, { ...input, paidOn: "2026-09-10", amountMinor: 3 });

    const amounts = (await repo.listByPeriod(alice.id, "2026-09")).map((row) => row.amountMinor);
    expect(amounts).toEqual([2, 3, 1]);
  });

  it("totals only the requested month, and returns 0 when it is empty", async () => {
    const { repo, alice, input } = await setup();
    await repo.create(alice.id, input);
    await repo.create(alice.id, { ...input, amountMinor: 350000 });
    await repo.create(alice.id, { ...input, period: "2026-08", amountMinor: 999 });

    await expect(repo.totalByPeriod(alice.id, "2026-09")).resolves.toBe(2350000);
    await expect(repo.totalByPeriod(alice.id, "2026-08")).resolves.toBe(999);
    await expect(repo.totalByPeriod(alice.id, "2026-07")).resolves.toBe(0);
  });

  it("only exposes the requesting user's expenses", async () => {
    const { repo, alice, bob, input } = await setup();
    await repo.create(alice.id, input);

    await expect(repo.listByPeriod(bob.id, "2026-09")).resolves.toEqual([]);
    await expect(repo.totalByPeriod(bob.id, "2026-09")).resolves.toBe(0);
  });

  it("refuses to file an expense under another user's category", async () => {
    const { repo, alice, bobCategory, input } = await setup();
    await expect(repo.create(alice.id, { ...input, categoryId: bobCategory.id })).rejects.toBeInstanceOf(
      ExpenseCategoryNotFoundError,
    );
  });

  it("updates an own expense and bumps updated_at", async () => {
    const { repo, alice, input } = await setup();
    const created = await repo.create(alice.id, input);
    const updated = await repo.update(alice.id, created.id, { ...input, amountMinor: 2100000, period: "2026-10" });

    expect(updated).toMatchObject({ id: created.id, amountMinor: 2100000, period: "2026-10" });
    expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
  });

  it("does not update another user's expense, nor move it to a foreign category", async () => {
    const { repo, alice, bob, bobCategory, input } = await setup();
    const created = await repo.create(alice.id, input);

    await expect(repo.update(bob.id, created.id, { ...input, categoryId: bobCategory.id })).resolves.toBeNull();
    await expect(repo.update(alice.id, created.id, { ...input, categoryId: bobCategory.id })).rejects.toBeInstanceOf(
      ExpenseCategoryNotFoundError,
    );
  });

  it("removes an own expense but not another user's", async () => {
    const { repo, alice, bob, input } = await setup();
    const created = await repo.create(alice.id, input);

    await expect(repo.remove(bob.id, created.id)).resolves.toBe(false);
    await expect(repo.remove(alice.id, created.id)).resolves.toBe(true);
    await expect(repo.listByPeriod(alice.id, "2026-09")).resolves.toEqual([]);
  });

  it("stores an expense with no paid date as pending, and lists pending ones first", async () => {
    const { repo, alice, input } = await setup();
    await repo.create(alice.id, { ...input, paidOn: "2026-09-20", amountMinor: 1 });
    const pending = await repo.create(alice.id, { ...input, paidOn: null, amountMinor: 2 });

    expect(pending.paidOn).toBeNull();
    const listed = await repo.listByPeriod(alice.id, "2026-09");
    expect(listed.map((row) => [row.amountMinor, row.paidOn])).toEqual([
      [2, null],
      [1, "2026-09-20"],
    ]);
  });

  it("marks a pending expense as paid by updating its date, and back", async () => {
    const { repo, alice, input } = await setup();
    const created = await repo.create(alice.id, { ...input, paidOn: null });

    await expect(repo.update(alice.id, created.id, { ...input, paidOn: "2026-09-30" })).resolves.toMatchObject({
      paidOn: "2026-09-30",
    });
    await expect(repo.update(alice.id, created.id, { ...input, paidOn: null })).resolves.toMatchObject({
      paidOn: null,
    });
  });

  it("splits a month's total into paid and pending", async () => {
    const { repo, alice, bob, input } = await setup();
    await repo.create(alice.id, { ...input, amountMinor: 2000000 });
    await repo.create(alice.id, { ...input, amountMinor: 300000, paidOn: null });
    await repo.create(alice.id, { ...input, amountMinor: 50000, paidOn: null });
    await repo.create(alice.id, { ...input, period: "2026-08", amountMinor: 9, paidOn: null });

    await expect(repo.summaryByPeriod(alice.id, "2026-09")).resolves.toEqual({
      total: 2350000,
      paid: 2000000,
      pending: 350000,
    });
    await expect(repo.summaryByPeriod(alice.id, "2026-07")).resolves.toEqual({ total: 0, paid: 0, pending: 0 });
    await expect(repo.summaryByPeriod(bob.id, "2026-09")).resolves.toEqual({ total: 0, paid: 0, pending: 0 });
  });

  it("copies selected expenses into another month as pending, keeping category, amount and note", async () => {
    const { repo, alice, rent, input } = await setup();
    const rentExpense = await repo.create(alice.id, { ...input, note: "September rent" });
    const other = await repo.create(alice.id, { ...input, amountMinor: 5, paidOn: null });

    await expect(repo.copyToPeriod(alice.id, [rentExpense.id], "2026-10")).resolves.toBe(1);

    const copied = await repo.listByPeriod(alice.id, "2026-10");
    expect(copied).toHaveLength(1);
    expect(copied[0]).toMatchObject({
      categoryId: rent.id,
      amountMinor: 2000000,
      note: "September rent",
      period: "2026-10",
      paidOn: null,
    });
    // The originals are untouched and the unselected one was not copied.
    await expect(repo.listByPeriod(alice.id, "2026-09")).resolves.toHaveLength(2);
    expect(copied[0]!.id).not.toBe(rentExpense.id);
    expect(other.id).toBeTruthy();
  });

  it("copies several at once and returns 0 for an empty selection", async () => {
    const { repo, alice, input } = await setup();
    const a = await repo.create(alice.id, input);
    const b = await repo.create(alice.id, { ...input, amountMinor: 7 });

    await expect(repo.copyToPeriod(alice.id, [], "2026-10")).resolves.toBe(0);
    await expect(repo.copyToPeriod(alice.id, [a.id, b.id], "2026-10")).resolves.toBe(2);
    await expect(repo.totalByPeriod(alice.id, "2026-10")).resolves.toBe(2000007);
  });

  it("never copies another user's expenses", async () => {
    const { repo, alice, bob, input } = await setup();
    const aliceExpense = await repo.create(alice.id, input);

    await expect(repo.copyToPeriod(bob.id, [aliceExpense.id], "2026-10")).resolves.toBe(0);
    await expect(repo.listByPeriod(bob.id, "2026-10")).resolves.toEqual([]);
    await expect(repo.listByPeriod(alice.id, "2026-10")).resolves.toEqual([]);
  });

  it("blocks deleting a category that has expenses, and allows it once they are gone", async () => {
    const { repo, categories, alice, rent, input } = await setup();
    const created = await repo.create(alice.id, input);

    await expect(categories.remove(alice.id, rent.id)).rejects.toBeInstanceOf(CategoryInUseError);
    await expect(categories.list(alice.id)).resolves.toHaveLength(1);

    await repo.remove(alice.id, created.id);
    await expect(categories.remove(alice.id, rent.id)).resolves.toBe(true);
  });
});
