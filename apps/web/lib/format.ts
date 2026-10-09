import { formatPeriod } from "@finance-app/core";
import { useLocale } from "next-intl";

import type { Locale } from "@/i18n/config";

/** BCP 47 tag used for dates; Spanish uses the Colombian variant, like the peso formatting. */
const INTL_LOCALES: Record<Locale, string> = { en: "en-US", es: "es-CO" };

export function intlLocale(locale: string): string {
  return INTL_LOCALES[locale as Locale] ?? INTL_LOCALES.en;
}

/** "October 2026" / "octubre de 2026" for a "YYYY-MM" period. */
export function formatMonth(period: string, locale: string): string {
  return formatPeriod(period, intlLocale(locale));
}

/** "Dec 20, 2026" / "20 dic 2026" for a "YYYY-MM-DD" date (no time zone shift). */
export function formatDay(value: string, locale: string): string {
  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** Locale-bound date helpers for client components. */
export function useFormatters() {
  const locale = useLocale();
  return {
    locale,
    month: (period: string) => formatMonth(period, locale),
    day: (value: string) => formatDay(value, locale),
  };
}
