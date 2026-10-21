"use client";

import type { CategoryColor, CategoryIcon } from "@finance-app/core/categories";
import {
  DEBT_MAX_INSTALLMENTS,
  DEBT_NOTE_MAX_LENGTH,
  deferredInstallmentMinor,
  monthsBetween,
  type DebtInputErrors,
  type DebtKind,
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
  kind: DebtKind;
  /** The monthly payment; for a deferred debt, the base one (the last may differ). */
  installmentMinor: number;
  /** The deferred total; null on a monthly debt. */
  totalMinor: number | null;
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
  // The kind is picked when the debt is registered and never changes afterwards.
  const [kind, setKind] = useState<DebtKind>(debt?.kind ?? "monthly");
  const [amount, setAmount] = useState(debt && debt.kind === "monthly" ? String(debt.installmentMinor) : "");
  const [totalAmount, setTotalAmount] = useState(debt?.totalMinor != null ? String(debt.totalMinor) : "");
  const [months, setMonths] = useState(debt && debt.kind === "deferred" ? String(debt.totalInstallments) : "");
  const [startPeriod, setStartPeriod] = useState(debt?.startPeriod ?? currentPeriod());
  const [endPeriod, setEndPeriod] = useState(
    debt ? shiftPeriod(debt.startPeriod, debt.totalInstallments - 1) : "",
  );
  const [alreadyPaid, setAlreadyPaid] = useState("0");
  const [note, setNote] = useState(debt?.note ?? "");
  const [errors, setErrors] = useState<DebtInputErrors>({});
  const [formError, setFormError] = useState<ValidationError | null>(null);
  const [pending, startTransition] = useTransition();

  const deferred = kind === "deferred";
  // Paid installments keep their amount, so the total and the months stay put until they are unmarked.
  const locked = deferred && debt !== null && debt.paidPeriods.length > 0;

  const deferredTotal = parseAmount(totalAmount);
  const deferredMonths = months.trim() === "" ? Number.NaN : Number(months);
  const deferredReady =
    Number.isSafeInteger(deferredTotal) &&
    deferredTotal > 0 &&
    Number.isInteger(deferredMonths) &&
    deferredMonths >= 1 &&
    deferredMonths <= DEBT_MAX_INSTALLMENTS &&
    isValidPeriod(startPeriod) &&
    deferredInstallmentMinor(deferredTotal, deferredMonths) >= 1;

  const total = deferred
    ? deferredReady
      ? deferredMonths
      : 0
    : isValidPeriod(startPeriod) && isValidPeriod(endPeriod)
      ? monthsBetween(startPeriod, endPeriod)
      : 0;
  const installment = parseAmount(amount);

  function summary(): string | null {
    if (total === 0) return null;
    const count = t("summaryCount", { count: total });
    if (deferred) {
      const base = deferredInstallmentMinor(deferredTotal, deferredMonths);
      const last = deferredTotal - base * (deferredMonths - 1);
      const month = format.month(shiftPeriod(startPeriod, deferredMonths - 1));
      return last === base
        ? t("summaryDeferredEven", { count, installment: formatCop(base), month })
        : t("summaryDeferredUneven", { count, installment: formatCop(base), last: formatCop(last), month });
    }
    return Number.isNaN(installment)
      ? count
      : t("summaryFull", { count, total: formatCop(installment * total), month: format.month(endPeriod) });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    startTransition(async () => {
      const common = {
        kind,
        name,
        categoryId,
        startPeriod,
        alreadyPaid: debt ? 0 : Number(alreadyPaid === "" ? 0 : alreadyPaid),
        note,
      };
      const input = deferred
        ? { ...common, totalMinor: deferredTotal, months: deferredMonths }
        : { ...common, installmentMinor: installment, endPeriod };
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
      {debt ? null : (
        <fieldset>
          <legend className="text-sm font-medium">{t("kindLabel")}</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["monthly", "deferred"] as const).map((value) => (
              <label key={value} className="relative cursor-pointer">
                <input
                  type="radio"
                  name="debt-kind"
                  value={value}
                  checked={kind === value}
                  onChange={() => setKind(value)}
                  className="peer sr-only"
                />
                <span className="flex min-h-11 items-center justify-center rounded-field border border-paper-line px-3 text-center text-sm font-medium text-paper-muted peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-leaf">
                  {value === "monthly" ? t("kindMonthly") : t("kindDeferred")}
                </span>
              </label>
            ))}
          </div>
          {errors.kind ? <p className="mt-1.5 text-sm text-clay">{message(errors.kind)}</p> : null}
        </fieldset>
      )}

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

      {deferred ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="debt-total"
              label={t("totalAmount")}
              value={totalAmount}
              onChange={(event) => setTotalAmount(event.target.value)}
              inputMode="numeric"
              placeholder="1200000"
              error={message(errors.totalMinor)}
              disabled={locked}
              required
            />
            <Input
              id="debt-months"
              label={t("monthsCount")}
              type="number"
              min={1}
              max={DEBT_MAX_INSTALLMENTS}
              value={months}
              onChange={(event) => setMonths(event.target.value)}
              error={message(errors.months)}
              disabled={locked}
              required
            />
          </div>
          {locked ? <p className="-mt-3 text-xs text-paper-muted">{t("lockedHint")}</p> : null}
          <Input
            id="debt-start"
            label={t("firstPayment")}
            type="month"
            value={startPeriod}
            onChange={(event) => setStartPeriod(event.target.value)}
            error={message(errors.startPeriod)}
            required
          />
        </>
      ) : (
        <>
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
        </>
      )}
      <p className="-mt-3 min-h-5 text-sm text-paper-muted" aria-live="polite" data-testid="debt-summary">
        {summary() ?? (deferred ? t("summaryDeferredHint", { max: DEBT_MAX_INSTALLMENTS }) : t("summaryHint", { max: DEBT_MAX_INSTALLMENTS }))}
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
