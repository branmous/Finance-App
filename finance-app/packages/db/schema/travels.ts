import { bigint, date, index, integer, pgTable, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

import { sharedColumns } from "./shared-columns";
import { users } from "./users";

const ownerColumn = () =>
  // Same column as the shared one, plus the foreign key to the owner.
  uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" });

export const trips = pgTable(
  "trips",
  {
    ...sharedColumns,
    userId: ownerColumn(),
    name: varchar("name", { length: 80 }).notNull(),
    // individual | group — closed list validated in core, kept as varchar like categories.
    kind: varchar("kind", { length: 10 }).notNull(),
    startDate: date("start_date", { mode: "string" }),
    endDate: date("end_date", { mode: "string" }),
  },
  (table) => ({
    userIdx: index("trips_user_id_idx").on(table.userId),
  }),
);

export const tripParticipants = pgTable(
  "trip_participants",
  {
    ...sharedColumns,
    userId: ownerColumn(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 40 }).notNull(),
    // Display order; the first participant is the owner of the app account.
    position: integer("position").notNull().default(0),
  },
  (table) => ({
    tripIdx: index("trip_participants_trip_id_idx").on(table.tripId),
  }),
);

export const tripExpenses = pgTable(
  "trip_expenses",
  {
    ...sharedColumns,
    userId: ownerColumn(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    description: varchar("description", { length: 80 }).notNull(),
    // flights | lodging | transport | food | activities | other — closed list validated in core.
    category: varchar("category", { length: 20 }).notNull(),
    // Whole pesos; never float/decimal (constitution, principle III).
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("COP"),
    spentOn: date("spent_on", { mode: "string" }),
    // pending | paid
    status: varchar("status", { length: 10 }).notNull().default("pending"),
    // RESTRICT: a person who paid something cannot be removed from the trip.
    paidById: uuid("paid_by_id").references(() => tripParticipants.id, { onDelete: "restrict" }),
  },
  (table) => ({
    tripIdx: index("trip_expenses_trip_id_idx").on(table.tripId),
  }),
);

/** Who splits an expense. Leaving someone out of an expense means no row for them. */
export const tripExpenseShares = pgTable(
  "trip_expense_shares",
  {
    ...sharedColumns,
    userId: ownerColumn(),
    expenseId: uuid("expense_id")
      .notNull()
      .references(() => tripExpenses.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => tripParticipants.id, { onDelete: "cascade" }),
  },
  (table) => ({
    expenseParticipantIdx: uniqueIndex("trip_expense_shares_expense_participant_idx").on(
      table.expenseId,
      table.participantId,
    ),
  }),
);

/** A transfer between two people of the trip to settle up. */
export const tripSettlements = pgTable(
  "trip_settlements",
  {
    ...sharedColumns,
    userId: ownerColumn(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    fromId: uuid("from_id")
      .notNull()
      .references(() => tripParticipants.id, { onDelete: "restrict" }),
    toId: uuid("to_id")
      .notNull()
      .references(() => tripParticipants.id, { onDelete: "restrict" }),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("COP"),
    paidOn: date("paid_on", { mode: "string" }),
  },
  (table) => ({
    tripIdx: index("trip_settlements_trip_id_idx").on(table.tripId),
  }),
);
