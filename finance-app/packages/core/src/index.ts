/**
 * Placeholder domain unit for the cimientos spec: proves packages/core builds,
 * lints, and tests in isolation (Constitution Principle II) before any real
 * business logic (categories, expenses, reports) lands in future specs.
 */
export function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}
