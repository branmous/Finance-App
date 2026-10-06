import { isValidPeriod } from "./period";

export const EXPENSE_NOTE_MAX_LENGTH = 140;

export type ExpenseInput = {
  categoryId: string;
  /** Whole pesos (COP has no minor unit in practice); never a float. */
  amountMinor: number;
  /** Month the expense belongs to, "YYYY-MM". */
  period: string;
  /** Day it was actually paid, "YYYY-MM-DD". May fall in a different month than `period`. */
  paidOn: string;
  note: string;
};

export type ExpenseInputErrors = Partial<Record<keyof ExpenseInput, string>>;

export type ExpenseValidationResult =
  | { ok: true; value: ExpenseInput }
  | { ok: false; errors: ExpenseInputErrors };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function validateExpenseInput(input: unknown): ExpenseValidationResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, errors: { amountMinor: "Expense data is required." } };
  }

  const raw = input as Record<string, unknown>;
  const errors: ExpenseInputErrors = {};

  if (typeof raw.categoryId !== "string" || !UUID_PATTERN.test(raw.categoryId)) {
    errors.categoryId = "Choose a category.";
  }

  if (typeof raw.amountMinor !== "number" || !Number.isSafeInteger(raw.amountMinor) || raw.amountMinor <= 0) {
    errors.amountMinor = "Enter an amount greater than zero.";
  }

  if (!isValidPeriod(raw.period)) errors.period = "Choose a valid month.";
  if (!isValidDate(raw.paidOn)) errors.paidOn = "Enter a valid payment date.";

  const note = typeof raw.note === "string" ? raw.note.trim() : "";
  if (note.length > EXPENSE_NOTE_MAX_LENGTH) {
    errors.note = `Note must be at most ${EXPENSE_NOTE_MAX_LENGTH} characters.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      categoryId: raw.categoryId as string,
      amountMinor: raw.amountMinor as number,
      period: raw.period as string,
      paidOn: raw.paidOn as string,
      note,
    },
  };
}
