import { isUuid, isValidDate } from "../expenses/expense";
import { validationError, type ValidationError } from "../validation";

export const TRIP_NAME_MAX_LENGTH = 80;
export const TRIP_PERSON_NAME_MAX_LENGTH = 40;
export const TRIP_EXPENSE_DESCRIPTION_MAX_LENGTH = 80;
export const TRIP_MAX_PARTICIPANTS = 50;

export const TRIP_KINDS = ["individual", "group"] as const;
export type TripKind = (typeof TRIP_KINDS)[number];

export const TRIP_EXPENSE_CATEGORIES = ["flights", "lodging", "transport", "food", "activities", "other"] as const;
export type TripExpenseCategory = (typeof TRIP_EXPENSE_CATEGORIES)[number];

export const TRIP_EXPENSE_STATUSES = ["pending", "paid"] as const;
export type TripExpenseStatus = (typeof TRIP_EXPENSE_STATUSES)[number];

function isPositiveAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

/** Blank or missing means "no date"; anything else must be a real YYYY-MM-DD date. */
function parseOptionalDate(value: unknown): { ok: true; value: string | null } | { ok: false } {
  if (value == null || (typeof value === "string" && value.trim() === "")) return { ok: true, value: null };
  return isValidDate(value) ? { ok: true, value } : { ok: false };
}

// ---------------------------------------------------------------- trip

export type TripInput = {
  name: string;
  kind: TripKind;
  startDate: string | null;
  endDate: string | null;
  /** Names of the people going. Individual trips have exactly one (me); group trips 2 or more, the first is me. */
  participants: string[];
};

export type TripInputErrors = Partial<Record<keyof TripInput, ValidationError>>;

export type TripValidationResult = { ok: true; value: TripInput } | { ok: false; errors: TripInputErrors };

export type TripDetailsInput = Pick<TripInput, "name" | "startDate" | "endDate">;

type DetailsErrors = Partial<Record<keyof TripDetailsInput, ValidationError>>;

/** Name and dates, shared by creating a trip and editing one. Failures are written into `errors`. */
function readTripDetails(raw: Record<string, unknown>, errors: DetailsErrors): TripDetailsInput {
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (name === "") errors.name = validationError("enterTripName");
  else if (name.length > TRIP_NAME_MAX_LENGTH) errors.name = validationError("nameTooLong", { max: TRIP_NAME_MAX_LENGTH });

  const start = parseOptionalDate(raw.startDate);
  const end = parseOptionalDate(raw.endDate);
  if (!start.ok) errors.startDate = validationError("invalidStartDate");
  if (!end.ok) errors.endDate = validationError("invalidEndDate");
  if (start.ok && end.ok && start.value && end.value && end.value < start.value) {
    errors.endDate = validationError("endDateBeforeStart");
  }

  return { name, startDate: start.ok ? start.value : null, endDate: end.ok ? end.value : null };
}

export type TripDetailsValidationResult =
  | { ok: true; value: TripDetailsInput }
  | { ok: false; errors: DetailsErrors };

export function validateTripDetailsInput(input: unknown): TripDetailsValidationResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, errors: { name: validationError("tripDataRequired") } };
  }
  const errors: DetailsErrors = {};
  const value = readTripDetails(input as Record<string, unknown>, errors);
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value };
}

export function validateTripInput(input: unknown): TripValidationResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, errors: { name: validationError("tripDataRequired") } };
  }

  const raw = input as Record<string, unknown>;
  const errors: TripInputErrors = {};

  const details = readTripDetails(raw, errors);

  if (typeof raw.kind !== "string" || !(TRIP_KINDS as readonly string[]).includes(raw.kind)) {
    errors.kind = validationError("chooseTripType");
  }

  const participants: string[] = [];
  if (Array.isArray(raw.participants)) {
    for (const item of raw.participants) {
      if (typeof item === "string" && item.trim() !== "") participants.push(item.trim());
    }
  }
  if (participants.some((person) => person.length > TRIP_PERSON_NAME_MAX_LENGTH)) {
    errors.participants = validationError("personNameTooLong", { max: TRIP_PERSON_NAME_MAX_LENGTH });
  } else if (participants.length > TRIP_MAX_PARTICIPANTS) {
    errors.participants = validationError("tooManyPeople", { max: TRIP_MAX_PARTICIPANTS });
  } else if (new Set(participants.map((person) => person.toLowerCase())).size !== participants.length) {
    errors.participants = validationError("duplicatePeople");
  } else if (raw.kind === "group" && participants.length < 2) {
    errors.participants = validationError("groupNeedsTwo");
  } else if (raw.kind === "individual" && participants.length !== 1) {
    errors.participants = validationError("individualOnlyYou");
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      ...details,
      kind: raw.kind as TripKind,
      participants,
    },
  };
}

// ---------------------------------------------------------------- person

export type TripPersonResult = { ok: true; value: string } | { ok: false; error: ValidationError };

export function validateTripPersonName(input: unknown): TripPersonResult {
  const name = typeof input === "string" ? input.trim() : "";
  if (name === "") return { ok: false, error: validationError("enterName") };
  if (name.length > TRIP_PERSON_NAME_MAX_LENGTH) {
    return { ok: false, error: validationError("nameTooLong", { max: TRIP_PERSON_NAME_MAX_LENGTH }) };
  }
  return { ok: true, value: name };
}

// ---------------------------------------------------------------- expense

export type TripExpenseInput = {
  description: string;
  category: TripExpenseCategory;
  /** Whole pesos; never a float. */
  amountMinor: number;
  spentOn: string | null;
  status: TripExpenseStatus;
  /** Who paid. Required when paid, null while pending. */
  paidById: string | null;
  /** People who split this expense; leaving someone out means they do not pay for it. */
  shareIds: string[];
};

export type TripExpenseInputErrors = Partial<Record<keyof TripExpenseInput, ValidationError>>;

export type TripExpenseValidationResult =
  | { ok: true; value: TripExpenseInput }
  | { ok: false; errors: TripExpenseInputErrors };

export function validateTripExpenseInput(input: unknown): TripExpenseValidationResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, errors: { amountMinor: validationError("expenseDataRequired") } };
  }

  const raw = input as Record<string, unknown>;
  const errors: TripExpenseInputErrors = {};

  const description = typeof raw.description === "string" ? raw.description.trim() : "";
  if (description === "") errors.description = validationError("enterExpenseDescription");
  else if (description.length > TRIP_EXPENSE_DESCRIPTION_MAX_LENGTH) {
    errors.description = validationError("descriptionTooLong", { max: TRIP_EXPENSE_DESCRIPTION_MAX_LENGTH });
  }

  if (typeof raw.category !== "string" || !(TRIP_EXPENSE_CATEGORIES as readonly string[]).includes(raw.category)) {
    errors.category = validationError("chooseCategory");
  }

  if (!isPositiveAmount(raw.amountMinor)) errors.amountMinor = validationError("amountPositive");

  const spent = parseOptionalDate(raw.spentOn);
  if (!spent.ok) errors.spentOn = validationError("invalidDate");

  if (typeof raw.status !== "string" || !(TRIP_EXPENSE_STATUSES as readonly string[]).includes(raw.status)) {
    errors.status = validationError("chooseStatus");
  }

  let paidById: string | null = null;
  if (raw.status === "paid") {
    if (isUuid(raw.paidById)) paidById = raw.paidById;
    else errors.paidById = validationError("choosePayer");
  }

  const shareIds = Array.isArray(raw.shareIds) ? raw.shareIds : [];
  if (shareIds.length === 0 || !shareIds.every(isUuid) || new Set(shareIds).size !== shareIds.length) {
    errors.shareIds = validationError("chooseSharers");
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      description,
      category: raw.category as TripExpenseCategory,
      amountMinor: raw.amountMinor as number,
      spentOn: spent.ok ? spent.value : null,
      status: raw.status as TripExpenseStatus,
      paidById,
      shareIds: shareIds as string[],
    },
  };
}

// ---------------------------------------------------------------- settlement

export type TripSettlementInput = {
  fromId: string;
  toId: string;
  amountMinor: number;
  paidOn: string | null;
};

export type TripSettlementInputErrors = Partial<Record<keyof TripSettlementInput, ValidationError>>;

export type TripSettlementValidationResult =
  | { ok: true; value: TripSettlementInput }
  | { ok: false; errors: TripSettlementInputErrors };

export function validateTripSettlementInput(input: unknown): TripSettlementValidationResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, errors: { amountMinor: validationError("paymentDataRequired") } };
  }

  const raw = input as Record<string, unknown>;
  const errors: TripSettlementInputErrors = {};

  if (!isUuid(raw.fromId)) errors.fromId = validationError("choosePayer");
  if (!isUuid(raw.toId)) errors.toId = validationError("chooseReceiver");
  if (isUuid(raw.fromId) && isUuid(raw.toId) && raw.fromId === raw.toId) {
    errors.toId = validationError("differentPeople");
  }
  if (!isPositiveAmount(raw.amountMinor)) errors.amountMinor = validationError("amountPositive");

  const paid = parseOptionalDate(raw.paidOn);
  if (!paid.ok) errors.paidOn = validationError("invalidDate");

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      fromId: raw.fromId as string,
      toId: raw.toId as string,
      amountMinor: raw.amountMinor as number,
      paidOn: paid.ok ? paid.value : null,
    },
  };
}
