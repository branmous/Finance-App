import { describe, expect, it } from "vitest";

import { createCategoryRepository } from "../src/category-repository";
import {
  DebtCategoryNotFoundError,
  DebtKindError,
  DebtLockedError,
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
    kind: "monthly" as const,
    name: "Motorbike insurance",
    categoryId: insurance.id,
    installmentMinor: 300,
    totalMinor: null,
    startPeriod: "2026-08",
    totalInstallments: 11,
    alreadyPaid: 3,
    note: "",
  };
  // 1.000.000 split over 3 months: 333.333, 333.333 and 333.334.
  const deferredInput = {
    kind: "deferred" as const,
    name: "Laptop",
    categoryId: insurance.id,
    installmentMinor: 333_333,
    totalMinor: 1_000_000,
    startPeriod: "2026-08",
    totalInstallments: 3,
    alreadyPaid: 0,
    note: "",
  };
  return {
    deferredInput,
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

  it("lists a monthly debt with its kind and no total", async () => {
    const { debts, alice, input } = await setup();
    await debts.create(alice.id, input, TODAY);
    expect((await debts.list(alice.id))[0]).toMatchObject({ kind: "monthly", totalMinor: null });
  });

  describe("deferred debts", () => {
    it("stores the total, the rounded installment and the months", async () => {
      const { debts, alice, deferredInput } = await setup();
      await debts.create(alice.id, deferredInput, TODAY);
      expect((await debts.list(alice.id))[0]).toMatchObject({
        kind: "deferred",
        totalMinor: 1_000_000,
        installmentMinor: 333_333,
        totalInstallments: 3,
        paidPeriods: [],
      });
    });

    it("records the installments already paid with their real amounts", async () => {
      const { debts, expenses, alice, deferredInput } = await setup();
      await debts.create(alice.id, { ...deferredInput, alreadyPaid: 2 }, TODAY);
      const aug = await expenses.listByPeriod(alice.id, "2026-08");
      const sep = await expenses.listByPeriod(alice.id, "2026-09");
      expect([aug[0]?.amountMinor, sep[0]?.amountMinor]).toEqual([333_333, 333_333]);
      expect((await debts.list(alice.id))[0]?.paidPeriods).toEqual(["2026-08", "2026-09"]);
    });

    it("pays the last installment with the leftover, so every expense adds up to the total", async () => {
      const { debts, expenses, alice, deferredInput } = await setup();
      const created = await debts.create(alice.id, deferredInput, TODAY);
      await debts.markPaid(alice.id, created.id, "2026-10", TODAY);
      const [last] = await expenses.listByPeriod(alice.id, "2026-10");
      expect(last?.amountMinor).toBe(333_334);

      await debts.markPaidUpTo(alice.id, created.id, "2026-10", TODAY);
      const all = [
        ...(await expenses.listByPeriod(alice.id, "2026-08")),
        ...(await expenses.listByPeriod(alice.id, "2026-09")),
        ...(await expenses.listByPeriod(alice.id, "2026-10")),
      ];
      expect(all.map((row) => row.amountMinor)).toEqual([333_333, 333_333, 333_334]);
      expect(all.reduce((sum, row) => sum + row.amountMinor, 0)).toBe(1_000_000);
    });

    it("does not duplicate an installment paid twice and can unpay it", async () => {
      const { debts, expenses, alice, deferredInput } = await setup();
      const created = await debts.create(alice.id, deferredInput, TODAY);
      await debts.markPaid(alice.id, created.id, "2026-10", TODAY);
      await debts.markPaid(alice.id, created.id, "2026-10", TODAY);
      await expect(expenses.listByPeriod(alice.id, "2026-10")).resolves.toHaveLength(1);
      await expect(debts.unmarkPaid(alice.id, created.id, "2026-10")).resolves.toBe(true);
      await expect(expenses.listByPeriod(alice.id, "2026-10")).resolves.toHaveLength(0);
    });

    it("rejects a total smaller than the months at the database level", async () => {
      const { debts, alice, deferredInput } = await setup();
      await expect(
        debts.create(alice.id, { ...deferredInput, totalMinor: 2, installmentMinor: 0 }, TODAY),
      ).rejects.toThrow();
    });

    it("recalculates the installment when the total changes and nothing is paid", async () => {
      const { debts, alice, deferredInput } = await setup();
      const created = await debts.create(alice.id, deferredInput, TODAY);
      const updated = await debts.update(alice.id, created.id, {
        ...deferredInput,
        totalMinor: 1_200_000,
        installmentMinor: 400_000,
      });
      expect(updated).toMatchObject({ totalMinor: 1_200_000, installmentMinor: 400_000 });
    });

    it("locks the total and the months once an installment is paid, but not the name", async () => {
      const { debts, alice, deferredInput } = await setup();
      const created = await debts.create(alice.id, { ...deferredInput, alreadyPaid: 1 }, TODAY);

      await expect(
        debts.update(alice.id, created.id, { ...deferredInput, totalMinor: 1_200_000, installmentMinor: 400_000 }),
      ).rejects.toBeInstanceOf(DebtLockedError);
      await expect(
        debts.update(alice.id, created.id, { ...deferredInput, totalInstallments: 4, installmentMinor: 250_000 }),
      ).rejects.toBeInstanceOf(DebtLockedError);

      const renamed = await debts.update(alice.id, created.id, { ...deferredInput, name: "Work laptop", note: "x" });
      expect(renamed).toMatchObject({ name: "Work laptop", note: "x", totalMinor: 1_000_000 });

      await debts.unmarkPaid(alice.id, created.id, "2026-08");
      await expect(
        debts.update(alice.id, created.id, { ...deferredInput, totalMinor: 1_200_000, installmentMinor: 400_000 }),
      ).resolves.toMatchObject({ totalMinor: 1_200_000 });
    });

    it("does not let an edit change the kind of a debt", async () => {
      const { debts, alice, input, deferredInput } = await setup();
      const created = await debts.create(alice.id, deferredInput, TODAY);
      await expect(debts.update(alice.id, created.id, { ...input, alreadyPaid: 0 })).rejects.toBeInstanceOf(
        DebtKindError,
      );
    });
  });

  it("keeps the paid expenses when the debt is removed", async () => {
    const { debts, expenses, alice, input } = await setup();
    const created = await debts.create(alice.id, input, TODAY);
    await expect(debts.remove(alice.id, created.id)).resolves.toBe(true);

    await expect(debts.list(alice.id)).resolves.toHaveLength(0);
    await expect(expenses.listByPeriod(alice.id, "2026-09")).resolves.toHaveLength(1);
  });
});
