/**
 * Browser-safe entry point for the expenses domain (no bcrypt): client components
 * import from "@finance-app/core/expenses" instead of the package root.
 */
export { EXPENSE_NOTE_MAX_LENGTH, isUuid, validateExpenseInput } from "./expense";
export type { ExpenseInput, ExpenseInputErrors, ExpenseValidationResult } from "./expense";
export { currentPeriod, formatCop, formatPeriod, isValidPeriod, shiftPeriod } from "./period";
