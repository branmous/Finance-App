import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { formatMonth } from "@/lib/format";
import { getSessionUser } from "@/lib/session";

import { AlertsPanel } from "./_dashboard/alerts-panel";
import { CaptureBanner } from "./_dashboard/capture-banner";
import { CategoryCompare } from "./_dashboard/category-compare";
import { Commitments } from "./_dashboard/commitments";
import { DebtsCard } from "./_dashboard/debts-card";
import { FlowSummary } from "./_dashboard/flow-summary";
import { loadDashboard, resolvePeriod } from "./_dashboard/load";
import { PeriodSelector } from "./_dashboard/period-selector";
import { TrendChart } from "./_dashboard/trend-chart";
import { TripsStrip } from "./_dashboard/trips-strip";

type Props = { searchParams: { period?: string | string[] } };

/**
 * Home: the last closed month against the one before it (expenses are recorded a month behind), with
 * the readings needed to decide what to do with the money. Trips get their own strip and never add to
 * the monthly figures.
 */
export default async function DashboardPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const period = resolvePeriod(searchParams.period);
  const data = await loadDashboard(user.id, period);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{t("welcome", { name: user.name ?? "" })}</h1>
          <p className="mt-1.5 text-paper-muted">
            {t("subtitle", { month: formatMonth(data.period, locale), previous: formatMonth(data.previousPeriod, locale) })}
          </p>
        </div>
        <PeriodSelector period={data.period} previousPeriod={data.previousPeriod} />
      </div>

      {data.captureMissing ? <CaptureBanner month={data.captureMonth} /> : null}

      <div className="mt-6 space-y-6">
        <FlowSummary data={data} />

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <CategoryCompare
              period={data.period}
              previousPeriod={data.previousPeriod}
              top={data.categories.top}
              rest={data.categories.rest}
            />
          </div>
          <div className="space-y-6 lg:col-span-2">
            <Commitments period={data.period} commitment={data.commitment} />
            <DebtsCard period={data.period} overview={data.debts} hasDebts={data.hasDebts} />
          </div>
        </div>

        <AlertsPanel alerts={data.alerts} />
        <TrendChart points={data.trend} />
        <TripsStrip year={data.year} trips={data.trips} />
      </div>
    </div>
  );
}
