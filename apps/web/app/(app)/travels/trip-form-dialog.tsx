"use client";

import {
  TRIP_KINDS,
  TRIP_NAME_MAX_LENGTH,
  type TripInputErrors,
  type TripKind,
} from "@finance-app/core/travels";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/field";
import { TRIP_KIND_LABELS } from "@/lib/travel-labels";

import { createTrip, updateTrip } from "./actions";

export type TripDetails = { id: string; name: string; startDate: string | null; endDate: string | null };

type Props = {
  open: boolean;
  /** The trip being edited (name and dates only), or null to create a new one. */
  trip: TripDetails | null;
  onClose: () => void;
};

export function TripFormDialog({ open, trip, onClose }: Props) {
  // The inner form is keyed by trip so its state resets every time the dialog opens for another one.
  return (
    <Dialog open={open} title={trip ? "Edit trip" : "New trip"} onClose={onClose}>
      <TripForm key={trip?.id ?? "new"} trip={trip} onClose={onClose} />
    </Dialog>
  );
}

function TripForm({ trip, onClose }: Omit<Props, "open">) {
  const router = useRouter();
  const [name, setName] = useState(trip?.name ?? "");
  const [kind, setKind] = useState<TripKind>("individual");
  const [people, setPeople] = useState("Me, ");
  const [startDate, setStartDate] = useState(trip?.startDate ?? "");
  const [endDate, setEndDate] = useState(trip?.endDate ?? "");
  const [errors, setErrors] = useState<TripInputErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    startTransition(async () => {
      const details = { name, startDate, endDate };
      if (trip) {
        const result = await updateTrip(trip.id, details);
        if (result.ok) {
          onClose();
          return;
        }
        setErrors(result.errors ?? {});
        setFormError(result.message ?? null);
        return;
      }

      const participants = kind === "individual" ? ["Me"] : people.split(",");
      const result = await createTrip({ ...details, kind, participants });
      if (result.ok && result.id) {
        onClose();
        router.push(`/travels/${result.id}`);
        return;
      }
      setErrors(result.ok ? {} : (result.errors ?? {}));
      setFormError(result.ok ? null : (result.message ?? null));
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        id="trip-name"
        label="Trip name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={TRIP_NAME_MAX_LENGTH + 10}
        placeholder="Punta Cana"
        error={errors.name}
        autoFocus
        required
      />

      {trip ? null : (
        <>
          <Select
            id="trip-kind"
            label="Type"
            value={kind}
            onChange={(event) => setKind(event.target.value as TripKind)}
            options={TRIP_KINDS.map((value) => ({ value, label: TRIP_KIND_LABELS[value] }))}
            error={errors.kind}
          />
          {kind === "group" ? (
            <div>
              <Input
                id="trip-people"
                label="People going"
                value={people}
                onChange={(event) => setPeople(event.target.value)}
                placeholder="Me, Ana, Leo"
                error={errors.participants}
              />
              <p className="mt-1.5 text-xs text-paper-muted">
                Separate names with commas. The first one is you; you can add more people later.
              </p>
            </div>
          ) : (
            <p className="text-sm text-paper-muted">An individual trip is all yours: every expense is counted for you.</p>
          )}
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="trip-start"
          label="Start date (optional)"
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          error={errors.startDate}
        />
        <Input
          id="trip-end"
          label="End date (optional)"
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          error={errors.endDate}
        />
      </div>

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
          {trip ? "Save changes" : "Create trip"}
        </Button>
      </div>
    </form>
  );
}
