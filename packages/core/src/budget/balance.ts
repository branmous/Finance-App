export type BalanceStatus = "no_income" | "ok" | "tight" | "over";

export type Balance = {
  income: number;
  spent: number;
  /** Income minus everything spent or still pending; negative when over budget. */
  left: number;
  /** Income minus what is already paid, ignoring pending expenses. */
  leftNow: number;
  /** Share of the income already counted as spent, rounded; 0 when there is no income. */
  usedPercent: number;
  status: BalanceStatus;
};

/** Spending above this share of the income is flagged as tight. */
export const TIGHT_THRESHOLD_PERCENT = 80;

/** All amounts are whole pesos. `spent` is paid + pending; `paid` is only what was already paid. */
export function computeBalance({ income, spent, paid }: { income: number; spent: number; paid: number }): Balance {
  const left = income - spent;
  const leftNow = income - paid;
  if (income <= 0) {
    return { income, spent, left, leftNow, usedPercent: 0, status: "no_income" };
  }
  const usedPercent = Math.round((spent / income) * 100);
  const status: BalanceStatus = spent > income ? "over" : usedPercent > TIGHT_THRESHOLD_PERCENT ? "tight" : "ok";
  return { income, spent, left, leftNow, usedPercent, status };
}