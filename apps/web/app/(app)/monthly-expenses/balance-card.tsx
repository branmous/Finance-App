import { computeBalance, type BalanceStatus } from "@finance-app/core/budget";
import { formatCop } from "@finance-app/core/expenses";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { useFormatters } from "@/lib/format";

type Props = {
  period: string;
  /** Income recorded for the month, whole pesos. */
  income: number;
  /** Paid + pending expenses of the month. */
  spent: number;
  /** Expenses already paid. */
  paid: number;
};

const BAR_COLOR: Record<BalanceStatus, string> = {
  no_income: "bg-paper-line",
  ok: "bg-leaf",
  tight: "bg-saffron",
  over: "bg-clay",
};

export function BalanceCard({ period, income, spent, paid }: Props) {
  const t = useTranslations("expenses.balance");
  const format = useFormatters();
  const balance = computeBalance({ income, spent, paid });
  const monthLabel = format.month(period);
  const incomeHref = `/monthly-income?period=${period}`;

  if (balance.status === "no_income") {
    return (
      <section aria-labelledby="balance-title" className="mt-4 rounded-panel border border-dashed border-paper-line p-5">
        <h2 id="balance-title" className="text-base font-semibold">
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-paper-muted" data-testid="balance-status">
          {t("noIncome", { month: monthLabel })}
        </p>
        <Link href={incomeHref} className="mt-3 inline-block text-sm font-semibold text-leaf underline underline-offset-4">
          {t("addIncome")}
        </Link>
      </section>
    );
  }

  const over = balance.status === "over";
  return (
    <section aria-labelledby="balance-title" className="mt-4 rounded-panel border border-paper-line p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="balance-title" className="text-base font-semibold">
          {t("title")}
        </h2>
        <Link href={incomeHref} className="text-sm font-semibold text-leaf underline underline-offset-4">
          {t("viewIncome")}
        </Link>
      </div>

      <div
        role="img"
        aria-label={t("barLabel", { percent: balance.usedPercent })}
        className="mt-4 h-3 overflow-hidden rounded-full bg-leaf-tint"
      >
        <div className={`h-full ${BAR_COLOR[balance.status]}`} style={{ width: `${Math.min(balance.usedPercent, 100)}%` }} />
      </div>

      <p
        role="status"
        data-testid="balance-status"
        className={`mt-3 rounded-field px-3 py-2 text-sm ${
          over ? "bg-clay-tint font-semibold text-clay" : balance.status === "tight" ? "bg-saffron-tint" : "text-paper-muted"
        }`}
      >
        {over
          ? t("over", { amount: formatCop(-balance.left), month: monthLabel })
          : balance.status === "tight"
            ? t("tight", { percent: balance.usedPercent })
            : t("ok", { percent: balance.usedPercent })}
      </p>

      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-paper-muted">{t("income")}</dt>
          <dd className="font-semibold tabular-nums" data-testid="balance-income">
            {formatCop(balance.income)}
          </dd>
        </div>
        <div>
          <dt className="text-paper-muted">{t("spent")}</dt>
          <dd className="font-semibold tabular-nums">{formatCop(balance.spent)}</dd>
        </div>
        <div>
          <dt className="text-paper-muted">{t("leftAfterPending")}</dt>
          <dd className={`font-semibold tabular-nums ${over ? "text-clay" : ""}`} data-testid="balance-left">
            {formatCop(balance.left)}
          </dd>
        </div>
        <div>
          <dt className="text-paper-muted">{t("leftNow")}</dt>
          <dd className={`font-semibold tabular-nums ${balance.leftNow < 0 ? "text-clay" : ""}`} data-testid="balance-left-now">
            {formatCop(balance.leftNow)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
