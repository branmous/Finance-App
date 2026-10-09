"use server";

import {
  validateTripDetailsInput,
  validateTripExpenseInput,
  validateTripInput,
  validateTripPersonName,
  validateTripSettlementInput,
  isUuid,
  validationError,
  type TripExpenseInputErrors,
  type TripInputErrors,
  type TripSettlementInputErrors,
  type ValidationError,
} from "@finance-app/core";
import {
  TripParticipantInUseError,
  TripParticipantNotFoundError,
  TripParticipantRuleError,
  createTripRepository,
} from "@finance-app/db";
import { revalidatePath } from "next/cache";

import { SESSION_EXPIRED } from "@/lib/action-errors";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export type TripActionResult =
  | { ok: true; id?: string }
  | { ok: false; errors?: TripInputErrors; message?: ValidationError };

export type TripExpenseActionResult =
  | { ok: true }
  | { ok: false; errors?: TripExpenseInputErrors; message?: ValidationError };

export type TripSettlementActionResult =
  | { ok: true }
  | { ok: false; errors?: TripSettlementInputErrors; message?: ValidationError };

type SimpleResult = { ok: true } | { ok: false; message: ValidationError };

const NOT_FOUND = validationError("tripNotFound");
const EXPENSE_NOT_FOUND = validationError("expenseNotFound");
const PERSON_NOT_FOUND = validationError("personNotInTrip");

function refresh(tripId?: string) {
  revalidatePath("/travels");
  if (tripId) revalidatePath(`/travels/${tripId}`);
}

/** Maps the repository's expected failures to a message; anything else is a real bug and is rethrown. */
function personMessage(error: unknown): ValidationError {
  if (error instanceof TripParticipantNotFoundError) return PERSON_NOT_FOUND;
  if (error instanceof TripParticipantInUseError || error instanceof TripParticipantRuleError) {
    return validationError(error.code);
  }
  throw error;
}

// ---------------------------------------------------------------- trips

export async function createTrip(input: unknown): Promise<TripActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  const parsed = validateTripInput(input);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  const trip = await createTripRepository(getDb()).create(user.id, parsed.value);
  refresh();
  return { ok: true, id: trip.id };
}

export async function updateTrip(id: string, input: unknown): Promise<TripActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  const parsed = validateTripDetailsInput(input);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  const updated = await createTripRepository(getDb()).update(user.id, id, parsed.value);
  if (!updated) return { ok: false, message: NOT_FOUND };
  refresh(id);
  return { ok: true };
}

export async function deleteTrip(id: string): Promise<SimpleResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  const removed = await createTripRepository(getDb()).remove(user.id, id);
  if (!removed) return { ok: false, message: NOT_FOUND };
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------- people

export async function addTripPerson(tripId: string, name: unknown): Promise<SimpleResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  const parsed = validateTripPersonName(name);
  if (!parsed.ok) return { ok: false, message: parsed.error };

  try {
    const added = await createTripRepository(getDb()).addParticipant(user.id, tripId, parsed.value);
    if (!added) return { ok: false, message: NOT_FOUND };
  } catch (error) {
    return { ok: false, message: personMessage(error) };
  }
  refresh(tripId);
  return { ok: true };
}

export async function removeTripPerson(tripId: string, personId: string): Promise<SimpleResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  try {
    const removed = await createTripRepository(getDb()).removeParticipant(user.id, tripId, personId);
    if (!removed) return { ok: false, message: PERSON_NOT_FOUND };
  } catch (error) {
    return { ok: false, message: personMessage(error) };
  }
  refresh(tripId);
  return { ok: true };
}

// ---------------------------------------------------------------- expenses

export async function createTripExpense(tripId: string, input: unknown): Promise<TripExpenseActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  const parsed = validateTripExpenseInput(input);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  try {
    const created = await createTripRepository(getDb()).createExpense(user.id, tripId, parsed.value);
    if (!created) return { ok: false, message: NOT_FOUND };
  } catch (error) {
    return { ok: false, message: personMessage(error) };
  }
  refresh(tripId);
  return { ok: true };
}

export async function updateTripExpense(
  tripId: string,
  expenseId: string,
  input: unknown,
): Promise<TripExpenseActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  const parsed = validateTripExpenseInput(input);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  try {
    const updated = await createTripRepository(getDb()).updateExpense(user.id, expenseId, parsed.value);
    if (!updated) return { ok: false, message: EXPENSE_NOT_FOUND };
  } catch (error) {
    return { ok: false, message: personMessage(error) };
  }
  refresh(tripId);
  return { ok: true };
}

export async function deleteTripExpense(tripId: string, expenseId: string): Promise<SimpleResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  const removed = await createTripRepository(getDb()).removeExpense(user.id, expenseId);
  if (!removed) return { ok: false, message: EXPENSE_NOT_FOUND };
  refresh(tripId);
  return { ok: true };
}

/** Quick toggle on the detail screen: who is included in an expense. */
export async function setTripExpenseShares(
  tripId: string,
  expenseId: string,
  shareIds: unknown,
): Promise<SimpleResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  if (!Array.isArray(shareIds) || shareIds.length === 0 || !shareIds.every(isUuid)) {
    return { ok: false, message: validationError("chooseSharers") };
  }

  try {
    const done = await createTripRepository(getDb()).setExpenseShares(user.id, expenseId, shareIds);
    if (!done) return { ok: false, message: EXPENSE_NOT_FOUND };
  } catch (error) {
    return { ok: false, message: personMessage(error) };
  }
  refresh(tripId);
  return { ok: true };
}

/** Quick toggle on the detail screen: mark an expense paid by someone, or back to pending. */
export async function setTripExpensePayment(
  tripId: string,
  expenseId: string,
  paidById: string | null,
): Promise<SimpleResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  if (paidById !== null && !isUuid(paidById)) return { ok: false, message: validationError("choosePayer") };

  try {
    const done = await createTripRepository(getDb()).setExpensePayment(user.id, expenseId, {
      status: paidById ? "paid" : "pending",
      paidById,
    });
    if (!done) return { ok: false, message: EXPENSE_NOT_FOUND };
  } catch (error) {
    return { ok: false, message: personMessage(error) };
  }
  refresh(tripId);
  return { ok: true };
}

// ---------------------------------------------------------------- settlements

export async function createTripSettlement(tripId: string, input: unknown): Promise<TripSettlementActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  const parsed = validateTripSettlementInput(input);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  try {
    const created = await createTripRepository(getDb()).createSettlement(user.id, tripId, parsed.value);
    if (!created) return { ok: false, message: NOT_FOUND };
  } catch (error) {
    return { ok: false, message: personMessage(error) };
  }
  refresh(tripId);
  return { ok: true };
}

export async function deleteTripSettlement(tripId: string, settlementId: string): Promise<SimpleResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  const removed = await createTripRepository(getDb()).removeSettlement(user.id, settlementId);
  if (!removed) return { ok: false, message: validationError("paymentNotFound") };
  refresh(tripId);
  return { ok: true };
}
