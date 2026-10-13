import type { IncomeInput } from "@finance-app/core";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";

import { incomes } from "../schema/incomes";
import type { DbClient } from "./user-repository";

export type IncomeRow = typeof incomes.$inferSelect;

/** Every method takes the owner's userId and scopes its query by it. */
export function createIncomeRepository(db: DbClient) {
  return {
    async listByPeriod(userId: string, period: string): Promise<IncomeRow[]> {
      return db
        .select()
        .from(incomes)
        .where(and(eq(incomes.userId, userId), eq(incomes.period, period)))
        .orderBy(desc(incomes.createdAt));
    },

    async totalByPeriod(userId: string, period: string): Promise<number> {
      const [row] = await db
        .select({ total: sql<string>`coalesce(sum(${incomes.amountMinor}), 0)` })
        .from(incomes)
        .where(and(eq(incomes.userId, userId), eq(incomes.period, period)));
      return Number(row?.total ?? 0);
    },

    /** Income per month between `from` and `to` ("YYYY-MM", both included); months without income are left out. */
    async totalsByPeriodRange(
      userId: string,
      from: string,
      to: string,
    ): Promise<{ period: string; totalMinor: number }[]> {
      const rows = await db
        .select({ period: incomes.period, total: sql<string>`sum(${incomes.amountMinor})` })
        .from(incomes)
        .where(and(eq(incomes.userId, userId), gte(incomes.period, from), lte(incomes.period, to)))
        .groupBy(incomes.period)
        .orderBy(asc(incomes.period));
      return rows.map((row) => ({ period: row.period, totalMinor: Number(row.total) }));
    },

    async create(userId: string, input: IncomeInput): Promise<IncomeRow> {
      const [row] = await db
        .insert(incomes)
        .values({ ...input, userId })
        .returning();
      if (!row) {
        throw new Error("Insert into incomes returned no row");
      }
      return row;
    },

    async update(userId: string, id: string, input: IncomeInput): Promise<IncomeRow | null> {
      const [row] = await db
        .update(incomes)
        .set({ ...input, updatedAt: new Date() })
        .where(and(eq(incomes.id, id), eq(incomes.userId, userId)))
        .returning();
      return row ?? null;
    },

    async remove(userId: string, id: string): Promise<boolean> {
      const rows = await db
        .delete(incomes)
        .where(and(eq(incomes.id, id), eq(incomes.userId, userId)))
        .returning();
      return rows.length > 0;
    },
  };
}

export type IncomeRepository = ReturnType<typeof createIncomeRepository>;
