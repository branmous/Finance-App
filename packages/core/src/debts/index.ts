/**
 * Browser-safe entry point for the debts domain (no bcrypt): client components
 * import from "@finance-app/core/debts" instead of the package root.
 */
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
} from "./debt";
export type {
  DebtInput,
  DebtKind,
  DebtInputErrors,
  DebtProgress,
  DebtStatus,
  DebtValidationResult,
} from "./debt";
