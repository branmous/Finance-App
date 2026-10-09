import type { CategoryType } from "@finance-app/core/categories";

export const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  subscription: "Subscriptions",
  household: "Household",
  travel: "Travel",
  fixed: "Fixed expenses",
  small_expense: "Small expenses",
  other: "Other",
};

export const CATEGORY_TYPE_HINTS: Record<CategoryType, string> = {
  subscription: "Monthly services like streaming or software",
  household: "Rent, utilities and home obligations",
  travel: "Trips, tickets and stays",
  fixed: "Costs that repeat every month",
  small_expense: "Everyday purchases that add up",
  other: "Anything that does not fit elsewhere",
};
