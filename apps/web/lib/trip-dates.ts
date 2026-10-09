import { formatDay } from "@/lib/format";

type Translate = (key: "datesFrom" | "datesUntil", values: { date: string }) => string;

/** "Dec 20, 2026 – Dec 28, 2026", a single date, or null when the trip has none. */
export function formatTripDates(
  startDate: string | null,
  endDate: string | null,
  locale: string,
  t: Translate,
): string | null {
  if (startDate && endDate) return `${formatDay(startDate, locale)} – ${formatDay(endDate, locale)}`;
  if (startDate) return t("datesFrom", { date: formatDay(startDate, locale) });
  if (endDate) return t("datesUntil", { date: formatDay(endDate, locale) });
  return null;
}
