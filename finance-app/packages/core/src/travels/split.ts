import type { TripExpenseCategory, TripExpenseStatus } from "./trip";

/**
 * Splits an amount of whole pesos equally. The leftover pesos go one by one to the first people,
 * so the shares always add up to the exact amount.
 */
export function splitAmount(amountMinor: number, personIds: readonly string[]): Record<string, number> {
  const shares: Record<string, number> = {};
  if (personIds.length === 0) return shares;
  const base = Math.floor(amountMinor / personIds.length);
  const remainder = amountMinor - base * personIds.length;
  personIds.forEach((id, index) => {
    shares[id] = base + (index < remainder ? 1 : 0);
  });
  return shares;
}

export type SummaryPerson = { id: string; name: string };

export type SummaryExpense = {
  amountMinor: number;
  category: TripExpenseCategory;
  status: TripExpenseStatus;
  paidById: string | null;
  shareIds: readonly string[];
};

export type SummarySettlement = { fromId: string; toId: string; amountMinor: number };

export type PersonBalance = {
  id: string;
  name: string;
  /** What this person put in: paid expenses plus payments sent to others. */
  paidMinor: number;
  /** What this person owes for their part of the paid expenses. */
  owedMinor: number;
  /** paid − owed, adjusted by settlements. Positive: others owe them. Negative: they owe. */
  balanceMinor: number;
  /** Their part of expenses not paid yet; it does not move the balance until someone pays. */
  pendingShareMinor: number;
};

export type TripSummary = {
  totalMinor: number;
  paidMinor: number;
  pendingMinor: number;
  byCategory: Partial<Record<TripExpenseCategory, number>>;
  people: PersonBalance[];
};

export function computeTripSummary(
  people: readonly SummaryPerson[],
  expenses: readonly SummaryExpense[],
  settlements: readonly SummarySettlement[],
): TripSummary {
  const rows = new Map<string, PersonBalance>(
    people.map((person) => [
      person.id,
      { id: person.id, name: person.name, paidMinor: 0, owedMinor: 0, balanceMinor: 0, pendingShareMinor: 0 },
    ]),
  );

  const summary: TripSummary = { totalMinor: 0, paidMinor: 0, pendingMinor: 0, byCategory: {}, people: [] };

  for (const expense of expenses) {
    summary.totalMinor += expense.amountMinor;
    summary.byCategory[expense.category] = (summary.byCategory[expense.category] ?? 0) + expense.amountMinor;
    const shares = splitAmount(expense.amountMinor, expense.shareIds);

    if (expense.status === "paid") {
      summary.paidMinor += expense.amountMinor;
      const payer = expense.paidById ? rows.get(expense.paidById) : undefined;
      if (payer) payer.paidMinor += expense.amountMinor;
      for (const [id, share] of Object.entries(shares)) {
        const row = rows.get(id);
        if (row) row.owedMinor += share;
      }
    } else {
      summary.pendingMinor += expense.amountMinor;
      for (const [id, share] of Object.entries(shares)) {
        const row = rows.get(id);
        if (row) row.pendingShareMinor += share;
      }
    }
  }

  for (const row of rows.values()) row.balanceMinor = row.paidMinor - row.owedMinor;
  for (const settlement of settlements) {
    const from = rows.get(settlement.fromId);
    const to = rows.get(settlement.toId);
    if (from) {
      from.paidMinor += settlement.amountMinor;
      from.balanceMinor += settlement.amountMinor;
    }
    if (to) to.balanceMinor -= settlement.amountMinor;
  }

  summary.people = people.map((person) => rows.get(person.id)!);
  return summary;
}
