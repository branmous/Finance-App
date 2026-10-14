import { formatCop } from "@finance-app/core/expenses";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { ReactNode } from "react";

import { Guilloche } from "@/components/guilloche";
import { useFormatters } from "@/lib/format";

import { Delta } from "./delta";
import type { DashboardData } from "./load";

function Stat({ label, children, testId }: { label: string; children: ReactNode; testId: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="mt-1" data-testid={testId}>
        {children}
      </dd>
    </div>
  );
}

/** Hero panel: what came in, what went out and what stayed, for the month against the one before. */
export function FlowSummary({ data }: { data: DashboardData }) {
  const t = useTranslations("dashboard.flow");
  const format = useFormatters();
  const month = format.month(data.period);
  const previousMonth = format.month(data.previousPeriod);
  const empty = data.income.current === 0 && data.spent.current === 0;
  const negative = data.left.current < 0;

  return (
    <section aria-labelledby="flow-title" className="relative overflow-hidden rounded-panel bg-ink p-6 text-paper sm:p-8">
      <Guilloche className="absolute -right-24 -top-24 h-80 w-80 text-ink-line" />
      <div className="relative">
        <h2 id="flow-title" className="text-sm font-medium text-ink-muted">
          {t("title")} · {month}
        </h2>

        {empty ? (
          <div className="mt-4">
            <p className="max-w-md text-ink-muted">{t("empty", { month })}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-saffron">
              <Link href={`/monthly-income?period=${data.period}`} className="underline underline-offset-4">
                {t("addIncome")}
              </Link>
              <Link href={`/monthly-expenses?period=${data.period}`} className="underline underline-offset-4">
                {t("addExpenses")}
              </Link>
            </div>
          </div>
        ) : (
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">
            <Stat label={t("income")} testId="flow-income">
              <p className="font-display text-2xl font-semibold tabular-nums sm:text-3xl">{formatCop(data.income.current)}</p>
              <Delta comparison={data.income} goodWhen="up" previousLabel={previousMonth} available={data.previousHasData} onDark />
            </Stat>
            <Stat label={t("spent")} testId="flow-spent">
              <p className="font-display text-2xl font-semibold tabular-nums sm:text-3xl">{formatCop(data.spent.current)}</p>
              <Delta comparison={data.spent} goodWhen="down" previousLabel={previousMonth} available={data.previousHasData} onDark />
            </Stat>
            <Stat label={t("left")} testId="flow-left">
              <p
                className={`font-display text-2xl font-semibold tabular-nums sm:text-3xl ${negative ? "text-saffron" : ""}`}
              >
                {formatCop(data.left.current)}
              </p>
              <Delta comparison={data.left} goodWhen="up" previousLabel={previousMonth} available={data.previousHasData} onDark />
            </Stat>
            <Stat label={t("savingsRate")} testId="flow-rate">
              {data.savingsRate === null ? (
                <p className="text-sm text-ink-muted">{t("noRate")}</p>
              ) : (
                <>
                  <p className="font-display text-2xl font-semibold tabular-nums sm:text-3xl">{data.savingsRate}%</p>
                  {data.previousSavingsRate !== null ? (
                    <p className="text-xs text-ink-muted tabular-nums">
                      {t("vs", { month: previousMonth })}: {data.previousSavingsRate}%
                    </p>
                  ) : null}
                </>
              )}
            </Stat>
          </dl>
        )}
        <p className="mt-6 text-xs text-ink-muted">{t("tripsNote")}</p>
      </div>
    </section>
  );
}
