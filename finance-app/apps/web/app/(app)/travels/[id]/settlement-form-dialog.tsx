"use client";

import type { TripSettlementInputErrors } from "@finance-app/core/travels";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/field";

import { createTripSettlement } from "../actions";
import type { TripPerson } from "./types";

type Props = {
  open: boolean;
  tripId: string;
  people: TripPerson[];
  onClose: () => void;
};

/** Keeps digits only, so "3.000.000" or "$ 3000000" both become 3000000. */
function parseAmount(text: string): number {
  const digits = text.replace(/\D/g, "");
  return digits === "" ? Number.NaN : Number(digits);
}

export function SettlementFormDialog({ open, ...rest }: Props) {
  return (
    <Dialog open={open} title="Record payment" onClose={rest.onClose}>
      <SettlementForm {...rest} />
    </Dialog>
  );
}

function SettlementForm({ tripId, people, onClose }: Omit<Props, "open">) {
  const [fromId, setFromId] = useState(people[1]?.id ?? people[0]!.id);
  const [toId, setToId] = useState(people[0]!.id);
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState("");
  const [errors, setErrors] = useState<TripSettlementInputErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const options = people.map((person) => ({ value: person.id, label: person.name }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    startTransition(async () => {
      const result = await createTripSettlement(tripId, { fromId, toId, amountMinor: parseAmount(amount), paidOn });
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
      <p className="text-sm text-paper-muted">
        Use this when someone transfers money to another person to settle what they owe.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          id="settlement-from"
          label="Paid by"
          value={fromId}
          onChange={(event) => setFromId(event.target.value)}
          options={options}
          error={errors.fromId}
        />
        <Select
          id="settlement-to"
          label="Received by"
          value={toId}
          onChange={(event) => setToId(event.target.value)}
          options={options}
          error={errors.toId}
        />
      </div>
      <Input
        id="settlement-amount"
        label="Amount (COP)"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        inputMode="numeric"
        placeholder="200000"
        error={errors.amountMinor}
        required
      />
      <Input
        id="settlement-date"
        label="Date (optional)"
        type="date"
        value={paidOn}
        onChange={(event) => setPaidOn(event.target.value)}
        error={errors.paidOn}
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
          Record payment
        </Button>
      </div>
    </form>
  );
}
