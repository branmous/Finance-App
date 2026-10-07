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

import { deleteExpense, unlinkExpense } from "./actions";
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
  const [listError, setListError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const hasCategories = categories.length > 0;
  const monthLabel = formatPeriod(period);

  // An expense paid with another one is shown under it; the month total counts only the parents.
  const ids = new Set(expenses.map((item) => item.id));
  const topLevel = expenses.filter((item) => !item.parentId || !ids.has(item.parentId));
  const childrenOf = (parentId: string) => expenses.filter((item) => item.parentId === parentId);
  const deletingChildren = deleting ? childrenOf(deleting.id).length : 0;
  const editingChildren = editing ? childrenOf(editing.id).length : 0;

  function makeIndependent(item: ExpenseItem) {
    setListError(null);
    startTransition(async () => {
      const result = await unlinkExpense(item.id);
      if (!result.ok) setListError(result.message ?? "The expense could not be updated.");
    });
  }

  function renderRow(item: ExpenseItem, parent?: ExpenseItem) {
    const linked = childrenOf(item.id);
    const linkedTotal = linked.reduce((sum, child) => sum + child.amountMinor, 0);
    return (
      <div className={`flex items-center gap-4 py-3 ${parent ? "pl-6 sm:pl-12" : ""}`}>
        <CategoryBadge color={item.categoryColor} icon={item.categoryIcon} size={parent ? 32 : 40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{item.categoryName}</p>
          <p className="truncate text-sm text-paper-muted">
            {parent ? (
              `Paid with ${parent.categoryName}`
            ) : item.paidOn ? (
              `Paid ${formatPaidOn(item.paidOn)}`
            ) : (
              <span className="rounded-full bg-saffron-tint px-2 py-0.5 text-xs font-semibold text-ink">Pending</span>
            )}
            {item.note ? ` · ${item.note}` : ""}
          </p>
          {linked.length > 0 ? (
            <p className={`truncate text-xs ${linkedTotal > item.amountMinor ? "font-semibold text-clay" : "text-paper-muted"}`}>
              Includes {formatCop(linkedTotal)} in {linked.length} linked
              {linkedTotal > item.amountMinor ? " · more than this amount" : ""}
            </p>
          ) : null}
        </div>
        <span className="font-semibold tabular-nums">{formatCop(item.amountMinor)}</span>
        {parent ? (
          <Button
            variant="ghost"
            className="px-2.5 text-xs"
            onClick={() => makeIndependent(item)}
            disabled={pending}
            aria-label={`Make ${item.categoryName} independent`}
          >
            Make independent
          </Button>
        ) : null}
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
      </div>
    );
  }

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
          {topLevel.length} {topLevel.length === 1 ? "expense" : "expenses"}
          {expenses.length > topLevel.length ? ` · ${expenses.length - topLevel.length} paid with another` : ""}
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
          <>
            {listError ? (
              <p role="alert" className="mb-3 rounded-field bg-clay-tint px-3 py-2.5 text-sm text-clay">
                {listError}
              </p>
            ) : null}
            <ul className="divide-y divide-paper-line border-y border-paper-line">
              {topLevel.map((item) => (
                <li key={item.id}>
                  {renderRow(item)}
                  {childrenOf(item.id).length > 0 ? (
                    <ul className="divide-y divide-paper-line border-t border-paper-line bg-leaf-tint/40">
                      {childrenOf(item.id).map((child) => (
                        <li key={child.id}>{renderRow(child, item)}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <ExpenseFormDialog
        open={editing !== undefined}
        expense={editing ?? null}
        categories={categories}
        defaultPeriod={period}
        parentCandidates={topLevel}
        hasChildren={editingChildren > 0}
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
        {deletingChildren > 0 ? (
          <p className="mt-3 rounded-field bg-saffron-tint px-3 py-2.5 text-sm">
            {deletingChildren} linked {deletingChildren === 1 ? "expense" : "expenses"} will become independent and
            count on their own in the month total.
          </p>
        ) : null}
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
