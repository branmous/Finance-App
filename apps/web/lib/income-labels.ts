import type { IncomeType } from "@finance-app/core/incomes";

export const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  payroll: "Payroll",
  freelance: "Freelance",
  rent: "Rent received",
  other: "Other",
};
