/** Browser-safe entry point for the home dashboard: import "@finance-app/core/dashboard". */
export { compareAmounts, savingsRate } from "./compare";
export type { Comparison } from "./compare";
export { TOP_CATEGORIES, commitment, mergeCategoryTotals, topWithRest } from "./categories";
export type { CategoryComparison, CategoryTotal, Commitment, RestGroup } from "./categories";
export { TREND_MONTHS, buildTrend, trendPeriods } from "./trend";
export type { PeriodTotal, TrendPoint } from "./trend";
export { debtsOverview } from "./debts";
export type { DashboardDebt, DebtsOverview } from "./debts";
export { perPersonMinor, tripYearSpan } from "./trips";
export {
  ALERT_CATEGORY_RISE_MIN_MINOR,
  ALERT_CATEGORY_RISE_PERCENT,
  ALERT_TIGHT_MARGIN_PERCENT,
  MAX_ALERTS,
  buildAlerts,
} from "./alerts";
export type { AlertCode, AlertInput, AlertSeverity, DashboardAlert } from "./alerts";
