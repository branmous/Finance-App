import { isUuid } from "../expenses/expense";
import { isValidPeriod, shiftPeriod } from "../expenses/period";
import { validationError, type ValidationError } from "../validation";

export const DEBT_NAME_MAX_LENGTH = 60;
export const DEBT_NOTE_MAX_LENGTH = 140;
/** Ten years of monthly installments is more than any debt tracked here should need. */
export const DEBT_MAX_INSTALLMENTS = 120;

export type DebtInput = {
  name: string;
  categoryId: string;
  /** Whole pesos paid each month; never a float. */
  installmentMinor: number;
  /** First month an installment is due, "YYYY-MM". */
  startPeriod: string;
  /** Derived from the start and end months the user picked. */
  totalInstallments: number;
  /** Installments already paid when the debt is registered (the first N months). */
  alreadyPaid: number;
  note: string;
};

export type DebtInputErrors = Partial<Record<keyof DebtInput | "endPeriod", ValidationError>>;

export type DebtValidationResult =
  | { ok: true; value: DebtInput }
  | { ok: false; errors: DebtInputErrors };

/** Months from `start` to `end`, counting both ends; 0 when `end` is before `start`. */
export function monthsBetween(start: string, end: string): number {
  const index = (period: string) => Number(period.slice(0, 4)) * 12 + Number(period.slice(5, 7));
  return Math.max(0, index(end) - index(start) + 1);
}

export function validateDebtInput(input: unknown): DebtValidationResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, errors: { name: validationError("debtDataRequired") } };
  }

  const raw = input as Record<string, unknown>;
  const errors: DebtInputErrors = {};

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (name.length === 0) errors.name = validationError("enterName");
  else if (name.length > DEBT_NAME_MAX_LENGTH) errors.name = validationError("nameTooLong", { max: DEBT_NAME_MAX_LENGTH });

  if (!isUuid(raw.categoryId)) errors.categoryId = validationError("chooseCategory");

  if (
    typeof raw.installmentMinor !== "number" ||
    !Number.isSafeInteger(raw.installmentMinor) ||
    raw.installmentMinor <= 0
  ) {
    errors.installmentMinor = validationError("amountPositive");
  }

  const startOk = isValidPeriod(raw.startPeriod);
  const endOk = isValidPeriod(raw.endPeriod);
  if (!startOk) errors.startPeriod = validationError("invalidStartMonth");
  if (!endOk) errors.endPeriod = validationError("invalidEndMonth");

  let total = 0;
  if (startOk && endOk) {
    total = monthsBetween(raw.startPeriod as string, raw.endPeriod as string);
    if (total === 0) errors.endPeriod = validationError("endMonthBeforeStart");
    else if (total > DEBT_MAX_INSTALLMENTS) {
      errors.endPeriod = validationError("tooManyInstallments", { max: DEBT_MAX_INSTALLMENTS });
    }
  }

  const alreadyPaid = raw.alreadyPaid == null ? 0 : raw.alreadyPaid;
  if (typeof alreadyPaid !== "number" || !Number.isInteger(alreadyPaid) || alreadyPaid < 0) {
    errors.alreadyPaid = validationError("invalidAlreadyPaid");
  } else if (total > 0 && alreadyPaid > total) {
    errors.alreadyPaid = validationError("paidExceedsTotal");
  }

  const note = typeof raw.note === "string" ? raw.note.trim() : "";
  if (note.length > DEBT_NOTE_MAX_LENGTH) errors.note = validationError("noteTooLong", { max: DEBT_NOTE_MAX_LENGTH });

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name,
      categoryId: raw.categoryId as string,
      installmentMinor: raw.installmentMinor as number,
      startPeriod: raw.startPeriod as string,
      totalInstallments: total,
      alreadyPaid: alreadyPaid as number,
      note,
    },
  };
}

type DebtSchedule = { startPeriod: string; totalInstallments: number };

/** Every month an installment falls in, in order. */
export function installmentPeriods(debt: DebtSchedule): string[] {
  return Array.from({ length: debt.totalInstallments }, (_, i) => shiftPeriod(debt.startPeriod, i));
}

export type DebtStatus = "upcoming" | "active" | "overdue" | "paid_off";

export type DebtProgress = {
  paidCount: number;
  remainingCount: number;
  paidMinor: number;
  /** What is still owed: unpaid installments times the monthly amount. */
  remainingMinor: number;
  /** 0..100, rounded down. */
  percent: number;
  endPeriod: string;
  /** Unpaid months that are already due (up to and including the current one). */
  overduePeriods: string[];
  status: DebtStatus;
};

export function debtProgress(
  debt: DebtSchedule & { installmentMinor: number },
  paidPeriods: readonly string[],
  nowPeriod: string,
): DebtProgress {
  const periods = installmentPeriods(debt);
  const paid = new Set(paidPeriods);
  const paidCount = periods.filter((period) => paid.has(period)).length;
  const remainingCount = debt.totalInstallments - paidCount;
  // "YYYY-MM" strings compare correctly as text.
  const overduePeriods = periods.filter((period) => !paid.has(period) && period <= nowPeriod);

  let status: DebtStatus = "active";
  if (remainingCount === 0) status = "paid_off";
  else if (overduePeriods.length > 0) status = "overdue";
  else if (nowPeriod < debt.startPeriod) status = "upcoming";

  return {
    paidCount,
    remainingCount,
    paidMinor: paidCount * debt.installmentMinor,
    remainingMinor: remainingCount * debt.installmentMinor,
    percent: Math.floor((paidCount / debt.totalInstallments) * 100),
    endPeriod: shiftPeriod(debt.startPeriod, debt.totalInstallments - 1),
    overduePeriods,
    status,
  };
}
