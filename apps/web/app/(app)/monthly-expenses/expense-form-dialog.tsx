"use client";

import type { CategoryColor, CategoryIcon, CategoryType } from "@finance-app/core/categories";
import { EXPENSE_NOTE_MAX_LENGTH, formatCop, type ExpenseInputErrors } from "@finance-app/core/expenses";
import type { ValidationError } from "@finance-app/core";
import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/field";
import { useValidationMessage } from "@/lib/use-validation-message";

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
  /** The category's payment link or instructions; empty when it has none. */
  paymentInfo: string;
  /** Set on an installment of a debt that has no expense yet: it is shown, not stored. */
  upcomingDebt?: { debtId: string; period: string };
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
  const t = useTranslations("expenses");
  // The inner form is keyed by expense so its state resets every time the dialog opens for another item.
  return (
    <Dialog open={open} title={expense ? t("formEditTitle") : t("formNewTitle")} onClose={rest.onClose}>
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
  const t = useTranslations("expenses");
  const tCommon = useTranslations("common");
  const message = useValidationMessage();
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
  const [formError, setFormError] = useState<ValidationError | null>(null);
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
    if (hasChildren) return t("hintHasChildren");
    if (!sameMonth) return t("hintOtherMonth");
    if (candidates.length === 0) return t("hintNoCandidates");
    if (linkedTo) return t("hintLinked", { name: linkedTo.categoryName });
    return t("hintStandalone");
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
        label={t("category")}
        value={categoryId}
        onChange={(event) => setCategoryId(event.target.value)}
        options={categories.map((category) => ({ value: category.id, label: category.name }))}
        error={message(errors.categoryId)}
      />

      <Input
        id="expense-amount"
        label={t("amount")}
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        inputMode="numeric"
        placeholder="2000000"
        error={message(errors.amountMinor)}
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
            {t("alreadyPaid")}
          </label>
          {paid ? (
            <Input
              id="expense-paid-on"
              label={t("datePaid")}
              type="date"
              value={paidOn}
              onChange={(event) => setPaidOn(event.target.value)}
              error={message(errors.paidOn)}
              required
            />
          ) : (
            <p className="text-xs text-paper-muted">{t("savedPending")}</p>
          )}
        </div>
      )}

      <div>
        <Input
          id="expense-period"
          label={t("period")}
          type="month"
          value={period}
          onChange={(event) => handlePeriodChange(event.target.value)}
          error={message(errors.period)}
          required
        />
        <p className="mt-1.5 text-xs text-paper-muted">{t("periodHint")}</p>
      </div>

      <div>
        <Select
          id="expense-parent"
          label={t("paidWithLabel")}
          value={linked ? parentId : ""}
          onChange={(event) => setParentId(event.target.value)}
          disabled={!canLink}
          options={[
            { value: "", label: t("paidWithNone") },
            ...candidates.map((candidate) => ({
              value: candidate.id,
              label: `${candidate.categoryName} · ${formatCop(candidate.amountMinor)}${candidate.note ? ` · ${candidate.note}` : ""}`,
            })),
          ]}
          error={message(errors.parentId)}
        />
        <p className="mt-1.5 text-xs text-paper-muted">{parentHint()}</p>
      </div>

      <Input
        id="expense-note"
        label={t("note")}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={EXPENSE_NOTE_MAX_LENGTH + 10}
        error={message(errors.note)}
      />

      {formError ? (
        <p role="alert" className="rounded-field bg-clay-tint px-3 py-2.5 text-sm text-clay">
          {message(formError)}
        </p>
      ) : null}

      <div className="flex justify-end gap-3 pt-1">
        <Button variant="secondary" onClick={onClose}>
          {tCommon("cancel")}
        </Button>
        <Button type="submit" loading={pending}>
          {expense ? t("save") : t("create")}
        </Button>
      </div>
    </form>
  );
}
