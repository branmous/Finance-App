export type TripPhase = "upcoming" | "ongoing" | "finished" | "undated";

export type TripSchedule = {
  phase: TripPhase;
  /** Whole days until the first day; only while upcoming. */
  daysUntilStart: number | null;
  /** Which day of the trip today is (1-based); only while ongoing. */
  dayNumber: number | null;
  /** Length of the trip in days, both ends included; null when the trip has no dates. */
  totalDays: number | null;
  /** Days left after today; only while ongoing (0 on the last day). */
  daysLeft: number | null;
  /** Whole days since the last day; only once finished. */
  daysSinceEnd: number | null;
};

const MS_PER_DAY = 86_400_000;

/** "YYYY-MM-DD" → whole days since 1970-01-01, so two dates can be subtracted without time zones or DST. */
function dayIndex(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number) as [number, number, number];
  return Math.round(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

/** Today as "YYYY-MM-DD" in the viewer's own calendar (not UTC), which is what "today" means for a traveller. */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Where a trip stands compared with `today`. A trip with only one date is a one-day trip;
 * a trip with no dates has no schedule.
 */
export function computeTripSchedule(
  startDate: string | null,
  endDate: string | null,
  today: string,
): TripSchedule {
  const first = startDate ?? endDate;
  const last = endDate ?? startDate;
  if (!first || !last) {
    return { phase: "undated", daysUntilStart: null, dayNumber: null, totalDays: null, daysLeft: null, daysSinceEnd: null };
  }

  const start = dayIndex(first);
  const end = dayIndex(last);
  const now = dayIndex(today);
  const totalDays = end - start + 1;

  if (now < start) {
    return { phase: "upcoming", daysUntilStart: start - now, dayNumber: null, totalDays, daysLeft: null, daysSinceEnd: null };
  }
  if (now > end) {
    return { phase: "finished", daysUntilStart: null, dayNumber: null, totalDays, daysLeft: null, daysSinceEnd: now - end };
  }
  return { phase: "ongoing", daysUntilStart: null, dayNumber: now - start + 1, totalDays, daysLeft: end - now, daysSinceEnd: null };
}
