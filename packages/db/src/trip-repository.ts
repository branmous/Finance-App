import {
  computeTripSummary,
  isTripSettled,
  type SummaryExpense,
  type TripExpenseInput,
  type TripInput,
  type TripSettlementInput,
} from "@finance-app/core";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import {
  tripExpenseShares,
  tripExpenses,
  tripParticipants,
  tripSettlements,
  trips,
} from "../schema/travels";
import type { DbClient } from "./user-repository";

export type TripRow = typeof trips.$inferSelect;
export type TripParticipantRow = typeof tripParticipants.$inferSelect;
export type TripExpenseRow = typeof tripExpenses.$inferSelect & { shareIds: string[] };
export type TripSettlementRow = typeof tripSettlements.$inferSelect;

export type TripAccounts = {
  participants: TripParticipantRow[];
  expenses: TripExpenseRow[];
  settlements: TripSettlementRow[];
};

export type TripListItem = TripRow & {
  participantCount: number;
  totalMinor: number;
  /** Has expenses, none pending and nobody owes anyone. */
  settled: boolean;
};

export type TripDetail = TripAccounts & { trip: TripRow };

/** A person id that does not belong to this trip (or does not exist). */
export class TripParticipantNotFoundError extends Error {
  readonly code = "personNotInTrip";
  constructor() {
    super("That person is not part of this trip");
    this.name = "TripParticipantNotFoundError";
  }
}

/** The person paid an expense or took part in a payment, so removing them would break the accounts. */
export class TripParticipantInUseError extends Error {
  readonly code = "personInUse";
  constructor() {
    super("This person paid an expense or took part in a payment, so they cannot be removed");
    this.name = "TripParticipantInUseError";
  }
}

/** A trip needs at least one person; an individual trip cannot grow. */
export class TripParticipantRuleError extends Error {
  /** Validation code the UI translates (e.g. "groupNeedsTwo"); `message` stays English for logs. */
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "TripParticipantRuleError";
  }
}

/** Every method takes the owner's userId and scopes its query by it. */
export function createTripRepository(db: DbClient) {
  async function findTrip(userId: string, tripId: string): Promise<TripRow | null> {
    const [row] = await db
      .select()
      .from(trips)
      .where(and(eq(trips.id, tripId), eq(trips.userId, userId)));
    return row ?? null;
  }

  /** Throws unless every id is a participant of the trip. */
  async function assertParticipants(userId: string, tripId: string, ids: readonly string[]): Promise<void> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return;
    const rows = await db
      .select({ id: tripParticipants.id })
      .from(tripParticipants)
      .where(
        and(
          eq(tripParticipants.userId, userId),
          eq(tripParticipants.tripId, tripId),
          inArray(tripParticipants.id, unique),
        ),
      );
    if (rows.length !== unique.length) throw new TripParticipantNotFoundError();
  }

  async function replaceShares(userId: string, expenseId: string, shareIds: readonly string[]): Promise<void> {
    await db.delete(tripExpenseShares).where(and(eq(tripExpenseShares.expenseId, expenseId), eq(tripExpenseShares.userId, userId)));
    if (shareIds.length > 0) {
      await db
        .insert(tripExpenseShares)
        .values(shareIds.map((participantId) => ({ userId, expenseId, participantId })));
    }
  }

  async function findExpense(userId: string, expenseId: string) {
    const [row] = await db
      .select()
      .from(tripExpenses)
      .where(and(eq(tripExpenses.id, expenseId), eq(tripExpenses.userId, userId)));
    return row ?? null;
  }

  /** People, expenses (with who splits each) and payments of the given trips, grouped by trip. */
  async function loadAccounts(userId: string, tripIds: readonly string[]): Promise<Map<string, TripAccounts>> {
    const accounts = new Map<string, TripAccounts>(
      tripIds.map((id) => [id, { participants: [], expenses: [], settlements: [] }]),
    );
    if (tripIds.length === 0) return accounts;
    const ids = [...tripIds];

    const participants = await db
      .select()
      .from(tripParticipants)
      .where(and(eq(tripParticipants.userId, userId), inArray(tripParticipants.tripId, ids)))
      .orderBy(asc(tripParticipants.position), asc(tripParticipants.createdAt));
    const expenseRows = await db
      .select()
      .from(tripExpenses)
      .where(and(eq(tripExpenses.userId, userId), inArray(tripExpenses.tripId, ids)))
      .orderBy(asc(tripExpenses.createdAt));
    const settlements = await db
      .select()
      .from(tripSettlements)
      .where(and(eq(tripSettlements.userId, userId), inArray(tripSettlements.tripId, ids)))
      .orderBy(asc(tripSettlements.createdAt));
    const shareRows =
      expenseRows.length === 0
        ? []
        : await db
            .select()
            .from(tripExpenseShares)
            .where(
              and(
                eq(tripExpenseShares.userId, userId),
                inArray(
                  tripExpenseShares.expenseId,
                  expenseRows.map((row) => row.id),
                ),
              ),
            );

    const sharesByExpense = new Map<string, string[]>();
    for (const share of shareRows) {
      const list = sharesByExpense.get(share.expenseId) ?? [];
      list.push(share.participantId);
      sharesByExpense.set(share.expenseId, list);
    }

    // Keep the order of the people so a split's leftover pesos always land on the same ones.
    const order = new Map(participants.map((person, index) => [person.id, index]));
    for (const person of participants) accounts.get(person.tripId)?.participants.push(person);
    for (const row of expenseRows) {
      const shareIds = (sharesByExpense.get(row.id) ?? []).sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
      accounts.get(row.tripId)?.expenses.push({ ...row, shareIds });
    }
    for (const settlement of settlements) accounts.get(settlement.tripId)?.settlements.push(settlement);
    return accounts;
  }

  return {
    async list(userId: string): Promise<TripListItem[]> {
      const rows = await db
        .select()
        .from(trips)
        .where(eq(trips.userId, userId))
        .orderBy(desc(trips.startDate), desc(trips.createdAt));
      const accounts = await loadAccounts(
        userId,
        rows.map((row) => row.id),
      );

      return rows.map((row) => {
        const { participants, expenses, settlements } = accounts.get(row.id)!;
        // category and status are plain varchar columns; they were validated against the closed lists on write.
        const summary = computeTripSummary(participants, expenses as SummaryExpense[], settlements);
        return {
          ...row,
          participantCount: participants.length,
          totalMinor: summary.totalMinor,
          settled: isTripSettled(summary, expenses.length),
        };
      });
    },

    async get(userId: string, tripId: string): Promise<TripDetail | null> {
      const trip = await findTrip(userId, tripId);
      if (!trip) return null;
      const accounts = (await loadAccounts(userId, [tripId])).get(tripId)!;
      return { trip, ...accounts };
    },

    async create(userId: string, input: TripInput): Promise<TripRow> {
      const [trip] = await db
        .insert(trips)
        .values({
          userId,
          name: input.name,
          kind: input.kind,
          startDate: input.startDate,
          endDate: input.endDate,
        })
        .returning();
      if (!trip) throw new Error("Insert into trips returned no row");

      try {
        await db
          .insert(tripParticipants)
          .values(input.participants.map((name, position) => ({ userId, tripId: trip.id, name, position })));
      } catch (error) {
        // No transaction across both drivers: undo the trip so a failure leaves nothing behind.
        await db.delete(trips).where(eq(trips.id, trip.id));
        throw error;
      }
      return trip;
    },

    async update(
      userId: string,
      tripId: string,
      input: Pick<TripInput, "name" | "startDate" | "endDate">,
    ): Promise<TripRow | null> {
      const [row] = await db
        .update(trips)
        .set({ name: input.name, startDate: input.startDate, endDate: input.endDate, updatedAt: new Date() })
        .where(and(eq(trips.id, tripId), eq(trips.userId, userId)))
        .returning();
      return row ?? null;
    },

    async remove(userId: string, tripId: string): Promise<boolean> {
      // Expenses and settlements reference people with RESTRICT, so clear them before the cascade from the trip.
      const trip = await findTrip(userId, tripId);
      if (!trip) return false;
      await db.delete(tripSettlements).where(and(eq(tripSettlements.tripId, tripId), eq(tripSettlements.userId, userId)));
      await db.delete(tripExpenses).where(and(eq(tripExpenses.tripId, tripId), eq(tripExpenses.userId, userId)));
      const rows = await db
        .delete(trips)
        .where(and(eq(trips.id, tripId), eq(trips.userId, userId)))
        .returning();
      return rows.length > 0;
    },

    // ------------------------------------------------------------ people

    async addParticipant(userId: string, tripId: string, name: string): Promise<TripParticipantRow | null> {
      const trip = await findTrip(userId, tripId);
      if (!trip) return null;
      if (trip.kind === "individual") {
        throw new TripParticipantRuleError("individualOnlyYou", "An individual trip has only you.");
      }
      const existing = await db
        .select({ name: tripParticipants.name })
        .from(tripParticipants)
        .where(and(eq(tripParticipants.tripId, tripId), eq(tripParticipants.userId, userId)));
      if (existing.some((row) => row.name.toLowerCase() === name.toLowerCase())) {
        throw new TripParticipantRuleError("duplicatePeople", "Each person needs a different name.");
      }
      const [row] = await db
        .insert(tripParticipants)
        .values({ userId, tripId, name, position: existing.length })
        .returning();
      if (!row) throw new Error("Insert into trip_participants returned no row");
      return row;
    },

    async removeParticipant(userId: string, tripId: string, participantId: string): Promise<boolean> {
      const trip = await findTrip(userId, tripId);
      if (!trip) return false;

      const people = await db
        .select({ id: tripParticipants.id })
        .from(tripParticipants)
        .where(and(eq(tripParticipants.tripId, tripId), eq(tripParticipants.userId, userId)));
      if (!people.some((person) => person.id === participantId)) return false;
      if (trip.kind === "group" && people.length <= 2) {
        throw new TripParticipantRuleError("groupNeedsTwo", "A group trip needs at least two people.");
      }
      if (trip.kind === "individual") {
        throw new TripParticipantRuleError("individualOnlyYou", "An individual trip has only you.");
      }

      const [paid] = await db
        .select({ id: tripExpenses.id })
        .from(tripExpenses)
        .where(and(eq(tripExpenses.paidById, participantId), eq(tripExpenses.userId, userId)))
        .limit(1);
      const [settled] = await db
        .select({ id: tripSettlements.id })
        .from(tripSettlements)
        .where(
          and(
            eq(tripSettlements.userId, userId),
            sql`(${tripSettlements.fromId} = ${participantId} or ${tripSettlements.toId} = ${participantId})`,
          ),
        )
        .limit(1);
      if (paid || settled) throw new TripParticipantInUseError();

      // Their shares go with them (cascade): the affected expenses are re-split among the rest.
      const rows = await db
        .delete(tripParticipants)
        .where(and(eq(tripParticipants.id, participantId), eq(tripParticipants.userId, userId)))
        .returning();
      return rows.length > 0;
    },

    // ------------------------------------------------------------ expenses

    async createExpense(userId: string, tripId: string, input: TripExpenseInput): Promise<TripExpenseRow | null> {
      const trip = await findTrip(userId, tripId);
      if (!trip) return null;
      await assertParticipants(userId, tripId, [...input.shareIds, ...(input.paidById ? [input.paidById] : [])]);

      const [row] = await db
        .insert(tripExpenses)
        .values({
          userId,
          tripId,
          description: input.description,
          category: input.category,
          amountMinor: input.amountMinor,
          spentOn: input.spentOn,
          status: input.status,
          paidById: input.paidById,
        })
        .returning();
      if (!row) throw new Error("Insert into trip_expenses returned no row");

      try {
        await replaceShares(userId, row.id, input.shareIds);
      } catch (error) {
        await db.delete(tripExpenses).where(eq(tripExpenses.id, row.id));
        throw error;
      }
      return { ...row, shareIds: [...input.shareIds] };
    },

    async updateExpense(userId: string, expenseId: string, input: TripExpenseInput): Promise<TripExpenseRow | null> {
      const current = await findExpense(userId, expenseId);
      if (!current) return null;
      await assertParticipants(userId, current.tripId, [...input.shareIds, ...(input.paidById ? [input.paidById] : [])]);

      const [row] = await db
        .update(tripExpenses)
        .set({
          description: input.description,
          category: input.category,
          amountMinor: input.amountMinor,
          spentOn: input.spentOn,
          status: input.status,
          paidById: input.paidById,
          updatedAt: new Date(),
        })
        .where(and(eq(tripExpenses.id, expenseId), eq(tripExpenses.userId, userId)))
        .returning();
      if (!row) return null;
      await replaceShares(userId, expenseId, input.shareIds);
      return { ...row, shareIds: [...input.shareIds] };
    },

    /** Quick toggles from the detail screen: who is in an expense, and whether it is paid. */
    async setExpenseShares(userId: string, expenseId: string, shareIds: readonly string[]): Promise<boolean> {
      const current = await findExpense(userId, expenseId);
      if (!current) return false;
      await assertParticipants(userId, current.tripId, shareIds);
      await replaceShares(userId, expenseId, shareIds);
      await db.update(tripExpenses).set({ updatedAt: new Date() }).where(eq(tripExpenses.id, expenseId));
      return true;
    },

    async setExpensePayment(
      userId: string,
      expenseId: string,
      payment: { status: "pending" | "paid"; paidById: string | null },
    ): Promise<boolean> {
      const current = await findExpense(userId, expenseId);
      if (!current) return false;
      if (payment.paidById) await assertParticipants(userId, current.tripId, [payment.paidById]);
      const rows = await db
        .update(tripExpenses)
        .set({
          status: payment.status,
          paidById: payment.status === "paid" ? payment.paidById : null,
          updatedAt: new Date(),
        })
        .where(and(eq(tripExpenses.id, expenseId), eq(tripExpenses.userId, userId)))
        .returning();
      return rows.length > 0;
    },

    async removeExpense(userId: string, expenseId: string): Promise<boolean> {
      const rows = await db
        .delete(tripExpenses)
        .where(and(eq(tripExpenses.id, expenseId), eq(tripExpenses.userId, userId)))
        .returning();
      return rows.length > 0;
    },

    // ------------------------------------------------------------ settlements

    async createSettlement(
      userId: string,
      tripId: string,
      input: TripSettlementInput,
    ): Promise<TripSettlementRow | null> {
      const trip = await findTrip(userId, tripId);
      if (!trip) return null;
      await assertParticipants(userId, tripId, [input.fromId, input.toId]);
      const [row] = await db
        .insert(tripSettlements)
        .values({
          userId,
          tripId,
          fromId: input.fromId,
          toId: input.toId,
          amountMinor: input.amountMinor,
          paidOn: input.paidOn,
        })
        .returning();
      if (!row) throw new Error("Insert into trip_settlements returned no row");
      return row;
    },

    async removeSettlement(userId: string, settlementId: string): Promise<boolean> {
      const rows = await db
        .delete(tripSettlements)
        .where(and(eq(tripSettlements.id, settlementId), eq(tripSettlements.userId, userId)))
        .returning();
      return rows.length > 0;
    },
  };
}

export type TripRepository = ReturnType<typeof createTripRepository>;
