import type { TripExpenseCategory, TripExpenseStatus, TripKind } from "@finance-app/core";
import { createTripRepository } from "@finance-app/db";
import { notFound } from "next/navigation";

import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

import { TripDetail } from "./trip-detail";

export const metadata = { title: "Trip · Finance App" };

type Props = { params: { id: string } };

export default async function TripPage({ params }: Props) {
  const user = await getSessionUser();
  // A malformed id is just a trip that does not exist; the database would reject it as a uuid.
  const detail = user && /^[0-9a-f-]{36}$/i.test(params.id) ? await createTripRepository(getDb()).get(user.id, params.id) : null;
  if (!detail) notFound();

  // The database stores these as plain strings; they were validated against the closed lists on write.
  return (
    <TripDetail
      trip={{
        id: detail.trip.id,
        name: detail.trip.name,
        kind: detail.trip.kind as TripKind,
        startDate: detail.trip.startDate,
        endDate: detail.trip.endDate,
      }}
      people={detail.participants.map((person) => ({ id: person.id, name: person.name }))}
      expenses={detail.expenses.map((row) => ({
        id: row.id,
        description: row.description,
        category: row.category as TripExpenseCategory,
        amountMinor: row.amountMinor,
        spentOn: row.spentOn,
        status: row.status as TripExpenseStatus,
        paidById: row.paidById,
        shareIds: row.shareIds,
      }))}
      settlements={detail.settlements.map((row) => ({
        id: row.id,
        fromId: row.fromId,
        toId: row.toId,
        amountMinor: row.amountMinor,
        paidOn: row.paidOn,
      }))}
    />
  );
}
