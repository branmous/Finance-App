import { shiftPeriod } from "../expenses/period";

export const TREND_MONTHS = 6;

export type PeriodTotal = { period: string; totalMinor: number };
export type TrendPoint = { period: string; incomeMinor: number; spentMinor: number };

/** The `months` periods ending at `endPeriod`, oldest first. */
export function trendPeriods(endPeriod: string, months: number = TREND_MONTHS): string[] {
  return Array.from({ length: months }, (_, index) => shiftPeriod(endPeriod, index - (months - 1)));
}

/** One point per period; months without data count as zero. */
export function buildTrend(
  periods: readonly string[],
  spent: readonly PeriodTotal[],
  income: readonly PeriodTotal[],
): TrendPoint[] {
  const spentBy = new Map(spent.map((row) => [row.period, row.totalMinor]));
  const incomeBy = new Map(income.map((row) => [row.period, row.totalMinor]));
  return periods.map((period) => ({
    period,
    incomeMinor: incomeBy.get(period) ?? 0,
    spentMinor: spentBy.get(period) ?? 0,
  }));
}
