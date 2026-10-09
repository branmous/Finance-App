"use client";

import type { ValidationError } from "@finance-app/core";
import {
  TRIP_KINDS,
  TRIP_NAME_MAX_LENGTH,
  type TripInputErrors,
  type TripKind,
} from "@finance-app/core/travels";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/field";
import { useValidationMessage } from "@/lib/use-validation-message";

import { createTrip, updateTrip } from "./actions";

export type TripDetails = { id: string; name: string; startDate: string | null; endDate: string | null };

type Props = {
  open: boolean;
  /** The trip being edited (name and dates only), or null to create a new one. */
  trip: TripDetails | null;
  onClose: () => void;
};

export function TripFormDialog({ open, trip, onClose }: Props) {
  const t = useTranslations("travels.form");
  // The inner form is keyed by trip so its state resets every time the dialog opens for another one.
  return (
    <Dialog open={open} title={trip ? t("editTitle") : t("newTitle")} onClose={onClose}>
      <TripForm key={trip?.id ?? "new"} trip={trip} onClose={onClose} />
    </Dialog>
  );
}

function TripForm({ trip, onClose }: Omit<Props, "open">) {
  const t = useTranslations("travels.form");
  const tKinds = useTranslations("travels.kinds");
  const tCommon = useTranslations("common");
  const message = useValidationMessage();
  const router = useRouter();
  // The first person is always "me"; the default name follows the language the form was opened in.
  const meName = t("meName");
  const [name, setName] = useState(trip?.name ?? "");
  const [kind, setKind] = useState<TripKind>("individual");
  const [people, setPeople] = useState(`${meName}, `);
  const [startDate, setStartDate] = useState(trip?.startDate ?? "");
  const [endDate, setEndDate] = useState(trip?.endDate ?? "");
  const [errors, setErrors] = useState<TripInputErrors>({});
  const [formError, setFormError] = useState<ValidationError | null>(null);
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

      const participants = kind === "individual" ? [meName] : people.split(",");
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
        label={t("name")}
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={TRIP_NAME_MAX_LENGTH + 10}
        placeholder={t("namePlaceholder")}
        error={message(errors.name)}
        autoFocus
        required
      />

      {trip ? null : (
        <>
          <Select
            id="trip-kind"
            label={t("type")}
            value={kind}
            onChange={(event) => setKind(event.target.value as TripKind)}
            options={TRIP_KINDS.map((value) => ({ value, label: tKinds(value) }))}
            error={message(errors.kind)}
          />
          {kind === "group" ? (
            <div>
              <Input
                id="trip-people"
                label={t("people")}
                value={people}
                onChange={(event) => setPeople(event.target.value)}
                placeholder={t("peoplePlaceholder")}
                error={message(errors.participants)}
              />
              <p className="mt-1.5 text-xs text-paper-muted">{t("peopleHint")}</p>
            </div>
          ) : (
            <p className="text-sm text-paper-muted">{t("individualHint")}</p>
          )}
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="trip-start"
          label={t("startDate")}
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          error={message(errors.startDate)}
        />
        <Input
          id="trip-end"
          label={t("endDate")}
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          error={message(errors.endDate)}
        />
      </div>

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
          {trip ? t("save") : t("create")}
        </Button>
      </div>
    </form>
  );
}
