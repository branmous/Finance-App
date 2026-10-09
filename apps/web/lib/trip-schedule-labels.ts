import type { TripPhase, TripSchedule } from "@finance-app/core/travels";

import type { IconName } from "@/components/ui/icon";

export type PhaseLook = {
  icon: IconName;
  /** Classes for the badge: background and text colour. */
  badge: string;
};

export const PHASE_LOOKS: Record<Exclude<TripPhase, "undated">, PhaseLook> = {
  upcoming: { icon: "calendar", badge: "bg-saffron-tint text-saffron-ink" },
  ongoing: { icon: "plane", badge: "bg-leaf text-white" },
  finished: { icon: "flag", badge: "bg-paper-line text-ink" },
};

type Translate = (key: string, values?: Record<string, string | number>) => string;

/** The sentence under the badge: how long to go, which day it is, or how long ago it ended. `t` is scoped to "travels.schedule". */
export function describeSchedule(schedule: TripSchedule, t: Translate): string | null {
  switch (schedule.phase) {
    case "upcoming": {
      const until = schedule.daysUntilStart ?? 0;
      return until === 1 ? t("startsTomorrow") : t("startsIn", { count: until });
    }
    case "ongoing": {
      const day = schedule.dayNumber ?? 1;
      const total = schedule.totalDays ?? 1;
      const left = schedule.daysLeft ?? 0;
      if (total === 1) return t("happeningToday");
      if (left === 0) return t("lastDay", { day, total });
      return t("dayOf", { day, total, left });
    }
    case "finished": {
      const since = schedule.daysSinceEnd ?? 0;
      return since === 1 ? t("endedYesterday") : t("endedAgo", { count: since });
    }
    case "undated":
      return null;
  }
}
