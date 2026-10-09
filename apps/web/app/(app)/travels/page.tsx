import type { TripKind } from "@finance-app/core";
import { createTripRepository } from "@finance-app/db";
import { getTranslations } from "next-intl/server";

import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

import type { TripListEntry } from "./travels-view";
import { TravelsView } from "./travels-view";

export async function generateMetadata() {
  const t = await getTranslations("travels");
  return { title: t("metaTitle") };
}

export default async function TravelsPage() {
  const user = await getSessionUser();
  const rows = user ? await createTripRepository(getDb()).list(user.id) : [];

  // The kind was validated against the closed list on write.
  const trips: TripListEntry[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind as TripKind,
    startDate: row.startDate,
    endDate: row.endDate,
    participantCount: row.participantCount,
    totalMinor: row.totalMinor,
    settled: row.settled,
  }));

  return <TravelsView trips={trips} />;
}
