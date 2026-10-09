import { validationError, type ValidationError } from "../validation";
import { isValidPeriod } from "./period";

export const EXPENSE_NOTE_MAX_LENGTH = 140;

export type ExpenseInput = {
  categoryId: string;
  /** Whole pesos (COP has no minor unit in practice); never a float. */
  amountMinor: number;
  /** Month the expense belongs to, "YYYY-MM". */
  period: string;
  /**
   * Day it was actually paid, "YYYY-MM-DD", or null while it is still pending (tracked but not
   * paid yet). May fall in a different month than `period`.
   */
  paidOn: string | null;
  note: string;
  /**
   * The expense this one was paid with (e.g. Netflix paid with the credit card), or null when it
   * stands alone. Its amount is already included in the parent's, so it is not counted twice.
   */
  parentId: string | null;
};

export type ExpenseInputErrors = Partial<Record<keyof ExpenseInput, ValidationError>>;

export type ExpenseValidationResult =
  | { ok: true; value: ExpenseInput }
  | { ok: false; errors: ExpenseInputErrors };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function validateExpenseInput(input: unknown): ExpenseValidationResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, errors: { amountMinor: validationError("expenseDataRequired") } };
  }

  const raw = input as Record<string, unknown>;
  const errors: ExpenseInputErrors = {};

  if (!isUuid(raw.categoryId)) errors.categoryId = validationError("chooseCategory");

  if (typeof raw.amountMinor !== "number" || !Number.isSafeInteger(raw.amountMinor) || raw.amountMinor <= 0) {
    errors.amountMinor = validationError("amountPositive");
  }

  if (!isValidPeriod(raw.period)) errors.period = validationError("invalidMonth");
  // No date (or a blank one) means the expense is tracked but not paid yet.
  const blankPaidOn = raw.paidOn == null || (typeof raw.paidOn === "string" && raw.paidOn.trim() === "");
  if (!blankPaidOn && !isValidDate(raw.paidOn)) errors.paidOn = validationError("invalidPaymentDate");

  const blankParent = raw.parentId == null || (typeof raw.parentId === "string" && raw.parentId.trim() === "");
  if (!blankParent && !isUuid(raw.parentId)) errors.parentId = validationError("invalidExpenseParent");

  const note = typeof raw.note === "string" ? raw.note.trim() : "";
  if (note.length > EXPENSE_NOTE_MAX_LENGTH) {
    errors.note = validationError("noteTooLong", { max: EXPENSE_NOTE_MAX_LENGTH });
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      categoryId: raw.categoryId as string,
      amountMinor: raw.amountMinor as number,
      period: raw.period as string,
      paidOn: blankPaidOn ? null : (raw.paidOn as string),
      note,
      parentId: blankParent ? null : (raw.parentId as string),
    },
  };
}
