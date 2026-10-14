import type { Commitment } from "@finance-app/core/dashboard";
import { formatCop } from "@finance-app/core/expenses";
import { useTranslations } from "next-intl";

import { useFormatters } from "@/lib/format";

/** How much of the income is already spoken for by fixed expenses and subscriptions. */
export function Commitments({ period, commitment }: { period: string; commitment: Commitment }) {
  const t = useTranslations("dashboard.commitments");
  const format = useFormatters();
  const { fixedMinor, subscriptionMinor, totalMinor, percentOfIncome } = commitment;
  const fixedWidth = totalMinor > 0 ? (fixedMinor / totalMinor) * 100 : 0;

  return (
    <section aria-labelledby="commitments-title" className="rounded-panel border border-paper-line p-5 sm:p-6">
      <h2 id="commitments-title" className="text-base font-semibold">
        {t("title")}
      </h2>
      <p className="mt-0.5 text-sm text-paper-muted">{t("hint")}</p>

      {totalMinor === 0 ? (
        <p className="mt-6 text-sm text-paper-muted">{t("none", { month: format.month(period) })}</p>
      ) : (
        <>
          <p className="mt-5 font-display text-3xl font-semibold tabular-nums" data-testid="commitment-total">
            {formatCop(totalMinor)}
          </p>
          <p className="text-sm text-paper-muted" data-testid="commitment-share">
            {percentOfIncome === null ? t("noIncome") : t("share", { percent: percentOfIncome })}
          </p>
          <div
            role="img"
            aria-label={t("barLabel", { fixed: formatCop(fixedMinor), subscriptions: formatCop(subscriptionMinor) })}
            className="mt-4 flex h-3 overflow-hidden rounded-full bg-paper-line"
          >
            <span className="h-full bg-leaf" style={{ width: `${fixedWidth}%` }} />
            <span className="h-full bg-saffron" style={{ width: `${100 - fixedWidth}%` }} />
          </div>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2">
                <span aria-hidden="true" className="size-2.5 rounded-full bg-leaf" />
                {t("fixed")}
              </dt>
              <dd className="font-semibold tabular-nums">{formatCop(fixedMinor)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2">
                <span aria-hidden="true" className="size-2.5 rounded-full bg-saffron" />
                {t("subscriptions")}
              </dt>
              <dd className="font-semibold tabular-nums">{formatCop(subscriptionMinor)}</dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
