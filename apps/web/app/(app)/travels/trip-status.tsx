import type { TripSchedule } from "@finance-app/core/travels";
import { useTranslations } from "next-intl";

import { Icon } from "@/components/ui/icon";
import { PHASE_LOOKS, describeSchedule } from "@/lib/trip-schedule-labels";

/** Badge with the phase of the trip (upcoming / in progress / finished). Renders nothing for a trip without dates. */
export function TripPhaseBadge({ schedule }: { schedule: TripSchedule }) {
  const t = useTranslations("travels.phases");
  if (schedule.phase === "undated") return null;
  const look = PHASE_LOOKS[schedule.phase];
  return (
    <span
      data-testid="trip-phase"
      data-phase={schedule.phase}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${look.badge}`}
    >
      {schedule.phase === "ongoing" ? (
        <span aria-hidden="true" className="size-1.5 animate-live rounded-full bg-white" />
      ) : null}
      <Icon name={look.icon} width={14} height={14} />
      {t(schedule.phase)}
    </span>
  );
}

/** "Starts in 9 days", "Day 3 of 8 · 5 days left", "Ended 2 days ago". */
export function TripPhaseDetail({ schedule, className = "" }: { schedule: TripSchedule; className?: string }) {
  const t = useTranslations("travels.schedule");
  const text = describeSchedule(schedule, (key, values) => t(key, values));
  if (!text) return null;
  return (
    <span data-testid="trip-phase-detail" className={className}>
      {text}
    </span>
  );
}

/** How far through the trip we are; only meaningful while it is in progress. */
export function TripProgress({ schedule }: { schedule: TripSchedule }) {
  const t = useTranslations("travels");
  if (schedule.phase !== "ongoing" || !schedule.totalDays || !schedule.dayNumber) return null;
  const percent = Math.round((schedule.dayNumber / schedule.totalDays) * 100);
  return (
    <div
      role="progressbar"
      aria-label={t("progress")}
      aria-valuemin={0}
      aria-valuemax={schedule.totalDays}
      aria-valuenow={schedule.dayNumber}
      className="h-1.5 overflow-hidden rounded-full bg-paper-line"
    >
      <div className="h-full rounded-full bg-leaf transition-all duration-700" style={{ width: `${percent}%` }} />
    </div>
  );
}

/** Stamp for a trip whose expenses are all paid and whose accounts are even. */
export function SettledStamp({ size = "sm" }: { size?: "sm" | "lg" }) {
  const t = useTranslations("travels");
  return (
    <span
      data-testid="trip-settled"
      className={`inline-flex animate-stamp items-center gap-1.5 rounded-full border border-leaf bg-leaf-tint font-semibold text-leaf ${
        size === "lg" ? "px-3.5 py-1 text-sm" : "px-2.5 py-0.5 text-xs"
      }`}
    >
      <Icon name="checkCircle" width={size === "lg" ? 18 : 14} height={size === "lg" ? 18 : 14} />
      {t("settled")}
    </span>
  );
}
