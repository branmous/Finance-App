import { bigint, index, uuid, varchar, pgTable } from "drizzle-orm/pg-core";

import { sharedColumns } from "./shared-columns";
import { users } from "./users";

export const incomes = pgTable(
  "incomes",
  {
    ...sharedColumns,
    // Same column as the shared one, plus the foreign key to the owner.
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // payroll | freelance | rent | other — closed list validated in core, kept as varchar like categories.
    type: varchar("type", { length: 20 }).notNull(),
    // Whole pesos; never float/decimal (constitution, principle III).
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("COP"),
    // Month the income belongs to ("YYYY-MM").
    period: varchar("period", { length: 7 }).notNull(),
    note: varchar("note", { length: 140 }).notNull().default(""),
  },
  (table) => ({
    userPeriodIdx: index("incomes_user_id_period_idx").on(table.userId, table.period),
  }),
);
