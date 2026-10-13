import { randomUUID } from "node:crypto";

import type { ExpenseInput } from "@finance-app/core";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";

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
  /** The expense this one was paid with, or null when it stands alone. */
  parentId: string | null;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
};

export type PeriodSummary = { total: number; paid: number; pending: number };

/** A validated row of a bulk load; the month is given once for the whole batch. */
export type BulkExpenseRow = Pick<ExpenseInput, "categoryId" | "amountMinor" | "paidOn" | "note">;

/** The category does not exist or belongs to another user. */
export class ExpenseCategoryNotFoundError extends Error {
  readonly code = "categoryNotFound";
  constructor() {
    super("Category not found");
    this.name = "ExpenseCategoryNotFoundError";
  }
}

/** The chosen "paid with" expense breaks a linking rule; `code` is the validation code the UI translates. */
export class InvalidExpenseParentError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "InvalidExpenseParentError";
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

  /**
   * Linking rules: the parent is the user's own, from the same month and not a child itself
   * (one level only); an expense cannot be its own parent; an expense with children cannot become
   * a child nor move to another month. A foreign key alone enforces none of this.
   */
  async function assertValidParent(userId: string, input: ExpenseInput, selfId?: string): Promise<void> {
    if (selfId) {
      const [current] = await db
        .select({ period: expenses.period })
        .from(expenses)
        .where(and(eq(expenses.id, selfId), eq(expenses.userId, userId)));
      const [child] = current
        ? await db
            .select({ id: expenses.id })
            .from(expenses)
            .where(and(eq(expenses.parentId, selfId), eq(expenses.userId, userId)))
            .limit(1)
        : [];
      if (current && child) {
        if (input.parentId) {
          throw new InvalidExpenseParentError(
            "hasLinkedExpenses",
            "This expense has linked expenses, so it cannot be paid with another.",
          );
        }
        if (current.period !== input.period) {
          throw new InvalidExpenseParentError(
            "makeLinkedIndependent",
            "Make its linked expenses independent before moving it to another month.",
          );
        }
      }
    }

    if (!input.parentId) return;
    if (input.parentId === selfId) {
      throw new InvalidExpenseParentError("paidWithItself", "An expense cannot be paid with itself.");
    }
    const [parent] = await db
      .select({ period: expenses.period, parentId: expenses.parentId })
      .from(expenses)
      .where(and(eq(expenses.id, input.parentId), eq(expenses.userId, userId)));
    if (!parent) throw new InvalidExpenseParentError("parentNotFound", "The expense to pay with no longer exists.");
    if (parent.parentId) {
      throw new InvalidExpenseParentError(
        "parentIsChild",
        "Choose an expense that is not itself paid with another.",
      );
    }
    if (parent.period !== input.period) {
      throw new InvalidExpenseParentError("parentOtherMonth", "Both expenses must belong to the same month.");
    }
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
          parentId: expenses.parentId,
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

    // Totals count only top-level expenses: a child is already inside its parent's amount.
    async summaryByPeriod(userId: string, period: string): Promise<PeriodSummary> {
      const [row] = await db
        .select({
          total: sql<string>`coalesce(sum(${expenses.amountMinor}), 0)`,
          paid: sql<string>`coalesce(sum(${expenses.amountMinor}) filter (where ${expenses.paidOn} is not null), 0)`,
          pending: sql<string>`coalesce(sum(${expenses.amountMinor}) filter (where ${expenses.paidOn} is null), 0)`,
        })
        .from(expenses)
        .where(and(eq(expenses.userId, userId), eq(expenses.period, period), isNull(expenses.parentId)));
      return { total: Number(row?.total ?? 0), paid: Number(row?.paid ?? 0), pending: Number(row?.pending ?? 0) };
    },

    async totalByPeriod(userId: string, period: string): Promise<number> {
      const [row] = await db
        .select({ total: sql<string>`coalesce(sum(${expenses.amountMinor}), 0)` })
        .from(expenses)
        .where(and(eq(expenses.userId, userId), eq(expenses.period, period), isNull(expenses.parentId)));
      return Number(row?.total ?? 0);
    },

    /** How many expenses (children included) the user has in a month. */
    async countByPeriod(userId: string, period: string): Promise<number> {
      const [row] = await db
        .select({ count: sql<string>`count(*)` })
        .from(expenses)
        .where(and(eq(expenses.userId, userId), eq(expenses.period, period)));
      return Number(row?.count ?? 0);
    },

    /**
     * Bulk load of already validated rows into `period`, all independent (no parent). Every category
     * must be the user's own. One INSERT, so it is all or nothing. Returns how many were created.
     */
    async createMany(userId: string, period: string, rows: BulkExpenseRow[]): Promise<number> {
      if (rows.length === 0) return 0;
      const categoryIds = [...new Set(rows.map((row) => row.categoryId))];
      const owned = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.userId, userId), inArray(categories.id, categoryIds)));
      if (owned.length !== categoryIds.length) throw new ExpenseCategoryNotFoundError();

      const created = await db
        .insert(expenses)
        .values(
          rows.map((row) => ({
            userId,
            categoryId: row.categoryId,
            amountMinor: row.amountMinor,
            period,
            paidOn: row.paidOn,
            note: row.note,
            parentId: null,
          })),
        )
        .returning();
      return created.length;
    },

    async create(userId: string, input: ExpenseInput): Promise<ExpenseRow> {
      await assertOwnCategory(userId, input.categoryId);
      await assertValidParent(userId, input);
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
      await assertValidParent(userId, input, id);
      const [row] = await db
        .update(expenses)
        .set({ ...input, updatedAt: new Date() })
        .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
        .returning();
      return row ?? null;
    },

    /** Makes a child independent again; it then counts on its own in the month total. */
    async unlink(userId: string, id: string): Promise<boolean> {
      const rows = await db
        .update(expenses)
        .set({ parentId: null, updatedAt: new Date() })
        .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
        .returning();
      return rows.length > 0;
    },

    /**
     * Copies the given expenses (only the ones the user owns) into `period` as pending: same
     * category, amount and note, no paid date. A child is linked to the copy of its parent only
     * when both are copied; otherwise it arrives independent. One INSERT, so it is all or nothing.
     * Returns how many were copied.
     */
    async copyToPeriod(userId: string, ids: string[], period: string): Promise<number> {
      if (ids.length === 0) return 0;
      const sources = await db
        .select()
        .from(expenses)
        .where(and(eq(expenses.userId, userId), inArray(expenses.id, ids)));
      if (sources.length === 0) return 0;
      const newIds = new Map(sources.map((source) => [source.id, randomUUID()]));
      const rows = await db
        .insert(expenses)
        .values(
          sources.map((source) => ({
            id: newIds.get(source.id)!,
            userId,
            categoryId: source.categoryId,
            amountMinor: source.amountMinor,
            currency: source.currency,
            period,
            paidOn: null,
            note: source.note,
            parentId: source.parentId ? (newIds.get(source.parentId) ?? null) : null,
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
