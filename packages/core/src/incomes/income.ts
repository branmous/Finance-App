import { isValidPeriod } from "../expenses/period";
import { validationError, type ValidationError } from "../validation";

export const INCOME_NOTE_MAX_LENGTH = 140;

export const INCOME_TYPES = ["payroll", "freelance", "rent", "other"] as const;
export type IncomeType = (typeof INCOME_TYPES)[number];

export type IncomeInput = {
  type: IncomeType;
  /** Whole pesos (COP has no minor unit in practice); never a float. */
  amountMinor: number;
  /** Month the income belongs to, "YYYY-MM". */
  period: string;
  note: string;
};

export type IncomeInputErrors = Partial<Record<keyof IncomeInput, ValidationError>>;

export type IncomeValidationResult =
  | { ok: true; value: IncomeInput }
  | { ok: false; errors: IncomeInputErrors };

export function validateIncomeInput(input: unknown): IncomeValidationResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, errors: { amountMinor: validationError("incomeDataRequired") } };
  }

  const raw = input as Record<string, unknown>;
  const errors: IncomeInputErrors = {};

  if (typeof raw.type !== "string" || !(INCOME_TYPES as readonly string[]).includes(raw.type)) {
    errors.type = validationError("chooseIncomeType");
  }

  if (typeof raw.amountMinor !== "number" || !Number.isSafeInteger(raw.amountMinor) || raw.amountMinor <= 0) {
    errors.amountMinor = validationError("amountPositive");
  }

  if (!isValidPeriod(raw.period)) errors.period = validationError("invalidMonth");

  const note = typeof raw.note === "string" ? raw.note.trim() : "";
  if (note.length > INCOME_NOTE_MAX_LENGTH) {
    errors.note = validationError("noteTooLong", { max: INCOME_NOTE_MAX_LENGTH });
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      type: raw.type as IncomeType,
      amountMinor: raw.amountMinor as number,
      period: raw.period as string,
      note,
    },
  };
}
