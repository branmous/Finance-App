import type { ExpenseInput } from "@finance-app/core";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { categories } from "../schema/categories";
import { expenses } from "../schema/expenses";
import type { DbClient } from "./user-repository";

export type ExpenseRow = typeof expenses.$inferSelect;

export type ExpenseWithCategory = {
  id: string;
  categoryId: string;
  amountMinor: number;
  currency: string;
  period: string;
  /** null while the expense is tracked but not paid yet. */
  paidOn: string | null;
  note: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
};

export type PeriodSummary = { total: number; paid: number; pending: number };

/** The category does not exist or belongs to another user. */
export class ExpenseCategoryNotFoundError extends Error {
  constructor() {
    super("Category not found");
    this.name = "ExpenseCategoryNotFoundError";
  }
}

/**
 * Every method takes the owner's userId and scopes its query by it, so a user can
 * never read or change another user's expenses. A foreign key alone would let an
 * expense point at someone else's category, so create/update check ownership too.
 */
export function createExpenseRepository(db: DbClient) {
  async function assertOwnCategory(userId: string, categoryId: string): Promise<void> {
    const [row] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));
    if (!row) throw new ExpenseCategoryNotFoundError();
  }

  return {
    async listByPeriod(userId: string, period: string): Promise<ExpenseWithCategory[]> {
      return db
        .select({
          id: expenses.id,
          categoryId: expenses.categoryId,
          amountMinor: expenses.amountMinor,
          currency: expenses.currency,
          period: expenses.period,
          paidOn: expenses.paidOn,
          note: expenses.note,
          categoryName: categories.name,
          categoryColor: categories.color,
          categoryIcon: categories.icon,
        })
        .from(expenses)
        .innerJoin(categories, eq(expenses.categoryId, categories.id))
        .where(and(eq(expenses.userId, userId), eq(expenses.period, period)))
        // Pending (no paid date) first so they stay in sight, then the most recently paid.
        .orderBy(sql`${expenses.paidOn} is null desc`, desc(expenses.paidOn), desc(expenses.createdAt));
    },

    async summaryByPeriod(userId: string, period: string): Promise<PeriodSummary> {
      const [row] = await db
        .select({
          total: sql<string>`coalesce(sum(${expenses.amountMinor}), 0)`,
          paid: sql<string>`coalesce(sum(${expenses.amountMinor}) filter (where ${expenses.paidOn} is not null), 0)`,
          pending: sql<string>`coalesce(sum(${expenses.amountMinor}) filter (where ${expenses.paidOn} is null), 0)`,
        })
        .from(expenses)
        .where(and(eq(expenses.userId, userId), eq(expenses.period, period)));
      return { total: Number(row?.total ?? 0), paid: Number(row?.paid ?? 0), pending: Number(row?.pending ?? 0) };
    },

    async totalByPeriod(userId: string, period: string): Promise<number> {
      const [row] = await db
        .select({ total: sql<string>`coalesce(sum(${expenses.amountMinor}), 0)` })
        .from(expenses)
        .where(and(eq(expenses.userId, userId), eq(expenses.period, period)));
      return Number(row?.total ?? 0);
    },

    async create(userId: string, input: ExpenseInput): Promise<ExpenseRow> {
      await assertOwnCategory(userId, input.categoryId);
      const [row] = await db
        .insert(expenses)
        .values({ ...input, userId })
        .returning();
      if (!row) {
        throw new Error("Insert into expenses returned no row");
      }
      return row;
    },

    async update(userId: string, id: string, input: ExpenseInput): Promise<ExpenseRow | null> {
      await assertOwnCategory(userId, input.categoryId);
      const [row] = await db
        .update(expenses)
        .set({ ...input, updatedAt: new Date() })
        .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
        .returning();
      return row ?? null;
    },

    /**
     * Copies the given expenses (only the ones the user owns) into `period` as pending: same
     * category, amount and note, no paid date. One INSERT ... SELECT, so it is all or nothing.
     * Returns how many were copied.
     */
    async copyToPeriod(userId: string, ids: string[], period: string): Promise<number> {
      if (ids.length === 0) return 0;
      const sources = await db
        .select()
        .from(expenses)
        .where(and(eq(expenses.userId, userId), inArray(expenses.id, ids)));
      if (sources.length === 0) return 0;
      const rows = await db
        .insert(expenses)
        .values(
          sources.map((source) => ({
            userId,
            categoryId: source.categoryId,
            amountMinor: source.amountMinor,
            currency: source.currency,
            period,
            paidOn: null,
            note: source.note,
          })),
        )
        .returning();
      return rows.length;
    },

    async remove(userId: string, id: string): Promise<boolean> {
      const rows = await db
        .delete(expenses)
        .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
        .returning();
      return rows.length > 0;
    },
  };
}

export type ExpenseRepository = ReturnType<typeof createExpenseRepository>;
