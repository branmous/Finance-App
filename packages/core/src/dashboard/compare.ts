export type Comparison = {
  current: number;
  previous: number;
  /** current − previous, in pesos. */
  delta: number;
  /** One decimal; null when there is no previous amount to compare against. */
  deltaPercent: number | null;
};

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function compareAmounts(current: number, previous: number): Comparison {
  return {
    current,
    previous,
    delta: current - previous,
    deltaPercent: previous === 0 ? null : roundOneDecimal(((current - previous) / previous) * 100),
  };
}

/** Share of income left after spending, one decimal; null when there is no income. */
export function savingsRate(income: number, spent: number): number | null {
  if (income <= 0) return null;
  return roundOneDecimal(((income - spent) / income) * 100);
}
