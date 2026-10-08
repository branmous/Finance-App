"use client";

import { formatCop } from "@finance-app/core/expenses";
import type { TripKind } from "@finance-app/core/travels";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { TRIP_KIND_LABELS } from "@/lib/travel-labels";
import { formatTripDates } from "@/lib/trip-dates";

import { TripFormDialog } from "./trip-form-dialog";

export type TripListEntry = {
  id: string;
  name: string;
  kind: TripKind;
  startDate: string | null;
  endDate: string | null;
  participantCount: number;
  totalMinor: number;
};

export function TravelsView({ trips }: { trips: TripListEntry[] }) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Travels</h1>
          <p className="mt-1.5 text-paper-muted">Plan your trips, track what they cost and split group expenses.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Icon name="plus" width={18} height={18} />
          New trip
        </Button>
      </div>

      <div className="mt-8">
        {trips.length === 0 ? (
          <EmptyState
            title="No trips yet"
            description="Create a trip to log its flights, hotels and other expenses. Group trips split the costs between everyone going."
            action={<Button onClick={() => setCreating(true)}>Add a trip</Button>}
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {trips.map((trip) => (
              <li key={trip.id}>
                <Link
                  href={`/travels/${trip.id}`}
                  className="block rounded-panel border border-paper-line bg-paper-raised p-5 transition-colors hover:bg-leaf-tint"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="truncate text-lg font-semibold">{trip.name}</h2>
                    <span className="shrink-0 rounded-full bg-leaf-tint px-2.5 py-0.5 text-xs font-semibold text-leaf">
                      {TRIP_KIND_LABELS[trip.kind]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-paper-muted">
                    {formatTripDates(trip.startDate, trip.endDate) ?? "No dates yet"}
                    {trip.kind === "group" ? ` · ${trip.participantCount} people` : ""}
                  </p>
                  <p className="mt-4 font-display text-2xl font-semibold tabular-nums">{formatCop(trip.totalMinor)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <TripFormDialog open={creating} trip={null} onClose={() => setCreating(false)} />
    </div>
  );
}
