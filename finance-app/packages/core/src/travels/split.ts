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

export type SettlementTransfer = { fromId: string; toId: string; amountMinor: number };

/**
 * Turns balances into the fewest transfers that leave everyone at zero (at most people − 1):
 * the person who owes the most pays the one who is owed the most, until nothing is left.
 * Ties keep the order of the people, so the same trip always gives the same list.
 */
export function computeSettlementPlan(
  balances: readonly { id: string; balanceMinor: number }[],
): SettlementTransfer[] {
  const debtors = balances.filter((person) => person.balanceMinor < 0).map((p) => ({ id: p.id, left: -p.balanceMinor }));
  const creditors = balances.filter((person) => person.balanceMinor > 0).map((p) => ({ id: p.id, left: p.balanceMinor }));
  const transfers: SettlementTransfer[] = [];

  while (debtors.length > 0 && creditors.length > 0) {
    // Array.prototype.sort is stable, so equal amounts keep the order of the people.
    debtors.sort((a, b) => b.left - a.left);
    creditors.sort((a, b) => b.left - a.left);
    const debtor = debtors[0]!;
    const creditor = creditors[0]!;
    const amountMinor = Math.min(debtor.left, creditor.left);

    transfers.push({ fromId: debtor.id, toId: creditor.id, amountMinor });
    debtor.left -= amountMinor;
    creditor.left -= amountMinor;
    if (debtor.left === 0) debtors.shift();
    if (creditor.left === 0) creditors.shift();
  }

  return transfers;
}

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
