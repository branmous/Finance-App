import type { TripExpenseCategory, TripExpenseStatus, TripKind } from "@finance-app/core/travels";

export const TRIP_KIND_LABELS: Record<TripKind, string> = {
  individual: "Individual",
  group: "Group",
};

export const TRIP_CATEGORY_LABELS: Record<TripExpenseCategory, string> = {
  flights: "Flights",
  lodging: "Lodging",
  transport: "Transport",
  food: "Food",
  activities: "Activities",
  other: "Other",
};

export const TRIP_STATUS_LABELS: Record<TripExpenseStatus, string> = {
  pending: "Pending",
  paid: "Paid",
};
