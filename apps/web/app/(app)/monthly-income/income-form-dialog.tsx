"use client";

import {
  INCOME_NOTE_MAX_LENGTH,
  INCOME_TYPES,
  type IncomeInputErrors,
  type IncomeType,
} from "@finance-app/core/incomes";
import type { ValidationError } from "@finance-app/core";
import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/field";
import { useValidationMessage } from "@/lib/use-validation-message";

import { createIncome, updateIncome } from "./actions";

export type IncomeItem = {
  id: string;
  type: IncomeType;
  amountMinor: number;
  period: string;
  note: string;
};

type Props = {
  open: boolean;
  /** The income being edited, or null to create a new one. */
  income: IncomeItem | null;
  /** Month shown on the page; new incomes default to it. */
  defaultPeriod: string;
  onClose: () => void;
};

/** Keeps digits only, so "3.000.000" or "$ 3000000" both become 3000000. */
function parseAmount(text: string): number {
  const digits = text.replace(/\D/g, "");
  return digits === "" ? Number.NaN : Number(digits);
}

export function IncomeFormDialog({ open, income, ...rest }: Props) {
  const t = useTranslations("income");
  // The inner form is keyed by income so its state resets every time the dialog opens for another item.
  return (
    <Dialog open={open} title={income ? t("formEditTitle") : t("formNewTitle")} onClose={rest.onClose}>
      <IncomeForm key={income?.id ?? "new"} income={income} {...rest} />
    </Dialog>
  );
}

function IncomeForm({ income, defaultPeriod, onClose }: Omit<Props, "open">) {
  const t = useTranslations("income");
  const tCommon = useTranslations("common");
  const message = useValidationMessage();
  const [type, setType] = useState<IncomeType>(income?.type ?? "payroll");
  const [amount, setAmount] = useState(income ? String(income.amountMinor) : "");
  const [period, setPeriod] = useState(income?.period ?? defaultPeriod);
  const [note, setNote] = useState(income?.note ?? "");
  const [errors, setErrors] = useState<IncomeInputErrors>({});
  const [formError, setFormError] = useState<ValidationError | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    startTransition(async () => {
      const input = { type, amountMinor: parseAmount(amount), period, note };
      const result = income ? await updateIncome(income.id, input) : await createIncome(input);
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
        id="income-type"
        label={t("type")}
        value={type}
        onChange={(event) => setType(event.target.value as IncomeType)}
        options={INCOME_TYPES.map((value) => ({ value, label: t(`types.${value}`) }))}
        error={message(errors.type)}
      />

      <Input
        id="income-amount"
        label={t("amount")}
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        inputMode="numeric"
        placeholder="3000000"
        error={message(errors.amountMinor)}
        autoFocus
        required
      />

      <div>
        <Input
          id="income-period"
          label={t("period")}
          type="month"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          error={message(errors.period)}
          required
        />
        <p className="mt-1.5 text-xs text-paper-muted">{t("periodHint")}</p>
      </div>

      <Input
        id="income-note"
        label={t("note")}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={INCOME_NOTE_MAX_LENGTH + 10}
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
          {income ? t("save") : t("create")}
        </Button>
      </div>
    </form>
  );
}
