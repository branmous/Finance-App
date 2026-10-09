const PERIOD_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** A month as "YYYY-MM", the month an expense belongs to (not when it was paid). */
export function isValidPeriod(value: unknown): value is string {
  return typeof value === "string" && PERIOD_PATTERN.test(value);
}

export function currentPeriod(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftPeriod(period: string, months: number): string {
  const match = PERIOD_PATTERN.exec(period);
  if (!match) throw new Error(`Invalid period: ${period}`);
  const index = Number(match[1]) * 12 + (Number(match[2]) - 1) + months;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function formatPeriod(period: string, locale = "en-US"): string {
  const match = PERIOD_PATTERN.exec(period);
  if (!match) throw new Error(`Invalid period: ${period}`);
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)),
  );
}

/** COP has no minor unit in practice, so amount_minor holds whole pesos. */
export function formatCop(amountMinor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amountMinor);
}
