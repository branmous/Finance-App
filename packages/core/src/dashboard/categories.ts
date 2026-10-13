import { compareAmounts } from "./compare";

export const TOP_CATEGORIES = 6;

export type CategoryTotal = {
  categoryId: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  totalMinor: number;
};

export type CategoryComparison = Omit<CategoryTotal, "totalMinor"> & {
  currentMinor: number;
  previousMinor: number;
  deltaMinor: number;
  deltaPercent: number | null;
  /** Spending this month in a category that spent nothing the month before. */
  isNew: boolean;
};

export type RestGroup = { count: number; currentMinor: number; previousMinor: number; deltaMinor: number };

export type Commitment = {
  fixedMinor: number;
  subscriptionMinor: number;
  totalMinor: number;
  /** Against income, one decimal; null when there is no income. */
  percentOfIncome: number | null;
};

/** Joins both months by category, biggest peso change first (then bigger spending, then name). */
export function mergeCategoryTotals(
  current: readonly CategoryTotal[],
  previous: readonly CategoryTotal[],
): CategoryComparison[] {
  const byId = new Map<string, { info: CategoryTotal; currentMinor: number; previousMinor: number }>();
  for (const row of previous) {
    byId.set(row.categoryId, { info: row, currentMinor: 0, previousMinor: row.totalMinor });
  }
  for (const row of current) {
    const existing = byId.get(row.categoryId);
    byId.set(row.categoryId, {
      // The current month's name, color and icon win over the older ones.
      info: row,
      currentMinor: row.totalMinor,
      previousMinor: existing?.previousMinor ?? 0,
    });
  }

  return [...byId.values()]
    .map(({ info, currentMinor, previousMinor }): CategoryComparison => {
      const { delta, deltaPercent } = compareAmounts(currentMinor, previousMinor);
      return {
        categoryId: info.categoryId,
        name: info.name,
        type: info.type,
        color: info.color,
        icon: info.icon,
        currentMinor,
        previousMinor,
        deltaMinor: delta,
        deltaPercent,
        isNew: previousMinor === 0 && currentMinor > 0,
      };
    })
    .sort(
      (a, b) =>
        Math.abs(b.deltaMinor) - Math.abs(a.deltaMinor) ||
        b.currentMinor - a.currentMinor ||
        a.name.localeCompare(b.name),
    );
}

export function topWithRest(
  rows: readonly CategoryComparison[],
  limit: number = TOP_CATEGORIES,
): { top: CategoryComparison[]; rest: RestGroup | null } {
  const top = rows.slice(0, limit);
  const others = rows.slice(limit);
  if (others.length === 0) return { top, rest: null };
  const currentMinor = others.reduce((sum, row) => sum + row.currentMinor, 0);
  const previousMinor = others.reduce((sum, row) => sum + row.previousMinor, 0);
  return { top, rest: { count: others.length, currentMinor, previousMinor, deltaMinor: currentMinor - previousMinor } };
}

/** Spending already tied up in fixed and subscription categories. Debts are shown apart (they overlap). */
export function commitment({
  categories,
  income,
}: {
  categories: readonly CategoryTotal[];
  income: number;
}): Commitment {
  const sumOf = (type: string) =>
    categories.filter((row) => row.type === type).reduce((sum, row) => sum + row.totalMinor, 0);
  const fixedMinor = sumOf("fixed");
  const subscriptionMinor = sumOf("subscription");
  const totalMinor = fixedMinor + subscriptionMinor;
  return {
    fixedMinor,
    subscriptionMinor,
    totalMinor,
    percentOfIncome: income > 0 ? Math.round((totalMinor / income) * 1000) / 10 : null,
  };
}
