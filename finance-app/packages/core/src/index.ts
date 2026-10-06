/**
 * Placeholder domain unit for the cimientos spec: proves packages/core builds,
 * lints, and tests in isolation (Constitution Principle II) before any real
 * business logic (categories, expenses, reports) lands in future specs.
 */
export function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

export { normalizeIdentifier } from "./auth/identifier";
export { LOCK_WINDOW_MS, MAX_ATTEMPTS, isLocked, nextFailureState } from "./auth/lockout";
export type { LockoutState } from "./auth/lockout";
export { hashPassword, verifyAgainstDummyHash, verifyPassword } from "./auth/password";
export {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_NAME_MAX_LENGTH,
  CATEGORY_TYPES,
  validateCategoryInput,
} from "./categories/category";
export type {
  CategoryColor,
  CategoryIcon,
  CategoryInput,
  CategoryInputErrors,
  CategoryType,
  CategoryValidationResult,
} from "./categories/category";
export { EXPENSE_NOTE_MAX_LENGTH, validateExpenseInput } from "./expenses/expense";
export type { ExpenseInput, ExpenseInputErrors, ExpenseValidationResult } from "./expenses/expense";
export { currentPeriod, formatCop, formatPeriod, isValidPeriod, shiftPeriod } from "./expenses/period";
