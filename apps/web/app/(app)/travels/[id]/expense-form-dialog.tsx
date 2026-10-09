"use client";

import { formatCop } from "@finance-app/core/expenses";
import {
  TRIP_EXPENSE_CATEGORIES,
  TRIP_EXPENSE_DESCRIPTION_MAX_LENGTH,
  splitAmount,
  type TripExpenseCategory,
  type TripExpenseInputErrors,
  type TripExpenseStatus,
} from "@finance-app/core/travels";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/field";
import { TRIP_CATEGORY_LABELS } from "@/lib/travel-labels";

import { createTripExpense, updateTripExpense } from "../actions";
import type { TripExpenseItem, TripPerson } from "./types";

type Props = {
  open: boolean;
  tripId: string;
  /** The expense being edited, or null to create a new one. */
  expense: TripExpenseItem | null;
  people: TripPerson[];
  isGroup: boolean;
  onClose: () => void;
};

/** Keeps digits only, so "3.000.000" or "$ 3000000" both become 3000000. */
function parseAmount(text: string): number {
  const digits = text.replace(/\D/g, "");
  return digits === "" ? Number.NaN : Number(digits);
}

export function ExpenseFormDialog({ open, expense, ...rest }: Props) {
  // The inner form is keyed by expense so its state resets every time the dialog opens for another one.
  return (
    <Dialog open={open} title={expense ? "Edit expense" : "New expense"} onClose={rest.onClose}>
      <ExpenseForm key={expense?.id ?? "new"} expense={expense} {...rest} />
    </Dialog>
  );
}

function ExpenseForm({ tripId, expense, people, isGroup, onClose }: Omit<Props, "open">) {
  const me = people[0]!;
  const [description, setDescription] = useState(expense?.description ?? "");
  const [category, setCategory] = useState<TripExpenseCategory>(expense?.category ?? "lodging");
  const [amount, setAmount] = useState(expense ? String(expense.amountMinor) : "");
  const [spentOn, setSpentOn] = useState(expense?.spentOn ?? "");
  const [status, setStatus] = useState<TripExpenseStatus>(expense?.status ?? "pending");
  const [paidById, setPaidById] = useState(expense?.paidById ?? me.id);
  const [shareIds, setShareIds] = useState<string[]>(expense?.shareIds ?? people.map((person) => person.id));
  const [errors, setErrors] = useState<TripExpenseInputErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const amountMinor = parseAmount(amount);
  const included = people.filter((person) => shareIds.includes(person.id));
  const perPerson = Number.isFinite(amountMinor) && included.length > 0 ? splitAmount(amountMinor, included.map((p) => p.id)) : null;

  function toggle(personId: string) {
    setShareIds((current) => (current.includes(personId) ? current.filter((id) => id !== personId) : [...current, personId]));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    startTransition(async () => {
      const input = {
        description,
        category,
        amountMinor,
        spentOn,
        status,
        paidById: status === "paid" ? paidById : null,
        // An individual trip is always just me; a group keeps the people in trip order.
        shareIds: isGroup ? people.filter((person) => shareIds.includes(person.id)).map((person) => person.id) : [me.id],
      };
      const result = expense ? await updateTripExpense(tripId, expense.id, input) : await createTripExpense(tripId, input);
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
        id="trip-expense-description"
        label="What is it?"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        maxLength={TRIP_EXPENSE_DESCRIPTION_MAX_LENGTH + 10}
        placeholder="Hotel"
        error={errors.description}
        autoFocus
        required
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          id="trip-expense-category"
          label="Category"
          value={category}
          onChange={(event) => setCategory(event.target.value as TripExpenseCategory)}
          options={TRIP_EXPENSE_CATEGORIES.map((value) => ({ value, label: TRIP_CATEGORY_LABELS[value] }))}
          error={errors.category}
        />
        <Input
          id="trip-expense-amount"
          label="Total amount (COP)"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="numeric"
          placeholder="1000000"
          error={errors.amountMinor}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="trip-expense-date"
          label="Date (optional)"
          type="date"
          value={spentOn}
          onChange={(event) => setSpentOn(event.target.value)}
          error={errors.spentOn}
        />
        <Select
          id="trip-expense-status"
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value as TripExpenseStatus)}
          options={[
            { value: "pending", label: "Pending" },
            { value: "paid", label: "Paid" },
          ]}
          error={errors.status}
        />
      </div>

      {isGroup && status === "paid" ? (
        <Select
          id="trip-expense-paid-by"
          label="Who paid?"
          value={paidById}
          onChange={(event) => setPaidById(event.target.value)}
          options={people.map((person) => ({ value: person.id, label: person.name }))}
          error={errors.paidById}
        />
      ) : null}

      {isGroup ? (
        <fieldset>
          <legend className="text-sm font-medium text-ink">Split between</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {people.map((person) => {
              const on = shareIds.includes(person.id);
              return (
                <button
                  key={person.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(person.id)}
                  className={`min-h-9 rounded-full border px-3 text-sm font-medium transition-colors ${
                    on
                      ? "border-leaf bg-leaf-tint text-leaf"
                      : "border-paper-line text-paper-muted line-through hover:bg-leaf-tint"
                  }`}
                >
                  {person.name}
                </button>
              );
            })}
          </div>
          {errors.shareIds ? <p className="mt-1.5 text-sm text-clay">{errors.shareIds}</p> : null}
          {perPerson ? (
            <p className="mt-2 text-sm text-paper-muted" data-testid="split-preview">
              {included.length} {included.length === 1 ? "person pays" : "people pay"} about{" "}
              <strong className="text-ink">{formatCop(Math.max(...Object.values(perPerson)))}</strong> each.
            </p>
          ) : null}
        </fieldset>
      ) : null}

      {formError ? (
        <p role="alert" className="rounded-field bg-clay-tint px-3 py-2.5 text-sm text-clay">
          {formError}
        </p>
      ) : null}

      <div className="flex justify-end gap-3 pt-1">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={pending}>
          {expense ? "Save changes" : "Add expense"}
        </Button>
      </div>
    </form>
  );
}
