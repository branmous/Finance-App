/**
 * Browser-safe entry point for the incomes domain (no bcrypt): client components
 * import from "@finance-app/core/incomes" instead of the package root.
 */
export { INCOME_NOTE_MAX_LENGTH, INCOME_TYPES, validateIncomeInput } from "./income";
export type { IncomeInput, IncomeInputErrors, IncomeType, IncomeValidationResult } from "./income";
