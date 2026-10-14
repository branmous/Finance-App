import type { DebtsOverview } from "@finance-app/core/dashboard";
import { formatCop } from "@finance-app/core/expenses";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { useFormatters } from "@/lib/format";

/** Monthly installments, what is left to pay and when the last one falls. Shown apart from commitments. */
export function DebtsCard({ period, overview, hasDebts }: { period: string; overview: DebtsOverview; hasDebts: boolean }) {
  const t = useTranslations("dashboard.debts");
  const format = useFormatters();
  const active = overview.remainingInstallments > 0;

  return (
    <section aria-labelledby="debts-title" className="rounded-panel border border-paper-line p-5 sm:p-6">
      <h2 id="debts-title" className="text-base font-semibold">
        {t("title")}
      </h2>
      <p className="mt-0.5 text-sm text-paper-muted">{t("hint")}</p>

      {!hasDebts || !active ? (
        <div className="mt-6">
          <p className="text-sm text-paper-muted">{t("none")}</p>
          <Link href="/debts" className="mt-2 inline-block text-sm font-semibold text-leaf underline underline-offset-4">
            {hasDebts ? t("view") : t("add")}
          </Link>
        </div>
      ) : (
        <>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-paper-muted">{t("monthly", { month: format.month(period) })}</dt>
              <dd className="font-display text-xl font-semibold tabular-nums" data-testid="debts-monthly">
                {formatCop(overview.monthlyMinor)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-paper-muted">{t("remaining")}</dt>
              <dd className="font-semibold tabular-nums" data-testid="debts-remaining">
                {overview.remainingInstallments}
              </dd>
            </div>
            {overview.endPeriod ? (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-paper-muted">{t("endsIn")}</dt>
                <dd className="font-semibold">{format.month(overview.endPeriod)}</dd>
              </div>
            ) : null}
            {overview.overdueInstallments > 0 ? (
              <div className="flex items-baseline justify-between gap-3 rounded-field bg-clay-tint px-3 py-2 text-clay">
                <dt className="font-semibold">{t("overdue")}</dt>
                <dd className="font-semibold tabular-nums" data-testid="debts-overdue">
                  {overview.overdueInstallments}
                </dd>
              </div>
            ) : null}
          </dl>
          <Link href="/debts" className="mt-4 inline-block text-sm font-semibold text-leaf underline underline-offset-4">
            {t("view")}
          </Link>
        </>
      )}
    </section>
  );
}
