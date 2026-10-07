"use client";

import { formatCop, formatPeriod } from "@finance-app/core/expenses";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { CategoryBadge } from "@/components/ui/category-badge";
import { Dialog } from "@/components/ui/dialog";

import { copyExpenses } from "./actions";
import type { ExpenseItem } from "./expense-form-dialog";

type Props = {
  open: boolean;
  /** Month the expenses are copied from (the one before the current month). */
  sourcePeriod: string;
  /** Expenses of that month, offered for copying. */
  sources: ExpenseItem[];
  /** Expenses already in the current month, used to flag the ones that were copied before. */
  existing: ExpenseItem[];
  onClose: () => void;
};

const fingerprint = (item: ExpenseItem) => `${item.categoryId}|${item.amountMinor}|${item.note}`;

export function CopyExpensesDialog({ open, sourcePeriod, ...rest }: Props) {
  return (
    <Dialog open={open} title={`Copy from ${formatPeriod(sourcePeriod)}`} onClose={rest.onClose}>
      <CopyForm {...rest} />
    </Dialog>
  );
}

function CopyForm({ sources, existing, onClose }: Omit<Props, "open" | "sourcePeriod">) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // An expense with the same category, amount and note already in this month was probably copied before.
  const existingKeys = new Set(existing.map(fingerprint));
  const alreadyAdded = (item: ExpenseItem) => existingKeys.has(fingerprint(item));
  const selectable = sources.filter((item) => !alreadyAdded(item));

  // Expenses paid with another one are listed right under it.
  const sourceIds = new Set(sources.map((item) => item.id));
  const isChild = (item: ExpenseItem) => item.parentId !== null && sourceIds.has(item.parentId);
  const ordered = sources
    .filter((item) => !isChild(item))
    .flatMap((item) => [item, ...sources.filter((child) => child.parentId === item.id)]);

  const selectedItems = sources.filter((item) => selected.has(item.id));
  const selectedTotal = selectedItems.reduce((sum, item) => sum + item.amountMinor, 0);

  function toggle(id: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await copyExpenses(selectedItems.map((item) => item.id));
      if (result.ok) {
        onClose();
      } else {
        setError(result.message);
      }
    });
  }

  if (sources.length === 0) {
    return (
      <div>
        <p className="text-sm text-paper-muted">There are no expenses in the previous month to copy.</p>
        <div className="mt-6 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-paper-muted">
        Pick the ones to add to this month. They are added as pending, so you can mark them as paid later. An expense
        paid with another one stays linked only if you pick both.
      </p>

      {selectable.length > 0 ? (
        <div className="mt-4 flex gap-4 text-sm font-semibold text-leaf">
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={() => setSelected(new Set(selectable.map((item) => item.id)))}
          >
            Select all
          </button>
          <button type="button" className="underline underline-offset-4" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      ) : null}

      <ul className="mt-3 max-h-80 divide-y divide-paper-line overflow-y-auto border-y border-paper-line">
        {ordered.map((item) => {
          const added = alreadyAdded(item);
          const inputId = `copy-${item.id}`;
          return (
            <li key={item.id}>
              <label
                htmlFor={inputId}
                className={`flex min-h-14 cursor-pointer items-center gap-3 py-2 ${isChild(item) ? "pl-6" : ""}`}
              >
                <input
                  id={inputId}
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={(event) => toggle(item.id, event.target.checked)}
                  className="size-5 shrink-0 accent-leaf"
                />
                <CategoryBadge color={item.categoryColor} icon={item.categoryIcon} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{item.categoryName}</span>
                  {item.note || added ? (
                    <span className="block truncate text-xs text-paper-muted">
                      {item.note}
                      {item.note && added ? " · " : ""}
                      {added ? "Already added" : ""}
                    </span>
                  ) : null}
                </span>
                <span className="text-sm font-semibold tabular-nums">{formatCop(item.amountMinor)}</span>
              </label>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-sm text-paper-muted" aria-live="polite">
        {selectedItems.length === 0
          ? "Nothing selected"
          : `${selectedItems.length} selected · ${formatCop(selectedTotal)}`}
      </p>

      {error ? (
        <p role="alert" className="mt-3 rounded-field bg-clay-tint px-3 py-2.5 text-sm text-clay">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={pending || selectedItems.length === 0}>
          {selectedItems.length === 0
            ? "Add to this month"
            : `Add ${selectedItems.length} ${selectedItems.length === 1 ? "expense" : "expenses"}`}
        </Button>
      </div>
    </div>
  );
}
