import { sql } from "drizzle-orm";
import { bigint, check, index, integer, uuid, varchar, pgTable } from "drizzle-orm/pg-core";

import { categories } from "./categories";
import { sharedColumns } from "./shared-columns";
import { users } from "./users";

// The template of a recurring installment debt. Each paid installment is an occurrence: an
// expense row with debt_id + period (constitution, principle V).
// kind "monthly": the user sets the installment. kind "deferred": the user sets total_minor and the
// number of months; installment_minor is then total / months rounded down and the last installment
// carries the remainder.
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
    kind: varchar("kind", { length: 10 }).notNull().default("monthly"),
    // Whole pesos split over the months; only a deferred debt has one.
    totalMinor: bigint("total_minor", { mode: "number" }),
  },
  (table) => ({
    userIdx: index("debts_user_id_idx").on(table.userId),
    categoryIdx: index("debts_category_id_idx").on(table.categoryId),
    kindCheck: check("debts_kind_check", sql`${table.kind} in ('monthly', 'deferred')`),
    totalMatchesKindCheck: check(
      "debts_total_matches_kind_check",
      sql`(${table.kind} = 'deferred') = (${table.totalMinor} is not null)`,
    ),
    totalCoversMonthsCheck: check(
      "debts_total_covers_months_check",
      sql`${table.totalMinor} is null or ${table.totalMinor} >= ${table.totalInstallments}`,
    ),
  }),
);
