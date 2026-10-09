import { bigint, index, integer, uuid, varchar, pgTable } from "drizzle-orm/pg-core";

import { categories } from "./categories";
import { sharedColumns } from "./shared-columns";
import { users } from "./users";

// The template of a recurring installment debt. Each paid installment is an occurrence: an
// expense row with debt_id + period (constitution, principle V).
export const debts = pgTable(
  "debts",
  {
    ...sharedColumns,
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 60 }).notNull(),
    // RESTRICT: a category with debts cannot be deleted.
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    // Whole pesos per month; never float/decimal (constitution, principle III).
    installmentMinor: bigint("installment_minor", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("COP"),
    // First month an installment is due ("YYYY-MM"); the last one is derived from the count.
    startPeriod: varchar("start_period", { length: 7 }).notNull(),
    totalInstallments: integer("total_installments").notNull(),
    note: varchar("note", { length: 140 }).notNull().default(""),
  },
  (table) => ({
    userIdx: index("debts_user_id_idx").on(table.userId),
    categoryIdx: index("debts_category_id_idx").on(table.categoryId),
  }),
);
