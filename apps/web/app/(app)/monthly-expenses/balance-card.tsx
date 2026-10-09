import { computeBalance, type BalanceStatus } from "@finance-app/core/budget";
import { formatCop, formatPeriod } from "@finance-app/core/expenses";
import Link from "next/link";

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
  const balance = computeBalance({ income, spent, paid });
  const monthLabel = formatPeriod(period);
  const incomeHref = `/monthly-income?period=${period}`;

  if (balance.status === "no_income") {
    return (
      <section aria-labelledby="balance-title" className="mt-4 rounded-panel border border-dashed border-paper-line p-5">
        <h2 id="balance-title" className="text-base font-semibold">
          Income vs spending
        </h2>
        <p className="mt-1 text-sm text-paper-muted" data-testid="balance-status">
          No income recorded for {monthLabel}, so there is nothing to compare your spending with.
        </p>
        <Link href={incomeHref} className="mt-3 inline-block text-sm font-semibold text-leaf underline underline-offset-4">
          Add income
        </Link>
      </section>
    );
  }

  const over = balance.status === "over";
  return (
    <section aria-labelledby="balance-title" className="mt-4 rounded-panel border border-paper-line p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="balance-title" className="text-base font-semibold">
          Income vs spending
        </h2>
        <Link href={incomeHref} className="text-sm font-semibold text-leaf underline underline-offset-4">
          View income
        </Link>
      </div>

      <div
        role="img"
        aria-label={`${balance.usedPercent}% of the income is spent`}
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
          ? `Over budget by ${formatCop(-balance.left)}: you plan to spend more than you earned in ${monthLabel}.`
          : balance.status === "tight"
            ? `Tight: ${balance.usedPercent}% of your income is already spoken for.`
            : `${balance.usedPercent}% of your income is spent or pending.`}
      </p>

      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-paper-muted">Income</dt>
          <dd className="font-semibold tabular-nums" data-testid="balance-income">
            {formatCop(balance.income)}
          </dd>
        </div>
        <div>
          <dt className="text-paper-muted">Spent (incl. pending)</dt>
          <dd className="font-semibold tabular-nums">{formatCop(balance.spent)}</dd>
        </div>
        <div>
          <dt className="text-paper-muted">Left after pending</dt>
          <dd className={`font-semibold tabular-nums ${over ? "text-clay" : ""}`} data-testid="balance-left">
            {formatCop(balance.left)}
          </dd>
        </div>
        <div>
          <dt className="text-paper-muted">Left right now</dt>
          <dd className={`font-semibold tabular-nums ${balance.leftNow < 0 ? "text-clay" : ""}`} data-testid="balance-left-now">
            {formatCop(balance.leftNow)}
          </dd>
        </div>
      </dl>
    </section>
  );
}