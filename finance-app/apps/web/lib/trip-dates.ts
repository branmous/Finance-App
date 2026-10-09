function formatDay(value: string): string {
  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

/** "Dec 20, 2026 – Dec 28, 2026", a single date, or null when the trip has none. */
export function formatTripDates(startDate: string | null, endDate: string | null): string | null {
  if (startDate && endDate) return `${formatDay(startDate)} – ${formatDay(endDate)}`;
  if (startDate) return `From ${formatDay(startDate)}`;
  if (endDate) return `Until ${formatDay(endDate)}`;
  return null;
}

export { formatDay as formatTripDay };
