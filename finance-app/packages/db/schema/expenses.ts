import { bigint, date, index, uuid, varchar, pgTable } from "drizzle-orm/pg-core";

import { categories } from "./categories";
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
    // Day it was actually paid ("YYYY-MM-DD").
    paidOn: date("paid_on", { mode: "string" }).notNull(),
    note: varchar("note", { length: 140 }).notNull().default(""),
  },
  (table) => ({
    userPeriodIdx: index("expenses_user_id_period_idx").on(table.userId, table.period),
    categoryIdx: index("expenses_category_id_idx").on(table.categoryId),
  }),
);
