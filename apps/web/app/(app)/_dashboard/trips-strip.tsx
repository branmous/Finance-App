"use client";

import { formatCop } from "@finance-app/core/expenses";
import { computeTripSchedule } from "@finance-app/core/travels";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

import { formatTripDates } from "@/lib/trip-dates";
import { useToday } from "@/lib/use-today";
import { intlLocale } from "@/lib/format";

import { SettledStamp, TripPhaseBadge, TripPhaseDetail } from "../travels/trip-status";
import type { DashboardTrip } from "./load";

const MAX_CARDS = 4;

function monthInitials(locale: string): string[] {
  const formatter = new Intl.DateTimeFormat(intlLocale(locale), { month: "narrow", timeZone: "UTC" });
  return Array.from({ length: 12 }, (_, month) => formatter.format(new Date(Date.UTC(2026, month, 1))));
}

/**
 * Trips of the year on a Jan–Dec line, plus a card each. Trip money is shown here only: it never feeds
 * the monthly figures. Status depends on the viewer's date, so this runs in the browser.
 */
export function TripsStrip({ year, trips }: { year: number; trips: DashboardTrip[] }) {
  const t = useTranslations("dashboard.trips");
  const tTravels = useTranslations("travels");
  const locale = useLocale();
  const today = useToday();

  const inYear = trips.filter((trip) => trip.span);
  const undated = trips.filter((trip) => !trip.startDate && !trip.endDate);
  const cards = [...inYear, ...undated].slice(0, MAX_CARDS);
  const todayPct = today && today.startsWith(`${year}-`) ? (dayOfYear(today) / daysInYear(year)) * 100 : null;
  const initials = monthInitials(locale);

  return (
    <section aria-labelledby="trips-title" className="rounded-panel border border-paper-line p-5 sm:p-6" data-testid="trips-strip">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="trips-title" className="text-base font-semibold">
          {t("title")}
        </h2>
        <Link href="/travels" className="text-sm font-semibold text-leaf underline underline-offset-4">
          {t("viewAll")}
        </Link>
      </div>
      <p className="mt-0.5 text-sm text-paper-muted">{t("hint")}</p>

      {trips.length === 0 ? (
        <div className="mt-6">
          <p className="text-sm text-paper-muted">{t("empty")}</p>
          <Link href="/travels" className="mt-2 inline-block text-sm font-semibold text-leaf underline underline-offset-4">
            {t("emptyCta")}
          </Link>
        </div>
      ) : (
        <>
          {inYear.length > 0 ? (
            <div role="img" aria-label={t("timelineLabel", { year })} className="mt-5">
              <div className="relative rounded-field bg-paper-raised py-1.5" style={{ height: 12 + inYear.length * 22 }}>
                <div aria-hidden="true" className="absolute inset-0 grid grid-cols-12">
                  {initials.map((initial, index) => (
                    <span key={index} className="border-l border-paper-line first:border-l-0" />
                  ))}
                </div>
                {inYear.map((trip, index) =>
                  trip.span ? (
                    <span
                      key={trip.id}
                      className="absolute h-4 rounded-full bg-leaf"
                      style={{
                        left: `${trip.span.startPct}%`,
                        width: `max(${trip.span.widthPct}%, 10px)`,
                        top: 6 + index * 22,
                      }}
                    />
                  ) : null,
                )}
                {todayPct !== null ? (
                  <span
                    className="absolute inset-y-0 w-0.5 bg-clay"
                    style={{ left: `${todayPct}%` }}
                    title={t("today")}
                  />
                ) : null}
              </div>
              <div aria-hidden="true" className="mt-1 grid grid-cols-12 text-center text-xs text-paper-muted">
                {initials.map((initial, index) => (
                  <span key={index}>{initial}</span>
                ))}
              </div>
            </div>
          ) : null}

          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {cards.map((trip) => {
              const schedule = today ? computeTripSchedule(trip.startDate, trip.endDate, today) : null;
              const dates = formatTripDates(trip.startDate, trip.endDate, locale, (key, values) => tTravels(key, values));
              const toSettle = !trip.settled && trip.totalMinor > 0 && schedule?.phase === "finished";
              return (
                <li key={trip.id} data-trip={trip.name}>
                  <Link
                    href={`/travels/${trip.id}`}
                    className="block h-full rounded-field border border-paper-line bg-paper-raised p-4 hover:bg-leaf-tint focus-visible:outline focus-visible:outline-2 focus-visible:outline-leaf"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold">{trip.name}</h3>
                      {schedule ? <TripPhaseBadge schedule={schedule} /> : null}
                    </div>
                    <p className="mt-0.5 text-xs text-paper-muted">{dates ?? t("undated")}</p>
                    {schedule ? <TripPhaseDetail schedule={schedule} className="text-xs text-paper-muted" /> : null}
                    <dl className="mt-3 flex gap-6 text-sm">
                      <div>
                        <dt className="text-xs text-paper-muted">{t("total")}</dt>
                        <dd className="font-semibold tabular-nums" data-testid="trip-total">
                          {formatCop(trip.totalMinor)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-paper-muted">{t("perPerson")}</dt>
                        <dd className="font-semibold tabular-nums" data-testid="trip-per-person">
                          {formatCop(trip.perPersonMinor)}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-2">
                      {trip.settled ? (
                        <SettledStamp />
                      ) : toSettle ? (
                        <span className="rounded-full bg-clay-tint px-2.5 py-0.5 text-xs font-semibold text-clay">
                          {t("unsettled")}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

function daysInYear(year: number): number {
  return (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86_400_000;
}

function dayOfYear(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number) as [number, number, number];
  return (Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86_400_000;
}
