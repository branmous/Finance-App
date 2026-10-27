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
  CATEGORY_PAYMENT_INFO_MAX_LENGTH,
  CATEGORY_TYPES,
  isHttpUrl,
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
  BULK_IMPORT_COLUMNS,
  BULK_IMPORT_MAX_BYTES,
  BULK_IMPORT_MAX_ROWS,
  buildTemplateCsv,
  validateBulkImport,
} from "./expenses/bulk-import";
export type {
  BulkImportCategory,
  BulkImportColumn,
  BulkImportError,
  BulkImportResult,
  BulkImportRow,
} from "./expenses/bulk-import";
export {
  DEBT_MAX_INSTALLMENTS,
  DEBT_NAME_MAX_LENGTH,
  DEBT_NOTE_MAX_LENGTH,
  debtProgress,
  debtTotalMinor,
  deferredInstallmentMinor,
  installmentAmount,
  installmentPeriods,
  monthsBetween,
  validateDebtInput,
} from "./debts/debt";
export { pendingInstallmentsForPeriod } from "./debts/pending";
export type { PendingDebtSource, PendingInstallment } from "./debts/pending";
export type {
  DebtInput,
  DebtKind,
  DebtInputErrors,
  DebtProgress,
  DebtStatus,
  DebtValidationResult,
} from "./debts/debt";
export { INCOME_NOTE_MAX_LENGTH, INCOME_TYPES, validateIncomeInput } from "./incomes/income";
export type { IncomeInput, IncomeInputErrors, IncomeType, IncomeValidationResult } from "./incomes/income";
export { TIGHT_THRESHOLD_PERCENT, computeBalance } from "./budget/balance";
export type { Balance, BalanceStatus } from "./budget/balance";

export { validationError } from "./validation";
export type { ValidationError } from "./validation";

export * from "./travels/index";
