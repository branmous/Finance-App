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
export { EXPENSE_NOTE_MAX_LENGTH, isUuid, validateExpenseInput } from "./expenses/expense";
export type { ExpenseInput, ExpenseInputErrors, ExpenseValidationResult } from "./expenses/expense";
export { currentPeriod, formatCop, formatPeriod, isValidPeriod, shiftPeriod } from "./expenses/period";
export {
  DEBT_MAX_INSTALLMENTS,
  DEBT_NAME_MAX_LENGTH,
  DEBT_NOTE_MAX_LENGTH,
  debtProgress,
  installmentPeriods,
  monthsBetween,
  validateDebtInput,
} from "./debts/debt";
export type {
  DebtInput,
  DebtInputErrors,
  DebtProgress,
  DebtStatus,
  DebtValidationResult,
} from "./debts/debt";
export { INCOME_NOTE_MAX_LENGTH, INCOME_TYPES, validateIncomeInput } from "./incomes/income";
export type { IncomeInput, IncomeInputErrors, IncomeType, IncomeValidationResult } from "./incomes/income";
export { TIGHT_THRESHOLD_PERCENT, computeBalance } from "./budget/balance";
export type { Balance, BalanceStatus } from "./budget/balance";

export * from "./travels/index";
