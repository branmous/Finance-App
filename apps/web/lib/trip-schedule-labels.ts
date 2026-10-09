import type { TripPhase, TripSchedule } from "@finance-app/core/travels";

import type { IconName } from "@/components/ui/icon";

export type PhaseLook = {
  label: string;
  icon: IconName;
  /** Classes for the badge: background and text colour. */
  badge: string;
};

export const PHASE_LOOKS: Record<Exclude<TripPhase, "undated">, PhaseLook> = {
  upcoming: { label: "Upcoming", icon: "calendar", badge: "bg-saffron-tint text-saffron-ink" },
  ongoing: { label: "In progress", icon: "plane", badge: "bg-leaf text-white" },
  finished: { label: "Finished", icon: "flag", badge: "bg-paper-line text-ink" },
};

function days(count: number): string {
  return `${count} ${count === 1 ? "day" : "days"}`;
}

/** The sentence under the badge: how long to go, which day it is, or how long ago it ended. */
export function describeSchedule(schedule: TripSchedule): string | null {
  switch (schedule.phase) {
    case "upcoming": {
      const until = schedule.daysUntilStart ?? 0;
      return until === 1 ? "Starts tomorrow" : `Starts in ${days(until)}`;
    }
    case "ongoing": {
      const dayNumber = schedule.dayNumber ?? 1;
      const totalDays = schedule.totalDays ?? 1;
      const daysLeft = schedule.daysLeft ?? 0;
      if (totalDays === 1) return "Happening today";
      if (daysLeft === 0) return `Last day · day ${dayNumber} of ${totalDays}`;
      return `Day ${dayNumber} of ${totalDays} · ${days(daysLeft)} left`;
    }
    case "finished": {
      const since = schedule.daysSinceEnd ?? 0;
      return since === 1 ? "Ended yesterday" : `Ended ${days(since)} ago`;
    }
    case "undated":
      return null;
  }
}
