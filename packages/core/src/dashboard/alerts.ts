import type { CategoryComparison } from "./categories";
import { savingsRate } from "./compare";

export const ALERT_CATEGORY_RISE_PERCENT = 20;
export const ALERT_CATEGORY_RISE_MIN_MINOR = 50_000;
export const ALERT_TIGHT_MARGIN_PERCENT = 20;
export const MAX_ALERTS = 4;

export type AlertCode =
  | "deficit"
  | "overdueInstallments"
  | "tightMargin"
  | "categoryRise"
  | "pendingPayments"
  | "unsettledTrips"
  | "subscriptions";

export type AlertSeverity = "high" | "medium" | "low";

/** Text is resolved by the UI from `code` and `params`, so the rules stay language-free. */
export type DashboardAlert = { code: AlertCode; severity: AlertSeverity; params: Record<string, string | number> };

export type AlertInput = {
  income: number;
  spent: number;
  pendingCount: number;
  pendingMinor: number;
  categories: readonly CategoryComparison[];
  subscriptionMinor: number;
  overdueInstallments: number;
  unsettledTrips: number;
};

const SEVERITY_RANK: Record<AlertSeverity, number> = { high: 0, medium: 1, low: 2 };

/** The category that rose the most in pesos, if it crosses both the percentage and the peso threshold. */
function biggestRise(categories: readonly CategoryComparison[]): CategoryComparison | null {
  let best: CategoryComparison | null = null;
  for (const row of categories) {
    // Integer math on the raw amounts: the rounded percentage must not decide a threshold.
    const crossesPercent = row.previousMinor > 0 && row.deltaMinor * 100 >= row.previousMinor * ALERT_CATEGORY_RISE_PERCENT;
    if (!crossesPercent || row.deltaMinor < ALERT_CATEGORY_RISE_MIN_MINOR) continue;
    if (!best || row.deltaMinor > best.deltaMinor) best = row;
  }
  return best;
}

/** At most MAX_ALERTS alerts, most severe first; equal severities keep the rule order below. */
export function buildAlerts(input: AlertInput): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];
  const rate = savingsRate(input.income, input.spent);
  const inDeficit = input.income > 0 && input.spent > input.income;

  if (inDeficit) {
    alerts.push({ code: "deficit", severity: "high", params: { amount: input.spent - input.income } });
  }
  if (input.overdueInstallments > 0) {
    alerts.push({ code: "overdueInstallments", severity: "high", params: { count: input.overdueInstallments } });
  }
  if (!inDeficit && rate !== null && rate < ALERT_TIGHT_MARGIN_PERCENT) {
    alerts.push({ code: "tightMargin", severity: "medium", params: { percent: rate } });
  }
  const rise = biggestRise(input.categories);
  if (rise) {
    alerts.push({
      code: "categoryRise",
      severity: "medium",
      params: { category: rise.name, percent: rise.deltaPercent ?? 0, amount: rise.deltaMinor },
    });
  }
  if (input.pendingCount > 0) {
    alerts.push({
      code: "pendingPayments",
      severity: "medium",
      params: { count: input.pendingCount, amount: input.pendingMinor },
    });
  }
  if (input.unsettledTrips > 0) {
    alerts.push({ code: "unsettledTrips", severity: "low", params: { count: input.unsettledTrips } });
  }
  if (input.subscriptionMinor > 0) {
    alerts.push({
      code: "subscriptions",
      severity: "low",
      params:
        input.income > 0
          ? { amount: input.subscriptionMinor, percent: Math.round((input.subscriptionMinor / input.income) * 1000) / 10 }
          : { amount: input.subscriptionMinor },
    });
  }

  // Array#sort is stable, so ties keep the push order above.
  return alerts.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]).slice(0, MAX_ALERTS);
}
