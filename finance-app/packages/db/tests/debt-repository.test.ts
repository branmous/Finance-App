import { describe, expect, it } from "vitest";

import { createCategoryRepository } from "../src/category-repository";
import {
  DebtCategoryNotFoundError,
  DebtPeriodOutOfRangeError,
  DebtRangeError,
  createDebtRepository,
} from "../src/debt-repository";
import { createExpenseRepository } from "../src/expense-repository";
import { createUserRepository } from "../src/user-repository";
import { createTestDb } from "./helpers";

const categoryInput = { name: "Insurance", type: "fixed", color: "#0f766e", icon: "home" } as const;
const TODAY = "2026-10-07";

async function setup() {
  const db = await createTestDb();
  const users = createUserRepository(db);
  const alice = await users.createUser({ username: "alice", email: "alice@x.com", passwordHash: "h" });
  const bob = await users.createUser({ username: "bob", email: "bob@x.com", passwordHash: "h" });
  const categories = createCategoryRepository(db);
  const insurance = await categories.create(alice.id, categoryInput);
  const bobCategory = await categories.create(bob.id, categoryInput);
  const input = {
    name: "Motorbike insurance",
    categoryId: insurance.id,
    installmentMinor: 300,
    startPeriod: "2026-08",
    totalInstallments: 11,
    alreadyPaid: 3,
    note: "",
  };
  return {
    debts: createDebtRepository(db),
    expenses: createExpenseRepository(db),
    alice,
    bob,
    insurance,
    bobCategory,
    input,
  };
}

describe("debt repository", () => {
  it("creates a debt and records the installments already paid as paid expenses", async () => {
    const { debts, expenses, alice, insurance, input } = await setup();
    const created = await debts.create(alice.id, input, TODAY);

    const [listed] = await debts.list(alice.id);
    expect(listed).toMatchObject({
      id: created.id,
      name: "Motorbike insurance",
      installmentMinor: 300,
      startPeriod: "2026-08",
      totalInstallments: 11,
      categoryName: "Insurance",
      categoryColor: insurance.color,
    });
    expect(listed?.paidPeriods).toEqual(["2026-08", "2026-09", "2026-10"]);

    const august = await expenses.listByPeriod(alice.id, "2026-08");
    expect(august).toHaveLength(1);
    expect(august[0]).toMatchObject({
      amountMinor: 300,
      categoryId: insurance.id,
      paidOn: "2026-08-01",
      note: "Motorbike insurance",
    });
  });

  it("includes paid installments in the month totals", async () => {
    const { debts, expenses, alice, input } = await setup();
    await debts.create(alice.id, input, TODAY);
    await expect(expenses.summaryByPeriod(alice.id, "2026-09")).resolves.toMatchObject({ paid: 300, total: 300 });
  });

  it("never dates a payment in the future", async () => {
    const { debts, expenses, alice, input } = await setup();
    const created = await debts.create(alice.id, { ...input, alreadyPaid: 0 }, TODAY);
    await debts.markPaid(alice.id, created.id, "2026-12", TODAY);
    const [listed] = await debts.list(alice.id);
    expect(listed?.paidPeriods).toEqual(["2026-12"]);
    const [expense] = await expenses.listByPeriod(alice.id, "2026-12");
    expect(expense?.paidOn).toBe(TODAY);
  });

  it("rejects a category that belongs to another user", async () => {
    const { debts, alice, bobCategory, input } = await setup();
    await expect(debts.create(alice.id, { ...input, categoryId: bobCategory.id }, TODAY)).rejects.toBeInstanceOf(
      DebtCategoryNotFoundError,
    );
    await expect(debts.list(alice.id)).resolves.toHaveLength(0);
  });

  it("marks an installment paid once, however many times it is asked", async () => {
    const { debts, expenses, alice, input } = await setup();
    const created = await debts.create(alice.id, { ...input, alreadyPaid: 0 }, TODAY);
    await debts.markPaid(alice.id, created.id, "2026-09", TODAY);
    await debts.markPaid(alice.id, created.id, "2026-09", TODAY);

    await expect(expenses.listByPeriod(alice.id, "2026-09")).resolves.toHaveLength(1);
    const [listed] = await debts.list(alice.id);
    expect(listed?.paidPeriods).toEqual(["2026-09"]);
  });

  it("treats an installment whose expense was set back to pending as unpaid, and pays it again", async () => {
    const { debts, expenses, alice, input } = await setup();
    const created = await debts.create(alice.id, { ...input, alreadyPaid: 1 }, TODAY);
    const [expense] = await expenses.listByPeriod(alice.id, "2026-08");
    await expenses.update(alice.id, expense!.id, {
      categoryId: expense!.categoryId,
      amountMinor: expense!.amountMinor,
      period: expense!.period,
      paidOn: null,
      note: expense!.note,
      parentId: null,
    });
    expect((await debts.list(alice.id))[0]?.paidPeriods).toEqual([]);

    await debts.markPaid(alice.id, created.id, "2026-08", TODAY);
    expect((await debts.list(alice.id))[0]?.paidPeriods).toEqual(["2026-08"]);
    await expect(expenses.listByPeriod(alice.id, "2026-08")).resolves.toHaveLength(1);
  });

  it("unmarks an installment by removing its expense", async () => {
    const { debts, expenses, alice, input } = await setup();
    const created = await debts.create(alice.id, input, TODAY);
    await expect(debts.unmarkPaid(alice.id, created.id, "2026-09")).resolves.toBe(true);

    await expect(expenses.listByPeriod(alice.id, "2026-09")).resolves.toHaveLength(0);
    expect((await debts.list(alice.id))[0]?.paidPeriods).toEqual(["2026-08", "2026-10"]);
    await expect(debts.unmarkPaid(alice.id, created.id, "2026-09")).resolves.toBe(false);
  });

  it("marks every installment up to a month as paid", async () => {
    const { debts, alice, input } = await setup();
    const created = await debts.create(alice.id, { ...input, alreadyPaid: 1 }, TODAY);
    await debts.markPaidUpTo(alice.id, created.id, "2026-11", TODAY);
    expect((await debts.list(alice.id))[0]?.paidPeriods).toEqual(["2026-08", "2026-09", "2026-10", "2026-11"]);
  });

  it("rejects months outside the range of the debt", async () => {
    const { debts, alice, input } = await setup();
    const created = await debts.create(alice.id, input, TODAY);
    await expect(debts.markPaid(alice.id, created.id, "2026-07", TODAY)).rejects.toBeInstanceOf(
      DebtPeriodOutOfRangeError,
    );
    await expect(debts.markPaid(alice.id, created.id, "2027-07", TODAY)).rejects.toBeInstanceOf(
      DebtPeriodOutOfRangeError,
    );
    await expect(debts.markPaidUpTo(alice.id, created.id, "2027-07", TODAY)).rejects.toBeInstanceOf(
      DebtPeriodOutOfRangeError,
    );
  });

  it("does not let a user touch the debt of another user", async () => {
    const { debts, expenses, alice, bob, input } = await setup();
    const created = await debts.create(alice.id, input, TODAY);

    await expect(debts.markPaid(bob.id, created.id, "2026-11", TODAY)).resolves.toBe(false);
    await expect(debts.markPaidUpTo(bob.id, created.id, "2026-11", TODAY)).resolves.toBe(false);
    await expect(debts.unmarkPaid(bob.id, created.id, "2026-08")).resolves.toBe(false);
    await expect(debts.remove(bob.id, created.id)).resolves.toBe(false);
    await expect(debts.list(bob.id)).resolves.toHaveLength(0);
    await expect(expenses.listByPeriod(bob.id, "2026-11")).resolves.toHaveLength(0);
    await expect(debts.list(alice.id)).resolves.toHaveLength(1);
  });

  it("updates the debt but refuses a range that would leave paid installments outside it", async () => {
    const { debts, alice, input } = await setup();
    const created = await debts.create(alice.id, input, TODAY); // paid Aug, Sep, Oct

    const updated = await debts.update(alice.id, created.id, { ...input, name: "Bike cover", installmentMinor: 350 });
    expect(updated).toMatchObject({ name: "Bike cover", installmentMinor: 350 });

    await expect(debts.update(alice.id, created.id, { ...input, totalInstallments: 2 })).rejects.toBeInstanceOf(
      DebtRangeError,
    );
    await expect(debts.update(alice.id, created.id, { ...input, startPeriod: "2026-09" })).rejects.toBeInstanceOf(
      DebtRangeError,
    );
    await expect(debts.update(alice.id, "00000000-0000-4000-8000-000000000000", input)).resolves.toBeNull();
  });

  it("keeps the paid expenses when the debt is removed", async () => {
    const { debts, expenses, alice, input } = await setup();
    const created = await debts.create(alice.id, input, TODAY);
    await expect(debts.remove(alice.id, created.id)).resolves.toBe(true);

    await expect(debts.list(alice.id)).resolves.toHaveLength(0);
    await expect(expenses.listByPeriod(alice.id, "2026-09")).resolves.toHaveLength(1);
  });
});
