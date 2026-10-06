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

  it("blocks deleting a category that has expenses, and allows it once they are gone", async () => {
    const { repo, categories, alice, rent, input } = await setup();
    const created = await repo.create(alice.id, input);

    await expect(categories.remove(alice.id, rent.id)).rejects.toBeInstanceOf(CategoryInUseError);
    await expect(categories.list(alice.id)).resolves.toHaveLength(1);

    await repo.remove(alice.id, created.id);
    await expect(categories.remove(alice.id, rent.id)).resolves.toBe(true);
  });
});
