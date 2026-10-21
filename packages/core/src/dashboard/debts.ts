import { debtProgress, installmentAmount, installmentPeriods, type DebtKind } from "../debts/debt";

export type DashboardDebt = {
  kind?: DebtKind;
  startPeriod: string;
  totalInstallments: number;
  installmentMinor: number;
  totalMinor?: number | null;
  paidPeriods: readonly string[];
};

export type DebtsOverview = {
  /** Installments that charge in the period, across all debts. */
  monthlyMinor: number;
  remainingInstallments: number;
  /** Month the last unpaid installment falls in; null when nothing is owed. */
  endPeriod: string | null;
  overdueInstallments: number;
};

/** Debt picture for the home. Installments are already expenses, so these amounts are shown apart from commitments. */
export function debtsOverview(debts: readonly DashboardDebt[], period: string, nowPeriod: string): DebtsOverview {
  let monthlyMinor = 0;
  let remainingInstallments = 0;
  let overdueInstallments = 0;
  let endPeriod: string | null = null;

  for (const debt of debts) {
    if (installmentPeriods(debt).includes(period)) monthlyMinor += installmentAmount(debt, period);
    const progress = debtProgress(debt, debt.paidPeriods, nowPeriod);
    remainingInstallments += progress.remainingCount;
    overdueInstallments += progress.overduePeriods.length;
    if (progress.remainingCount > 0 && (endPeriod === null || progress.endPeriod > endPeriod)) {
      endPeriod = progress.endPeriod;
    }
  }
  return { monthlyMinor, remainingInstallments, endPeriod, overdueInstallments };
}
