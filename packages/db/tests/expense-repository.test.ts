import { describe, expect, it } from "vitest";

import { CategoryInUseError, createCategoryRepository } from "../src/category-repository";
import {
  ExpenseCategoryNotFoundError,
  InvalidExpenseParentError,
  createExpenseRepository,
} from "../src/expense-repository";
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
    parentId: null as string | null,
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

  describe("paid with another expense (parent / child)", () => {
    const card = { amountMinor: 200000, note: "Credit card" };
    const netflix = { amountMinor: 38000, note: "Netflix", paidOn: null };

    it("links an expense to a parent from the same month", async () => {
      const { repo, alice, input } = await setup();
      const parent = await repo.create(alice.id, { ...input, ...card });
      const child = await repo.create(alice.id, { ...input, ...netflix, parentId: parent.id });

      expect(child.parentId).toBe(parent.id);
      const listed = await repo.listByPeriod(alice.id, "2026-09");
      expect(listed.find((row) => row.id === child.id)?.parentId).toBe(parent.id);
      expect(listed.find((row) => row.id === parent.id)?.parentId).toBeNull();
    });

    it("counts only top-level expenses, since the child is already inside the parent's amount", async () => {
      const { repo, alice, input } = await setup();
      const parent = await repo.create(alice.id, { ...input, ...card });
      await repo.create(alice.id, { ...input, ...netflix, parentId: parent.id });

      await expect(repo.totalByPeriod(alice.id, "2026-09")).resolves.toBe(200000);
      await expect(repo.summaryByPeriod(alice.id, "2026-09")).resolves.toEqual({
        total: 200000,
        paid: 200000,
        pending: 0,
      });
    });

    it("rejects a parent from a different month", async () => {
      const { repo, alice, input } = await setup();
      const parent = await repo.create(alice.id, { ...input, ...card, period: "2026-08" });

      await expect(repo.create(alice.id, { ...input, parentId: parent.id })).rejects.toBeInstanceOf(
        InvalidExpenseParentError,
      );
      await expect(repo.create(alice.id, { ...input, parentId: parent.id })).rejects.toMatchObject({
        code: "parentOtherMonth",
      });
    });

    it("rejects a parent that does not exist or belongs to someone else", async () => {
      const { repo, alice, bob, bobCategory, input } = await setup();
      const bobExpense = await repo.create(bob.id, { ...input, categoryId: bobCategory.id });

      await expect(repo.create(alice.id, { ...input, parentId: bobExpense.id })).rejects.toBeInstanceOf(
        InvalidExpenseParentError,
      );
      await expect(
        repo.create(alice.id, { ...input, parentId: "00000000-0000-4000-8000-000000000000" }),
      ).rejects.toBeInstanceOf(InvalidExpenseParentError);
    });

    it("allows only one level of nesting", async () => {
      const { repo, alice, input } = await setup();
      const parent = await repo.create(alice.id, { ...input, ...card });
      const child = await repo.create(alice.id, { ...input, ...netflix, parentId: parent.id });

      // A child cannot be a parent.
      await expect(repo.create(alice.id, { ...input, parentId: child.id })).rejects.toBeInstanceOf(
        InvalidExpenseParentError,
      );
      // A parent that has children cannot become a child.
      const other = await repo.create(alice.id, { ...input, amountMinor: 1 });
      await expect(repo.update(alice.id, parent.id, { ...input, ...card, parentId: other.id })).rejects.toBeInstanceOf(
        InvalidExpenseParentError,
      );
    });

    it("never lets an expense be its own parent", async () => {
      const { repo, alice, input } = await setup();
      const expense = await repo.create(alice.id, input);

      await expect(repo.update(alice.id, expense.id, { ...input, parentId: expense.id })).rejects.toBeInstanceOf(
        InvalidExpenseParentError,
      );
      await expect(repo.update(alice.id, expense.id, { ...input, parentId: expense.id })).rejects.toMatchObject({
        code: "paidWithItself",
      });
    });

    it("refuses to move a linked expense, or a parent with children, to another month", async () => {
      const { repo, alice, input } = await setup();
      const parent = await repo.create(alice.id, { ...input, ...card });
      const child = await repo.create(alice.id, { ...input, ...netflix, parentId: parent.id });

      await expect(
        repo.update(alice.id, child.id, { ...input, ...netflix, period: "2026-10", parentId: parent.id }),
      ).rejects.toBeInstanceOf(InvalidExpenseParentError);
      await expect(repo.update(alice.id, parent.id, { ...input, ...card, period: "2026-10" })).rejects.toBeInstanceOf(
        InvalidExpenseParentError,
      );
      // Unlinking first makes the move possible.
      await expect(
        repo.update(alice.id, child.id, { ...input, ...netflix, period: "2026-10", parentId: null }),
      ).resolves.toMatchObject({ period: "2026-10", parentId: null });
    });

    it("makes a child independent, so it counts on its own", async () => {
      const { repo, alice, bob, input } = await setup();
      const parent = await repo.create(alice.id, { ...input, ...card });
      const child = await repo.create(alice.id, { ...input, ...netflix, parentId: parent.id });

      await expect(repo.unlink(bob.id, child.id)).resolves.toBe(false);
      await expect(repo.unlink(alice.id, child.id)).resolves.toBe(true);

      await expect(repo.summaryByPeriod(alice.id, "2026-09")).resolves.toEqual({
        total: 238000,
        paid: 200000,
        pending: 38000,
      });
    });

    it("frees the children when the parent is deleted", async () => {
      const { repo, alice, input } = await setup();
      const parent = await repo.create(alice.id, { ...input, ...card });
      const child = await repo.create(alice.id, { ...input, ...netflix, parentId: parent.id });

      await expect(repo.remove(alice.id, parent.id)).resolves.toBe(true);

      const [left] = await repo.listByPeriod(alice.id, "2026-09");
      expect(left).toMatchObject({ id: child.id, parentId: null });
      await expect(repo.totalByPeriod(alice.id, "2026-09")).resolves.toBe(38000);
    });

    it("keeps the link when parent and child are copied together", async () => {
      const { repo, alice, input } = await setup();
      const parent = await repo.create(alice.id, { ...input, ...card });
      const child = await repo.create(alice.id, { ...input, ...netflix, parentId: parent.id });

      await expect(repo.copyToPeriod(alice.id, [parent.id, child.id], "2026-10")).resolves.toBe(2);

      const copied = await repo.listByPeriod(alice.id, "2026-10");
      const copiedParent = copied.find((row) => row.note === "Credit card")!;
      const copiedChild = copied.find((row) => row.note === "Netflix")!;
      expect(copiedChild.parentId).toBe(copiedParent.id);
      expect(copiedParent.parentId).toBeNull();
      await expect(repo.totalByPeriod(alice.id, "2026-10")).resolves.toBe(200000);
    });

    it("copies a child on its own as an independent expense", async () => {
      const { repo, alice, input } = await setup();
      const parent = await repo.create(alice.id, { ...input, ...card });
      const child = await repo.create(alice.id, { ...input, ...netflix, parentId: parent.id });

      await expect(repo.copyToPeriod(alice.id, [child.id], "2026-10")).resolves.toBe(1);

      const [copied] = await repo.listByPeriod(alice.id, "2026-10");
      expect(copied).toMatchObject({ note: "Netflix", parentId: null });
    });
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
