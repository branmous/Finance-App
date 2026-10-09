"use client";

import type { CategoryColor, CategoryIcon } from "@finance-app/core/categories";
import {
  DEBT_MAX_INSTALLMENTS,
  DEBT_NOTE_MAX_LENGTH,
  monthsBetween,
  type DebtInputErrors,
} from "@finance-app/core/debts";
import { currentPeriod, formatCop, isValidPeriod, shiftPeriod } from "@finance-app/core/expenses";
import type { ValidationError } from "@finance-app/core";
import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/field";
import { useFormatters } from "@/lib/format";
import { useValidationMessage } from "@/lib/use-validation-message";

import type { CategoryOption } from "../monthly-expenses/expense-form-dialog";
import { createDebt, updateDebt } from "./actions";

export type DebtItem = {
  id: string;
  name: string;
  categoryId: string;
  installmentMinor: number;
  startPeriod: string;
  totalInstallments: number;
  note: string;
  /** Months whose installment is paid, oldest first. */
  paidPeriods: string[];
  categoryName: string;
  categoryColor: CategoryColor;
  categoryIcon: CategoryIcon;
};

type Props = {
  open: boolean;
  /** The debt being edited, or null to register a new one. */
  debt: DebtItem | null;
  categories: CategoryOption[];
  onClose: () => void;
};

/** Keeps digits only, so "1.200.000" or "$ 300" both become numbers. */
function parseAmount(text: string): number {
  const digits = text.replace(/\D/g, "");
  return digits === "" ? Number.NaN : Number(digits);
}

export function DebtFormDialog({ open, debt, ...rest }: Props) {
  const t = useTranslations("debts");
  // The inner form is keyed by debt so its state resets every time the dialog opens for another item.
  return (
    <Dialog open={open} title={debt ? t("formEditTitle") : t("formNewTitle")} onClose={rest.onClose}>
      <DebtForm key={debt?.id ?? "new"} debt={debt} {...rest} />
    </Dialog>
  );
}

function DebtForm({ debt, categories, onClose }: Omit<Props, "open">) {
  const t = useTranslations("debts");
  const tCommon = useTranslations("common");
  const message = useValidationMessage();
  const format = useFormatters();
  const [name, setName] = useState(debt?.name ?? "");
  const [categoryId, setCategoryId] = useState(debt?.categoryId ?? categories[0]?.id ?? "");
  const [amount, setAmount] = useState(debt ? String(debt.installmentMinor) : "");
  const [startPeriod, setStartPeriod] = useState(debt?.startPeriod ?? currentPeriod());
  const [endPeriod, setEndPeriod] = useState(
    debt ? shiftPeriod(debt.startPeriod, debt.totalInstallments - 1) : "",
  );
  const [alreadyPaid, setAlreadyPaid] = useState("0");
  const [note, setNote] = useState(debt?.note ?? "");
  const [errors, setErrors] = useState<DebtInputErrors>({});
  const [formError, setFormError] = useState<ValidationError | null>(null);
  const [pending, startTransition] = useTransition();

  const total = isValidPeriod(startPeriod) && isValidPeriod(endPeriod) ? monthsBetween(startPeriod, endPeriod) : 0;
  const installment = parseAmount(amount);

  function summary(): string | null {
    if (total === 0) return null;
    const count = t("summaryCount", { count: total });
    return Number.isNaN(installment)
      ? count
      : t("summaryFull", { count, total: formatCop(installment * total), month: format.month(endPeriod) });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    startTransition(async () => {
      const input = {
        name,
        categoryId,
        installmentMinor: installment,
        startPeriod,
        endPeriod,
        alreadyPaid: debt ? 0 : Number(alreadyPaid === "" ? 0 : alreadyPaid),
        note,
      };
      const result = debt ? await updateDebt(debt.id, input) : await createDebt(input);
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
      <Input
        id="debt-name"
        label={t("name")}
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={t("namePlaceholder")}
        error={message(errors.name)}
        autoFocus
        required
      />

      <Select
        id="debt-category"
        label={t("category")}
        value={categoryId}
        onChange={(event) => setCategoryId(event.target.value)}
        options={categories.map((category) => ({ value: category.id, label: category.name }))}
        error={message(errors.categoryId)}
      />

      <Input
        id="debt-amount"
        label={t("monthlyPayment")}
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        inputMode="numeric"
        placeholder="300000"
        error={message(errors.installmentMinor)}
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          id="debt-start"
          label={t("firstPayment")}
          type="month"
          value={startPeriod}
          onChange={(event) => setStartPeriod(event.target.value)}
          error={message(errors.startPeriod)}
          required
        />
        <Input
          id="debt-end"
          label={t("lastPayment")}
          type="month"
          value={endPeriod}
          onChange={(event) => setEndPeriod(event.target.value)}
          error={message(errors.endPeriod)}
          required
        />
      </div>
      <p className="-mt-3 min-h-5 text-sm text-paper-muted" aria-live="polite" data-testid="debt-summary">
        {summary() ?? t("summaryHint", { max: DEBT_MAX_INSTALLMENTS })}
      </p>

      {debt ? null : (
        <div>
          <Input
            id="debt-paid"
            label={t("alreadyPaid")}
            type="number"
            min={0}
            max={total || undefined}
            value={alreadyPaid}
            onChange={(event) => setAlreadyPaid(event.target.value)}
            error={message(errors.alreadyPaid)}
          />
          <p className="mt-1.5 text-xs text-paper-muted">{t("alreadyPaidHint")}</p>
        </div>
      )}

      <Input
        id="debt-note"
        label={t("note")}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={DEBT_NOTE_MAX_LENGTH + 10}
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
          {debt ? t("save") : t("create")}
        </Button>
      </div>
    </form>
  );
}
