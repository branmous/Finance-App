"use client";

import type { CategoryColor, CategoryIcon, CategoryType } from "@finance-app/core/categories";
import { EXPENSE_NOTE_MAX_LENGTH, formatCop, type ExpenseInputErrors } from "@finance-app/core/expenses";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/field";

import { createExpense, updateExpense } from "./actions";

export type CategoryOption = { id: string; name: string; type: CategoryType };

export type ExpenseItem = {
  id: string;
  categoryId: string;
  amountMinor: number;
  period: string;
  /** null while the expense is tracked but not paid yet. */
  paidOn: string | null;
  note: string;
  /** The expense this one was paid with, or null when it stands alone. */
  parentId: string | null;
  categoryName: string;
  categoryColor: CategoryColor;
  categoryIcon: CategoryIcon;
};

type Props = {
  open: boolean;
  /** The expense being edited, or null to create a new one. */
  expense: ExpenseItem | null;
  categories: CategoryOption[];
  /** Month shown on the page; new expenses default to it. */
  defaultPeriod: string;
  /** Standalone expenses of the month shown on the page: the ones this expense can be paid with. */
  parentCandidates: ExpenseItem[];
  /** The expense being edited already has expenses paid with it, so it cannot be paid with another. */
  hasChildren: boolean;
  onClose: () => void;
};

function todayLocal(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Keeps digits only, so "2.000.000" or "$ 2000000" both become 2000000. */
function parseAmount(text: string): number {
  const digits = text.replace(/\D/g, "");
  return digits === "" ? Number.NaN : Number(digits);
}

export function ExpenseFormDialog({ open, expense, ...rest }: Props) {
  // The inner form is keyed by expense so its state resets every time the dialog opens for another item.
  return (
    <Dialog open={open} title={expense ? "Edit expense" : "New expense"} onClose={rest.onClose}>
      <ExpenseForm key={expense?.id ?? "new"} expense={expense} {...rest} />
    </Dialog>
  );
}

function ExpenseForm({
  expense,
  categories,
  defaultPeriod,
  parentCandidates,
  hasChildren,
  onClose,
}: Omit<Props, "open">) {
  const [categoryId, setCategoryId] = useState(expense?.categoryId ?? categories[0]?.id ?? "");
  const [amount, setAmount] = useState(expense ? String(expense.amountMinor) : "");
  // New expenses default to "already paid today"; an existing pending one starts unchecked.
  const [paid, setPaid] = useState(expense ? expense.paidOn !== null : true);
  const [paidOn, setPaidOn] = useState(expense?.paidOn ?? todayLocal());
  const [period, setPeriod] = useState(expense?.period ?? defaultPeriod);
  const [note, setNote] = useState(expense?.note ?? "");
  // "" = stands on its own.
  const [parentId, setParentId] = useState(expense?.parentId ?? "");
  const [errors, setErrors] = useState<ExpenseInputErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Only expenses of the month on screen can be picked, so the link always stays within one month.
  const candidates = parentCandidates.filter((candidate) => candidate.id !== expense?.id);
  const sameMonth = period === defaultPeriod;
  const canLink = !hasChildren && sameMonth && candidates.length > 0;
  const linkedTo = candidates.find((candidate) => candidate.id === parentId);
  const linked = canLink && linkedTo !== undefined;

  function handlePeriodChange(value: string) {
    setPeriod(value);
    if (value !== defaultPeriod) setParentId("");
  }

  function parentHint(): string {
    if (hasChildren) return "Other expenses were paid with this one, so it cannot be paid with another.";
    if (!sameMonth) return "Only expenses from the month you are viewing can be selected.";
    if (candidates.length === 0) return "There are no other expenses in this month yet.";
    if (linkedTo) return `Included in ${linkedTo.categoryName}'s amount, so it is not added again to the month total.`;
    return "Leave empty if it was paid on its own.";
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    startTransition(async () => {
      const input = {
        categoryId,
        amountMinor: parseAmount(amount),
        period,
        // A linked expense has no payment date of its own: it is paid with its parent.
        paidOn: paid && !linked ? paidOn : null,
        note,
        parentId: linked ? parentId : null,
      };
      const result = expense ? await updateExpense(expense.id, input) : await createExpense(input);
      if (result.ok) {
        onClose();
        return;
      }
      setErrors(result.errors ?? {});
      setFormError(result.message ?? null);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Select
        id="expense-category"
        label="Category"
        value={categoryId}
        onChange={(event) => setCategoryId(event.target.value)}
        options={categories.map((category) => ({ value: category.id, label: category.name }))}
        error={errors.categoryId}
      />

      <Input
        id="expense-amount"
        label="Amount paid (COP)"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        inputMode="numeric"
        placeholder="2000000"
        error={errors.amountMinor}
        autoFocus
        required
      />

      {linked ? null : (
        <div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={paid}
              onChange={(event) => setPaid(event.target.checked)}
              className="size-5 accent-leaf"
            />
            Already paid
          </label>
          {paid ? (
            <Input
              id="expense-paid-on"
              label="Date paid"
              type="date"
              value={paidOn}
              onChange={(event) => setPaidOn(event.target.value)}
              error={errors.paidOn}
              required
            />
          ) : (
            <p className="text-xs text-paper-muted">
              Saved as pending: it counts toward the month but is not marked as paid yet.
            </p>
          )}
        </div>
      )}

      <div>
        <Input
          id="expense-period"
          label="Counts toward month"
          type="month"
          value={period}
          onChange={(event) => handlePeriodChange(event.target.value)}
          error={errors.period}
          required
        />
        <p className="mt-1.5 text-xs text-paper-muted">The month this expense belongs to, even if you paid it later.</p>
      </div>

      <div>
        <Select
          id="expense-parent"
          label="Paid with (optional)"
          value={linked ? parentId : ""}
          onChange={(event) => setParentId(event.target.value)}
          disabled={!canLink}
          options={[
            { value: "", label: "None, it stands on its own" },
            ...candidates.map((candidate) => ({
              value: candidate.id,
              label: `${candidate.categoryName} · ${formatCop(candidate.amountMinor)}${candidate.note ? ` · ${candidate.note}` : ""}`,
            })),
          ]}
          error={errors.parentId}
        />
        <p className="mt-1.5 text-xs text-paper-muted">{parentHint()}</p>
      </div>

      <Input
        id="expense-note"
        label="Note (optional)"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={EXPENSE_NOTE_MAX_LENGTH + 10}
        error={errors.note}
      />

      {formError ? (
        <p role="alert" className="rounded-field bg-clay-tint px-3 py-2.5 text-sm text-clay">
          {formError}
        </p>
      ) : null}

      <div className="flex justify-end gap-3 pt-1">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {expense ? "Save changes" : "Add expense"}
        </Button>
      </div>
    </form>
  );
}
