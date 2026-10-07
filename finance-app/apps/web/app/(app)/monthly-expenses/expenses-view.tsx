"use client";

import { formatCop, formatPeriod, shiftPeriod } from "@finance-app/core/expenses";
import type { PeriodSummary } from "@finance-app/db";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { CategoryBadge } from "@/components/ui/category-badge";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";

import { deleteExpense } from "./actions";
import { CopyExpensesDialog } from "./copy-expenses-dialog";
import { ExpenseFormDialog, type CategoryOption, type ExpenseItem } from "./expense-form-dialog";

type Props = {
  period: string;
  isCurrentPeriod: boolean;
  expenses: ExpenseItem[];
  /** Previous month's expenses, offered for copying; only loaded for the current month. */
  lastMonthExpenses: ExpenseItem[];
  summary: PeriodSummary;
  categories: CategoryOption[];
};

const NAV_LINK =
  "inline-flex size-11 items-center justify-center rounded-field border border-paper-line text-ink hover:bg-leaf-tint";

function periodHref(period: string) {
  return `/monthly-expenses?period=${period}`;
}

/** Dates arrive as "YYYY-MM-DD"; format in UTC so the day never shifts with the viewer's time zone. */
function formatPaidOn(paidOn: string): string {
  const [year, month, day] = paidOn.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

export function ExpensesView({
  period,
  isCurrentPeriod,
  expenses,
  lastMonthExpenses,
  summary,
  categories,
}: Props) {
  // `undefined` = closed, `null` = creating, an item = editing.
  const [editing, setEditing] = useState<ExpenseItem | null | undefined>(undefined);
  const [copying, setCopying] = useState(false);
  const [deleting, setDeleting] = useState<ExpenseItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const hasCategories = categories.length > 0;
  const monthLabel = formatPeriod(period);

  function confirmDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteExpense(deleting.id);
      if (result.ok) {
        setDeleting(null);
      } else {
        setDeleteError(result.message ?? "The expense could not be deleted.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Monthly expenses</h1>
          <p className="mt-1.5 text-paper-muted">Record what you paid and see where each month went.</p>
        </div>
        {hasCategories ? (
          <div className="flex flex-wrap gap-3">
            {isCurrentPeriod ? (
              <Button variant="secondary" onClick={() => setCopying(true)}>
                <Icon name="repeat" width={18} height={18} />
                Copy from last month
              </Button>
            ) : null}
            <Button onClick={() => setEditing(null)}>
              <Icon name="plus" width={18} height={18} />
              New expense
            </Button>
          </div>
        ) : null}
      </div>

      <nav aria-label="Month" className="mt-8 flex flex-wrap items-center gap-3">
        <Link href={periodHref(shiftPeriod(period, -1))} aria-label="Previous month" className={NAV_LINK}>
          <Icon name="chevronLeft" />
        </Link>
        <h2 className="min-w-40 text-center text-xl font-semibold" aria-live="polite">
          {monthLabel}
        </h2>
        <Link href={periodHref(shiftPeriod(period, 1))} aria-label="Next month" className={NAV_LINK}>
          <Icon name="chevronRight" />
        </Link>
        {isCurrentPeriod ? null : (
          <Link href="/monthly-expenses" className="text-sm font-semibold text-leaf underline underline-offset-4">
            Back to this month
          </Link>
        )}
      </nav>

      <section aria-labelledby="month-total" className="mt-6 rounded-panel bg-ink p-6 text-paper sm:p-8">
        <h2 id="month-total" className="text-sm font-medium text-ink-muted">
          Total spent in {monthLabel}
        </h2>
        <p className="mt-2 font-display text-5xl font-semibold" data-testid="month-total">
          {formatCop(summary.total)}
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          {expenses.length} {expenses.length === 1 ? "expense" : "expenses"}
        </p>
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-ink-line pt-4 text-sm">
          <div>
            <dt className="text-ink-muted">Paid</dt>
            <dd className="font-semibold tabular-nums" data-testid="month-paid">
              {formatCop(summary.paid)}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Pending</dt>
            <dd className="font-semibold tabular-nums" data-testid="month-pending">
              {formatCop(summary.pending)}
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-8">
        {!hasCategories ? (
          <EmptyState
            title="Create a category first"
            description="Every expense belongs to a category, such as Rent or Netflix."
            action={
              <Link
                href="/categories"
                className="inline-flex min-h-11 items-center rounded-field bg-ink px-4 text-sm font-semibold text-white hover:bg-ink-soft"
              >
                Go to categories
              </Link>
            }
          />
        ) : expenses.length === 0 ? (
          <EmptyState
            title={`No expenses in ${monthLabel}`}
            description="Add what you paid for this month and it will show up here with the total."
            action={<Button onClick={() => setEditing(null)}>Add an expense</Button>}
          />
        ) : (
          <ul className="divide-y divide-paper-line border-y border-paper-line">
            {expenses.map((item) => (
              <li key={item.id} className="flex items-center gap-4 py-3">
                <CategoryBadge color={item.categoryColor} icon={item.categoryIcon} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.categoryName}</p>
                  <p className="truncate text-sm text-paper-muted">
                    {item.paidOn ? (
                      `Paid ${formatPaidOn(item.paidOn)}`
                    ) : (
                      <span className="rounded-full bg-saffron-tint px-2 py-0.5 text-xs font-semibold text-ink">
                        Pending
                      </span>
                    )}
                    {item.note ? ` · ${item.note}` : ""}
                  </p>
                </div>
                <span className="font-semibold tabular-nums">{formatCop(item.amountMinor)}</span>
                <Button
                  variant="ghost"
                  className="px-2.5"
                  onClick={() => setEditing(item)}
                  aria-label={`Edit ${item.categoryName} expense`}
                >
                  <Icon name="pencil" width={18} height={18} />
                </Button>
                <Button
                  variant="ghost"
                  className="px-2.5 hover:text-clay"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleting(item);
                  }}
                  aria-label={`Delete ${item.categoryName} expense`}
                >
                  <Icon name="trash" width={18} height={18} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ExpenseFormDialog
        open={editing !== undefined}
        expense={editing ?? null}
        categories={categories}
        defaultPeriod={period}
        onClose={() => setEditing(undefined)}
      />

      <CopyExpensesDialog
        open={copying}
        sourcePeriod={shiftPeriod(period, -1)}
        sources={lastMonthExpenses}
        existing={expenses}
        onClose={() => setCopying(false)}
      />

      <Dialog open={deleting !== null} title="Delete expense" onClose={() => setDeleting(null)}>
        <p className="text-sm text-paper-muted">
          Delete the <strong className="text-ink">{deleting?.categoryName}</strong> expense of{" "}
          <strong className="text-ink">{deleting ? formatCop(deleting.amountMinor) : ""}</strong>? This cannot be
          undone.
        </p>
        {deleteError ? (
          <p role="alert" className="mt-4 rounded-field bg-clay-tint px-3 py-2.5 text-sm text-clay">
            {deleteError}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete} disabled={pending}>
            Delete expense
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
