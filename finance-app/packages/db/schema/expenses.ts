import { bigint, date, index, uniqueIndex, uuid, varchar, pgTable, type AnyPgColumn } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { categories } from "./categories";
import { debts } from "./debts";
import { sharedColumns } from "./shared-columns";
import { users } from "./users";

export const expenses = pgTable(
  "expenses",
  {
    ...sharedColumns,
    // Same column as the shared one, plus the foreign key to the owner.
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // RESTRICT: a category with expenses cannot be deleted, so history and totals stay intact.
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    // Whole pesos; never float/decimal (constitution, principle III).
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("COP"),
    // Month the expense belongs to ("YYYY-MM"), independent of when it was paid.
    period: varchar("period", { length: 7 }).notNull(),
    // Day it was actually paid ("YYYY-MM-DD"); null while the expense is tracked but still pending.
    paidOn: date("paid_on", { mode: "string" }),
    note: varchar("note", { length: 140 }).notNull().default(""),
    // The expense this one was paid with (e.g. Netflix on the credit card). Its amount is already
    // inside the parent's. SET NULL: deleting the parent leaves the child standing on its own.
    parentId: uuid("parent_id").references((): AnyPgColumn => expenses.id, { onDelete: "set null" }),
    // The debt this expense is an installment of. SET NULL: deleting a debt keeps what was paid.
    debtId: uuid("debt_id").references(() => debts.id, { onDelete: "set null" }),
  },
  (table) => ({
    userPeriodIdx: index("expenses_user_id_period_idx").on(table.userId, table.period),
    categoryIdx: index("expenses_category_id_idx").on(table.categoryId),
    parentIdx: index("expenses_parent_id_idx").on(table.parentId),
    // One installment per debt per month.
    debtPeriodIdx: uniqueIndex("expenses_debt_id_period_idx")
      .on(table.debtId, table.period)
      .where(sql`${table.debtId} is not null`),
  }),
);
