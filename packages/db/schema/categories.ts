import { sql } from "drizzle-orm";
import { pgTable, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

import { sharedColumns } from "./shared-columns";
import { users } from "./users";

export const categories = pgTable(
  "categories",
  {
    ...sharedColumns,
    // Same column as the shared one, plus the foreign key to the owner.
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 40 }).notNull(),
    type: varchar("type", { length: 32 }).notNull(),
    color: varchar("color", { length: 7 }).notNull(),
    icon: varchar("icon", { length: 32 }).notNull(),
    // Optional link or free text saying where to pay; empty string when not set.
    paymentInfo: varchar("payment_info", { length: 500 }).notNull().default(""),
  },
  (table) => ({
    userNameUnique: uniqueIndex("categories_user_id_lower_name_unique").on(
      table.userId,
      sql`lower(${table.name})`,
    ),
  }),
);
