/**
 * Browser-safe entry point for the travels domain (no bcrypt): client components
 * import from "@finance-app/core/travels" instead of the package root.
 */
export {
  TRIP_EXPENSE_CATEGORIES,
  TRIP_EXPENSE_DESCRIPTION_MAX_LENGTH,
  TRIP_EXPENSE_STATUSES,
  TRIP_KINDS,
  TRIP_MAX_PARTICIPANTS,
  TRIP_NAME_MAX_LENGTH,
  TRIP_PERSON_NAME_MAX_LENGTH,
  validateTripDetailsInput,
  validateTripExpenseInput,
  validateTripInput,
  validateTripPersonName,
  validateTripSettlementInput,
} from "./trip";
export type {
  TripDetailsInput,
  TripDetailsValidationResult,
  TripExpenseCategory,
  TripExpenseInput,
  TripExpenseInputErrors,
  TripExpenseStatus,
  TripExpenseValidationResult,
  TripInput,
  TripInputErrors,
  TripKind,
  TripPersonResult,
  TripSettlementInput,
  TripSettlementInputErrors,
  TripSettlementValidationResult,
  TripValidationResult,
} from "./trip";
export { computeTripSchedule, todayIso } from "./schedule";
export type { TripPhase, TripSchedule } from "./schedule";
export { computeSettlementPlan, computeTripSummary, isTripSettled, splitAmount } from "./split";
export type {
  PersonBalance,
  SettlementTransfer,
  SummaryExpense,
  SummaryPerson,
  SummarySettlement,
  TripSummary,
} from "./split";
