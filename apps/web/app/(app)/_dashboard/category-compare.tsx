import type { CategoryIcon } from "@finance-app/core/categories";
import type { CategoryComparison, RestGroup } from "@finance-app/core/dashboard";
import { formatCop } from "@finance-app/core/expenses";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { CategoryBadge } from "@/components/ui/category-badge";
import { useFormatters } from "@/lib/format";

type Props = {
  period: string;
  previousPeriod: string;
  top: CategoryComparison[];
  rest: RestGroup | null;
};

function Change({ deltaMinor, deltaPercent, isNew }: { deltaMinor: number; deltaPercent: number | null; isNew: boolean }) {
  const t = useTranslations("dashboard.categories");
  if (isNew) return <span className="rounded-full bg-saffron-tint px-2 py-0.5 text-xs font-semibold text-saffron-ink">{t("new")}</span>;
  if (deltaMinor === 0) return <span className="text-xs text-paper-muted">—</span>;
  const up = deltaMinor > 0;
  return (
    <span className={`text-xs font-semibold tabular-nums ${up ? "text-clay" : "text-leaf"}`}>
      <span aria-hidden="true">{up ? "▲" : "▼"} </span>
      {formatCop(Math.abs(deltaMinor))}
      {deltaPercent !== null ? ` (${Math.abs(deltaPercent)}%)` : null}
    </span>
  );
}

/** Spending by category for the month (solid bar) against the previous one (thin bar). */
export function CategoryCompare({ period, previousPeriod, top, rest }: Props) {
  const t = useTranslations("dashboard.categories");
  const format = useFormatters();
  const month = format.month(period);
  const previousMonth = format.month(previousPeriod);
  const biggest = Math.max(1, ...top.map((row) => Math.max(row.currentMinor, row.previousMinor)), rest?.currentMinor ?? 0, rest?.previousMinor ?? 0);
  const width = (value: number) => `${(value / biggest) * 100}%`;

  return (
    <section aria-labelledby="categories-title" className="rounded-panel border border-paper-line p-5 sm:p-6">
      <h2 id="categories-title" className="text-base font-semibold">
        {t("title")}
      </h2>
      <p className="mt-0.5 text-sm text-paper-muted">{t("hint")}</p>

      {top.length === 0 ? (
        <div className="mt-6">
          <p className="text-sm text-paper-muted">{t("empty", { month })}</p>
          <Link href={`/monthly-expenses?period=${period}`} className="mt-2 inline-block text-sm font-semibold text-leaf underline underline-offset-4">
            {t("emptyCta")}
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-5 space-y-4" data-testid="category-rows">
            {top.map((row) => (
              <li
                key={row.categoryId}
                data-category={row.name}
                aria-label={t("row", {
                  name: row.name,
                  current: formatCop(row.currentMinor),
                  month,
                  previous: formatCop(row.previousMinor),
                  previousMonth,
                })}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                    <CategoryBadge color={row.color} icon={row.icon as CategoryIcon} size={24} />
                    <span className="truncate">{row.name}</span>
                  </span>
                  <Change deltaMinor={row.deltaMinor} deltaPercent={row.deltaPercent} isNew={row.isNew} />
                </div>
                <div aria-hidden="true" className="mt-1.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 rounded-full" style={{ width: width(row.currentMinor), backgroundColor: row.color, minWidth: row.currentMinor > 0 ? 4 : 0 }} />
                    <span className="text-xs font-semibold tabular-nums">{formatCop(row.currentMinor)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 rounded-full bg-paper-line" style={{ width: width(row.previousMinor), minWidth: row.previousMinor > 0 ? 4 : 0 }} />
                    <span className="text-xs tabular-nums text-paper-muted">{formatCop(row.previousMinor)}</span>
                  </div>
                </div>
              </li>
            ))}
            {rest ? (
              <li data-testid="category-rest">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">{t("others", { count: rest.count })}</span>
                  <Change deltaMinor={rest.deltaMinor} deltaPercent={null} isNew={false} />
                </div>
                <p className="mt-1 text-xs tabular-nums text-paper-muted">
                  {formatCop(rest.currentMinor)} · {formatCop(rest.previousMinor)}
                </p>
              </li>
            ) : null}
          </ul>
          <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-paper-muted">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-5 rounded-full bg-leaf" />
              {month}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-1.5 w-5 rounded-full bg-paper-line" />
              {previousMonth}
            </span>
          </p>
          <Link href={`/monthly-expenses?period=${period}`} className="mt-3 inline-block text-sm font-semibold text-leaf underline underline-offset-4">
            {t("viewAll")}
          </Link>
        </>
      )}
    </section>
  );
}
