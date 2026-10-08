"use client";

import { formatCop } from "@finance-app/core/expenses";
import { computeTripSchedule, type TripKind, type TripPhase, type TripSchedule } from "@finance-app/core/travels";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { TRIP_KIND_LABELS } from "@/lib/travel-labels";
import { formatTripDates } from "@/lib/trip-dates";
import { useToday } from "@/lib/use-today";

import { SettledStamp, TripPhaseBadge, TripPhaseDetail, TripProgress } from "./trip-status";
import { TripFormDialog } from "./trip-form-dialog";

export type TripListEntry = {
  id: string;
  name: string;
  kind: TripKind;
  startDate: string | null;
  endDate: string | null;
  participantCount: number;
  totalMinor: number;
  /** Has expenses, none pending and nobody owes anyone. */
  settled: boolean;
};

type Filter = "all" | "ongoing" | "upcoming" | "finished";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ongoing", label: "In progress" },
  { value: "upcoming", label: "Upcoming" },
  { value: "finished", label: "Finished" },
];

// What is happening now comes first, then what is coming soonest, then trips with no dates, then the past.
const PHASE_ORDER: Record<TripPhase, number> = { ongoing: 0, upcoming: 1, undated: 2, finished: 3 };

type Scheduled = { trip: TripListEntry; schedule: TripSchedule | null };

function compare(a: Scheduled, b: Scheduled): number {
  if (!a.schedule || !b.schedule) return 0;
  const byPhase = PHASE_ORDER[a.schedule.phase] - PHASE_ORDER[b.schedule.phase];
  if (byPhase !== 0) return byPhase;
  if (a.schedule.phase === "upcoming") return (a.schedule.daysUntilStart ?? 0) - (b.schedule.daysUntilStart ?? 0);
  if (a.schedule.phase === "finished") return (a.schedule.daysSinceEnd ?? 0) - (b.schedule.daysSinceEnd ?? 0);
  return 0;
}

export function TravelsView({ trips }: { trips: TripListEntry[] }) {
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const today = useToday();

  // Until the browser tells us the date, show the trips as the server sent them, without a status.
  const scheduled = useMemo<Scheduled[]>(() => {
    const items = trips.map((trip) => ({
      trip,
      schedule: today ? computeTripSchedule(trip.startDate, trip.endDate, today) : null,
    }));
    return today ? items.sort(compare) : items;
  }, [trips, today]);

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: scheduled.length, ongoing: 0, upcoming: 0, finished: 0 };
    for (const item of scheduled) {
      const phase = item.schedule?.phase;
      if (phase === "ongoing" || phase === "upcoming" || phase === "finished") result[phase] += 1;
    }
    return result;
  }, [scheduled]);

  const visible = filter === "all" ? scheduled : scheduled.filter((item) => item.schedule?.phase === filter);

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

      {trips.length > 0 ? (
        <div role="group" aria-label="Filter trips" className="mt-6 flex flex-wrap gap-2">
          {FILTERS.map((item) => {
            const on = filter === item.value;
            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(item.value)}
                className={`min-h-9 rounded-full border px-3.5 text-sm font-medium transition-colors ${
                  on
                    ? "border-leaf bg-leaf text-white"
                    : "border-paper-line bg-paper-raised text-ink hover:bg-leaf-tint"
                }`}
              >
                {item.label}
                <span className={`ml-1.5 tabular-nums ${on ? "text-white/80" : "text-paper-muted"}`}>
                  {counts[item.value]}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="mt-6">
        {trips.length === 0 ? (
          <EmptyState
            title="No trips yet"
            description="Create a trip to log its flights, hotels and other expenses. Group trips split the costs between everyone going."
            action={<Button onClick={() => setCreating(true)}>Add a trip</Button>}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title="No trips here"
            description="None of your trips is in this state right now."
            action={
              <Button variant="secondary" onClick={() => setFilter("all")}>
                Show all trips
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {visible.map(({ trip, schedule }) => (
              <li key={trip.id}>
                <Link
                  href={`/travels/${trip.id}`}
                  className={`group block rounded-panel border bg-paper-raised p-5 transition duration-200 hover:-translate-y-0.5 hover:bg-leaf-tint hover:shadow-md ${
                    trip.settled ? "border-leaf/50" : "border-paper-line"
                  } ${schedule?.phase === "finished" && !trip.settled ? "opacity-90" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="truncate text-lg font-semibold">{trip.name}</h2>
                    <span className="shrink-0 rounded-full bg-leaf-tint px-2.5 py-0.5 text-xs font-semibold text-leaf group-hover:bg-paper-raised">
                      {TRIP_KIND_LABELS[trip.kind]}
                    </span>
                  </div>

                  {schedule && schedule.phase !== "undated" ? (
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <TripPhaseBadge schedule={schedule} />
                      <TripPhaseDetail schedule={schedule} className="text-sm font-medium text-ink" />
                    </div>
                  ) : null}
                  {schedule ? (
                    <div className="mt-3">
                      <TripProgress schedule={schedule} />
                    </div>
                  ) : null}

                  <p className="mt-3 text-sm text-paper-muted">
                    {formatTripDates(trip.startDate, trip.endDate) ?? "No dates yet"}
                    {trip.kind === "group" ? ` · ${trip.participantCount} people` : ""}
                  </p>

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <p className="font-display text-2xl font-semibold tabular-nums">{formatCop(trip.totalMinor)}</p>
                    {trip.settled ? <SettledStamp /> : null}
                  </div>
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
