import type { TripExpenseCategory, TripExpenseStatus, TripKind } from "@finance-app/core/travels";

export type TripData = {
  id: string;
  name: string;
  kind: TripKind;
  startDate: string | null;
  endDate: string | null;
};

export type TripPerson = { id: string; name: string };

export type TripExpenseItem = {
  id: string;
  description: string;
  category: TripExpenseCategory;
  amountMinor: number;
  spentOn: string | null;
  status: TripExpenseStatus;
  paidById: string | null;
  shareIds: string[];
};

export type TripSettlementItem = {
  id: string;
  fromId: string;
  toId: string;
  amountMinor: number;
  paidOn: string | null;
};
