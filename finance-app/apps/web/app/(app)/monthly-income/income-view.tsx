"use client";

import { formatCop, formatPeriod, shiftPeriod } from "@finance-app/core/expenses";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { INCOME_TYPE_LABELS } from "@/lib/income-labels";

import { deleteIncome } from "./actions";
import { IncomeFormDialog, type IncomeItem } from "./income-form-dialog";

type Props = {
  period: string;
  isCurrentPeriod: boolean;
  incomes: IncomeItem[];
  total: number;
};

const NAV_LINK =
  "inline-flex size-11 items-center justify-center rounded-field border border-paper-line text-ink hover:bg-leaf-tint";

function periodHref(period: string) {
  return `/monthly-income?period=${period}`;
}

export function IncomeView({ period, isCurrentPeriod, incomes, total }: Props) {
  // `undefined` = closed, `null` = creating, an item = editing.
  const [editing, setEditing] = useState<IncomeItem | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<IncomeItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const monthLabel = formatPeriod(period);

  function confirmDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteIncome(deleting.id);
      if (result.ok) {
        setDeleting(null);
      } else {
        setDeleteError(result.message ?? "The income could not be deleted.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Monthly income</h1>
          <p className="mt-1.5 text-paper-muted">Record your payroll and other income for each month.</p>
        </div>
        <Button onClick={() => setEditing(null)}>
          <Icon name="plus" width={18} height={18} />
          New income
        </Button>
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
          <Link href="/monthly-income" className="text-sm font-semibold text-leaf underline underline-offset-4">
            Back to this month
          </Link>
        )}
      </nav>

      <section aria-labelledby="month-total" className="mt-6 rounded-panel bg-ink p-6 text-paper sm:p-8">
        <h2 id="month-total" className="text-sm font-medium text-ink-muted">
          Total received in {monthLabel}
        </h2>
        <p className="mt-2 font-display text-5xl font-semibold" data-testid="month-total">
          {formatCop(total)}
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          {incomes.length} {incomes.length === 1 ? "income" : "incomes"}
        </p>
      </section>

      <div className="mt-8">
        {incomes.length === 0 ? (
          <EmptyState
            title={`No income in ${monthLabel}`}
            description="Add your payroll or any other income for this month and it will show up here with the total."
            action={<Button onClick={() => setEditing(null)}>Add an income</Button>}
          />
        ) : (
          <ul className="divide-y divide-paper-line border-y border-paper-line">
            {incomes.map((item) => (
              <li key={item.id} className="flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{INCOME_TYPE_LABELS[item.type]}</p>
                  {item.note ? <p className="truncate text-sm text-paper-muted">{item.note}</p> : null}
                </div>
                <span className="font-semibold tabular-nums">{formatCop(item.amountMinor)}</span>
                <Button
                  variant="ghost"
                  className="px-2.5"
                  onClick={() => setEditing(item)}
                  aria-label={`Edit ${INCOME_TYPE_LABELS[item.type]} income`}
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
                  aria-label={`Delete ${INCOME_TYPE_LABELS[item.type]} income`}
                >
                  <Icon name="trash" width={18} height={18} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <IncomeFormDialog
        open={editing !== undefined}
        income={editing ?? null}
        defaultPeriod={period}
        onClose={() => setEditing(undefined)}
      />

      <Dialog open={deleting !== null} title="Delete income" onClose={() => setDeleting(null)}>
        <p className="text-sm text-paper-muted">
          Delete the <strong className="text-ink">{deleting ? INCOME_TYPE_LABELS[deleting.type] : ""}</strong> income
          of <strong className="text-ink">{deleting ? formatCop(deleting.amountMinor) : ""}</strong>? This cannot be
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
            Delete income
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
