const DAY_MS = 86_400_000;

function utcDay(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

/** Whole pesos each participant owes on an even split; the whole total when nobody is registered. */
export function perPersonMinor(totalMinor: number, participantCount: number): number {
  return participantCount > 0 ? Math.round(totalMinor / participantCount) : totalMinor;
}

/**
 * Where a trip sits on a Jan–Dec line, as percentages of the year. A missing end date means a one-day
 * trip; a trip that crosses the year edge is clipped; null when it has no start or does not touch the year.
 */
export function tripYearSpan(
  startDate: string | null,
  endDate: string | null,
  year: number,
): { startPct: number; widthPct: number } | null {
  if (!startDate) return null;
  const yearStart = utcDay(`${year}-01-01`);
  const yearEnd = utcDay(`${year}-12-31`);
  const totalDays = (yearEnd - yearStart) / DAY_MS + 1;

  const start = utcDay(startDate);
  const end = Math.max(start, endDate ? utcDay(endDate) : start);
  if (end < yearStart || start > yearEnd) return null;

  const from = Math.max(start, yearStart);
  const to = Math.min(end, yearEnd);
  return {
    startPct: ((from - yearStart) / DAY_MS / totalDays) * 100,
    widthPct: (((to - from) / DAY_MS + 1) / totalDays) * 100,
  };
}
