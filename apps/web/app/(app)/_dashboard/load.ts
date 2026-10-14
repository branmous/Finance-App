import { currentPeriod, isValidPeriod, shiftPeriod } from "@finance-app/core";
import { todayIso } from "@finance-app/core/travels";
import {
  buildAlerts,
  buildTrend,
  commitment,
  compareAmounts,
  debtsOverview,
  mergeCategoryTotals,
  perPersonMinor,
  savingsRate,
  topWithRest,
  trendPeriods,
  tripYearSpan,
  type AlertInput,
  type CategoryComparison,
  type Commitment,
  type Comparison,
  type DashboardAlert,
  type DebtsOverview,
  type RestGroup,
  type TrendPoint,
} from "@finance-app/core/dashboard";
import { createDebtRepository, createExpenseRepository, createIncomeRepository, createTripRepository } from "@finance-app/db";

import { getDb } from "@/lib/db";

export type DashboardTrip = {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  participantCount: number;
  totalMinor: number;
  perPersonMinor: number;
  settled: boolean;
  /** Position on the year line; null when the trip has no dates or falls outside the year. */
  span: { startPct: number; widthPct: number } | null;
};

export type DashboardData = {
  period: string;
  previousPeriod: string;
  /** Month right before the current one: the one that is expected to be loaded next. */
  captureMonth: string;
  captureMissing: boolean;
  /** The month compared against has any income or spending; without it the changes mean nothing. */
  previousHasData: boolean;
  income: Comparison;
  spent: Comparison;
  left: Comparison;
  savingsRate: number | null;
  previousSavingsRate: number | null;
  categories: { top: CategoryComparison[]; rest: RestGroup | null };
  commitment: Commitment;
  debts: DebtsOverview;
  hasDebts: boolean;
  trend: TrendPoint[];
  year: number;
  trips: DashboardTrip[];
  alerts: DashboardAlert[];
};

/** The month shown by default: the last one that is over, since expenses are recorded a month behind. */
export function defaultPeriod(now: string = currentPeriod()): string {
  return shiftPeriod(now, -1);
}

/** `?period=` if it is a real month no later than the current one; the default otherwise. */
export function resolvePeriod(requested: string | string[] | undefined): string {
  const value = Array.isArray(requested) ? requested[0] : requested;
  const now = currentPeriod();
  return isValidPeriod(value) && value <= now ? value : defaultPeriod(now);
}

/**
 * Everything the home shows, for one month against the one before it. Trip spending is read only through
 * the trips list for its own strip: it is never added to the monthly figures.
 */
export async function loadDashboard(userId: string, period: string): Promise<DashboardData> {
  const db = getDb();
  const expenses = createExpenseRepository(db);
  const incomes = createIncomeRepository(db);
  const nowPeriod = currentPeriod();
  const previousPeriod = shiftPeriod(period, -1);
  const captureMonth = defaultPeriod(nowPeriod);
  const trendMonths = trendPeriods(period);
  const firstTrendMonth = trendMonths[0] ?? period;

  const [
    spentSummary,
    previousSummary,
    incomeTotal,
    previousIncomeTotal,
    categoryTotals,
    previousCategoryTotals,
    spentByMonth,
    incomeByMonth,
    pendingCount,
    captureCount,
    debts,
    trips,
  ] = await Promise.all([
    expenses.summaryByPeriod(userId, period),
    expenses.summaryByPeriod(userId, previousPeriod),
    incomes.totalByPeriod(userId, period),
    incomes.totalByPeriod(userId, previousPeriod),
    expenses.categoryTotalsByPeriod(userId, period),
    expenses.categoryTotalsByPeriod(userId, previousPeriod),
    expenses.totalsByPeriodRange(userId, firstTrendMonth, period),
    incomes.totalsByPeriodRange(userId, firstTrendMonth, period),
    expenses.countPendingByPeriod(userId, period),
    expenses.countByPeriod(userId, captureMonth),
    createDebtRepository(db).list(userId),
    createTripRepository(db).list(userId),
  ]);

  const year = Number(period.slice(0, 4));
  const today = todayIso();
  const comparisons = mergeCategoryTotals(categoryTotals, previousCategoryTotals);
  const commit = commitment({ categories: categoryTotals, income: incomeTotal });
  const debtOverview = debtsOverview(debts, period, nowPeriod);

  const dashboardTrips: DashboardTrip[] = trips.map((trip) => ({
    id: trip.id,
    name: trip.name,
    startDate: trip.startDate,
    endDate: trip.endDate,
    participantCount: trip.participantCount,
    totalMinor: trip.totalMinor,
    perPersonMinor: perPersonMinor(trip.totalMinor, trip.participantCount),
    settled: trip.settled,
    span: tripYearSpan(trip.startDate, trip.endDate, year),
  }));
  // Finished trips with money moved that nobody has squared away yet.
  const unsettledTrips = trips.filter(
    (trip) => !trip.settled && trip.totalMinor > 0 && trip.endDate !== null && trip.endDate < today,
  ).length;

  const alertInput: AlertInput = {
    income: incomeTotal,
    spent: spentSummary.total,
    pendingCount,
    pendingMinor: spentSummary.pending,
    categories: comparisons,
    subscriptionMinor: commit.subscriptionMinor,
    overdueInstallments: debtOverview.overdueInstallments,
    unsettledTrips,
  };

  return {
    period,
    previousPeriod,
    captureMonth,
    captureMissing: captureCount === 0,
    previousHasData: previousIncomeTotal > 0 || previousSummary.total > 0,
    income: compareAmounts(incomeTotal, previousIncomeTotal),
    spent: compareAmounts(spentSummary.total, previousSummary.total),
    left: compareAmounts(incomeTotal - spentSummary.total, previousIncomeTotal - previousSummary.total),
    savingsRate: savingsRate(incomeTotal, spentSummary.total),
    previousSavingsRate: savingsRate(previousIncomeTotal, previousSummary.total),
    categories: topWithRest(comparisons),
    commitment: commit,
    debts: debtOverview,
    hasDebts: debts.length > 0,
    trend: buildTrend(trendMonths, spentByMonth, incomeByMonth),
    year,
    trips: dashboardTrips,
    alerts: buildAlerts(alertInput),
  };
}
