import { installmentAmount, installmentPeriods, type DebtInput, type DebtKind } from "@finance-app/core";
import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";

import { categories } from "../schema/categories";
import { debts } from "../schema/debts";
import { expenses } from "../schema/expenses";
import type { DbClient } from "./user-repository";

export type DebtRow = typeof debts.$inferSelect;

export type DebtWithProgress = {
  id: string;
  name: string;
  categoryId: string;
  kind: DebtKind;
  installmentMinor: number;
  /** The total split over the months; null on a monthly debt. */
  totalMinor: number | null;
  currency: string;
  startPeriod: string;
  totalInstallments: number;
  note: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  /** Months whose installment has a paid expense, oldest first. */
  paidPeriods: string[];
};

/** The category does not exist or belongs to another user. */
export class DebtCategoryNotFoundError extends Error {
  readonly code = "categoryNotFound";
  constructor() {
    super("Category not found");
    this.name = "DebtCategoryNotFoundError";
  }
}

/** The month is not one of the debt's installments. */
export class DebtPeriodOutOfRangeError extends Error {
  readonly code = "periodOutOfRange";
  constructor() {
    super("That month is outside the debt's installments");
    this.name = "DebtPeriodOutOfRangeError";
  }
}

/** The new schedule would leave an already paid installment outside the debt. */
export class DebtRangeError extends Error {
  readonly code = "paidOutsideRange";
  constructor() {
    super("Some installments are already paid outside this range. Unmark them first.");
    this.name = "DebtRangeError";
  }
}

/** The debt's total or number of months cannot change while some installment is paid. */
export class DebtLockedError extends Error {
  readonly code = "paidInstallmentsLocked";
  constructor() {
    super("Unmark the paid installments before changing the total or the months");
    this.name = "DebtLockedError";
  }
}

/** The kind of a debt is set when it is created. */
export class DebtKindError extends Error {
  readonly code = "kindLocked";
  constructor() {
    super("The kind of a debt cannot be changed");
    this.name = "DebtKindError";
  }
}

/** The row as the domain sees it: the database stores the kind as text. */
function amountsOf(debt: DebtRow) {
  return { ...debt, kind: debt.kind as DebtKind };
}

/** First day of the installment's month, but never later than today: a payment is not in the future. */
function paidOnFor(period: string, today: string): string {
  const firstDay = `${period}-01`;
  return firstDay <= today ? firstDay : today;
}

/**
 * Every method takes the owner's userId and scopes its query by it. A paid installment is an
 * expense row (debt_id + period), so it counts in the month totals without being registered twice.
 */
export function createDebtRepository(db: DbClient) {
  async function assertOwnCategory(userId: string, categoryId: string): Promise<void> {
    const [row] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));
    if (!row) throw new DebtCategoryNotFoundError();
  }

  async function findOwn(userId: string, id: string): Promise<DebtRow | null> {
    const [row] = await db
      .select()
      .from(debts)
      .where(and(eq(debts.id, id), eq(debts.userId, userId)));
    return row ?? null;
  }

  /** Marks the given months paid: refreshes the paid date of existing rows, inserts the rest. */
  async function payPeriods(userId: string, debt: DebtRow, periods: string[], today: string): Promise<void> {
    if (periods.length === 0) return;
    const existing = await db
      .select({ id: expenses.id, period: expenses.period, paidOn: expenses.paidOn })
      .from(expenses)
      .where(and(eq(expenses.userId, userId), eq(expenses.debtId, debt.id), inArray(expenses.period, periods)));
    const existingByPeriod = new Map(existing.map((row) => [row.period, row]));

    for (const row of existing) {
      if (row.paidOn === null) {
        await db
          .update(expenses)
          .set({ paidOn: paidOnFor(row.period, today), updatedAt: new Date() })
          .where(eq(expenses.id, row.id));
      }
    }

    const missing = periods.filter((period) => !existingByPeriod.has(period));
    if (missing.length === 0) return;
    await db
      .insert(expenses)
      .values(
        missing.map((period) => ({
          userId,
          categoryId: debt.categoryId,
          amountMinor: installmentAmount(amountsOf(debt), period),
          currency: debt.currency,
          period,
          paidOn: paidOnFor(period, today),
          note: debt.name,
          debtId: debt.id,
        })),
      )
      .onConflictDoNothing();
  }

  return {
    async list(userId: string): Promise<DebtWithProgress[]> {
      const rows = await db
        .select({
          id: debts.id,
          name: debts.name,
          categoryId: debts.categoryId,
          kind: debts.kind,
          installmentMinor: debts.installmentMinor,
          totalMinor: debts.totalMinor,
          currency: debts.currency,
          startPeriod: debts.startPeriod,
          totalInstallments: debts.totalInstallments,
          note: debts.note,
          categoryName: categories.name,
          categoryColor: categories.color,
          categoryIcon: categories.icon,
        })
        .from(debts)
        .innerJoin(categories, eq(debts.categoryId, categories.id))
        .where(eq(debts.userId, userId))
        .orderBy(asc(debts.startPeriod), asc(debts.createdAt));
      if (rows.length === 0) return [];

      const paid = await db
        .select({ debtId: expenses.debtId, period: expenses.period })
        .from(expenses)
        .where(
          and(
            eq(expenses.userId, userId),
            inArray(
              expenses.debtId,
              rows.map((row) => row.id),
            ),
            isNotNull(expenses.paidOn),
          ),
        )
        .orderBy(asc(expenses.period));
      const paidByDebt = new Map<string, string[]>();
      for (const { debtId, period } of paid) {
        if (!debtId) continue;
        paidByDebt.set(debtId, [...(paidByDebt.get(debtId) ?? []), period]);
      }
      return rows.map((row) => ({ ...row, kind: row.kind as DebtKind, paidPeriods: paidByDebt.get(row.id) ?? [] }));
    },

    /**
     * Creates the debt and, when `alreadyPaid` > 0, the paid expenses of its first N months.
     * `today` ("YYYY-MM-DD") caps the payment dates so none lands in the future.
     */
    async create(userId: string, input: DebtInput, today: string): Promise<DebtRow> {
      await assertOwnCategory(userId, input.categoryId);
      const { alreadyPaid, ...values } = input;
      const [row] = await db
        .insert(debts)
        .values({ ...values, userId })
        .returning();
      if (!row) throw new Error("Insert into debts returned no row");
      try {
        await payPeriods(userId, row, installmentPeriods(row).slice(0, alreadyPaid), today);
      } catch (error) {
        // No transaction across both drivers: undo the debt so a failure leaves nothing behind.
        await db.delete(debts).where(eq(debts.id, row.id));
        throw error;
      }
      return row;
    },

    /** Edits the debt. `alreadyPaid` is ignored here: payments are changed month by month. */
    async update(userId: string, id: string, input: DebtInput): Promise<DebtRow | null> {
      const current = await findOwn(userId, id);
      if (!current) return null;
      await assertOwnCategory(userId, input.categoryId);
      if (input.kind !== current.kind) throw new DebtKindError();

      const allowed = new Set(installmentPeriods(input));
      const recorded = await db
        .select({ period: expenses.period })
        .from(expenses)
        .where(and(eq(expenses.userId, userId), eq(expenses.debtId, id)));
      // Paid expenses keep their amount, so a deferred debt could stop adding up to its total.
      if (
        current.kind === "deferred" &&
        recorded.length > 0 &&
        (input.totalMinor !== current.totalMinor || input.totalInstallments !== current.totalInstallments)
      ) {
        throw new DebtLockedError();
      }
      if (recorded.some((row) => !allowed.has(row.period))) throw new DebtRangeError();

      const { alreadyPaid: _ignored, ...values } = input;
      void _ignored;
      const [row] = await db
        .update(debts)
        .set({ ...values, updatedAt: new Date() })
        .where(and(eq(debts.id, id), eq(debts.userId, userId)))
        .returning();
      return row ?? null;
    },

    /** Paid expenses stay (debt_id becomes null), so past months and totals do not change. */
    async remove(userId: string, id: string): Promise<boolean> {
      const rows = await db
        .delete(debts)
        .where(and(eq(debts.id, id), eq(debts.userId, userId)))
        .returning();
      return rows.length > 0;
    },

    /** Returns false when the debt is not the user's. Idempotent. */
    async markPaid(userId: string, debtId: string, period: string, today: string): Promise<boolean> {
      const debt = await findOwn(userId, debtId);
      if (!debt) return false;
      if (!installmentPeriods(debt).includes(period)) throw new DebtPeriodOutOfRangeError();
      await payPeriods(userId, debt, [period], today);
      return true;
    },

    /** Marks as paid every installment from the start of the debt through `period`. */
    async markPaidUpTo(userId: string, debtId: string, period: string, today: string): Promise<boolean> {
      const debt = await findOwn(userId, debtId);
      if (!debt) return false;
      const periods = installmentPeriods(debt);
      const last = periods.indexOf(period);
      if (last === -1) throw new DebtPeriodOutOfRangeError();
      await payPeriods(userId, debt, periods.slice(0, last + 1), today);
      return true;
    },

    /** Removes the installment's expense. Returns false when there was nothing to remove. */
    async unmarkPaid(userId: string, debtId: string, period: string): Promise<boolean> {
      const rows = await db
        .delete(expenses)
        .where(and(eq(expenses.userId, userId), eq(expenses.debtId, debtId), eq(expenses.period, period)))
        .returning();
      return rows.length > 0;
    },
  };
}

export type DebtRepository = ReturnType<typeof createDebtRepository>;
