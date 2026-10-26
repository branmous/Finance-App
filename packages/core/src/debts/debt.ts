import { isUuid } from "../expenses/expense";
import { isValidPeriod, shiftPeriod } from "../expenses/period";
import { validationError, type ValidationError } from "../validation";

export const DEBT_NAME_MAX_LENGTH = 60;
export const DEBT_NOTE_MAX_LENGTH = 140;
/** Ten years of monthly installments is more than any debt tracked here should need. */
export const DEBT_MAX_INSTALLMENTS = 120;

/** "monthly": the user sets the installment. "deferred": the user sets a total and the months to split it over. */
export type DebtKind = "monthly" | "deferred";

export type DebtInput = {
  kind: DebtKind;
  name: string;
  categoryId: string;
  /** Whole pesos paid each month; never a float. For a deferred debt, the total divided by the months, rounded down. */
  installmentMinor: number;
  /** The total split over the months. Only a deferred debt has one. */
  totalMinor: number | null;
  /** First month an installment is due, "YYYY-MM". */
  startPeriod: string;
  /** Derived from the start and end months (monthly) or the months picked (deferred). */
  totalInstallments: number;
  /** Installments already paid when the debt is registered (the first N months). */
  alreadyPaid: number;
  note: string;
};

export type DebtInputErrors = Partial<Record<keyof DebtInput | "endPeriod" | "months", ValidationError>>;

export type DebtValidationResult =
  | { ok: true; value: DebtInput }
  | { ok: false; errors: DebtInputErrors };

/** Months from `start` to `end`, counting both ends; 0 when `end` is before `start`. */
export function monthsBetween(start: string, end: string): number {
  const index = (period: string) => Number(period.slice(0, 4)) * 12 + Number(period.slice(5, 7));
  return Math.max(0, index(end) - index(start) + 1);
}

/** The installment of a deferred debt: the total split evenly, rounded down to whole pesos. */
export function deferredInstallmentMinor(totalMinor: number, months: number): number {
  return Math.floor(totalMinor / months);
}

export function validateDebtInput(input: unknown): DebtValidationResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, errors: { name: validationError("debtDataRequired") } };
  }

  const raw = input as Record<string, unknown>;
  const errors: DebtInputErrors = {};

  // An input without a kind is a monthly debt, as every client sent before deferred debts existed.
  const kind = raw.kind == null ? "monthly" : raw.kind;
  if (kind !== "monthly" && kind !== "deferred") errors.kind = validationError("invalidDebtKind");
  const deferred = kind === "deferred";

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (name.length === 0) errors.name = validationError("enterName");
  else if (name.length > DEBT_NAME_MAX_LENGTH) errors.name = validationError("nameTooLong", { max: DEBT_NAME_MAX_LENGTH });

  if (!isUuid(raw.categoryId)) errors.categoryId = validationError("chooseCategory");

  const startOk = isValidPeriod(raw.startPeriod);
  if (!startOk) errors.startPeriod = validationError("invalidStartMonth");

  let installmentMinor = 0;
  let totalMinor: number | null = null;
  let total = 0;

  if (deferred) {
    const isTotalOk =
      typeof raw.totalMinor === "number" && Number.isSafeInteger(raw.totalMinor) && raw.totalMinor > 0;
    if (!isTotalOk) errors.totalMinor = validationError("totalAmountPositive");

    const months = raw.months;
    if (typeof months !== "number" || !Number.isInteger(months) || months < 1) {
      errors.months = validationError("invalidMonths");
    } else if (months > DEBT_MAX_INSTALLMENTS) {
      errors.months = validationError("tooManyInstallments", { max: DEBT_MAX_INSTALLMENTS });
    } else {
      total = months;
    }

    if (isTotalOk && total > 0) {
      installmentMinor = deferredInstallmentMinor(raw.totalMinor as number, total);
      if (installmentMinor < 1) errors.totalMinor = validationError("totalTooSmall");
      totalMinor = raw.totalMinor as number;
    }
  } else {
    if (
      typeof raw.installmentMinor !== "number" ||
      !Number.isSafeInteger(raw.installmentMinor) ||
      raw.installmentMinor <= 0
    ) {
      errors.installmentMinor = validationError("amountPositive");
    } else {
      installmentMinor = raw.installmentMinor;
    }

    const endOk = isValidPeriod(raw.endPeriod);
    if (!endOk) errors.endPeriod = validationError("invalidEndMonth");
    if (startOk && endOk) {
      total = monthsBetween(raw.startPeriod as string, raw.endPeriod as string);
      if (total === 0) errors.endPeriod = validationError("endMonthBeforeStart");
      else if (total > DEBT_MAX_INSTALLMENTS) {
        errors.endPeriod = validationError("tooManyInstallments", { max: DEBT_MAX_INSTALLMENTS });
      }
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
      kind: kind as DebtKind,
      name,
      categoryId: raw.categoryId as string,
      installmentMinor,
      totalMinor,
      startPeriod: raw.startPeriod as string,
      totalInstallments: total,
      alreadyPaid: alreadyPaid as number,
      note,
    },
  };
}

type DebtSchedule = { startPeriod: string; totalInstallments: number };

/** What the amount of each installment depends on. A missing kind means monthly. */
type DebtAmounts = DebtSchedule & {
  kind?: DebtKind;
  installmentMinor: number;
  totalMinor?: number | null;
};

/** Every month an installment falls in, in order. */
export function installmentPeriods(debt: DebtSchedule): string[] {
  return Array.from({ length: debt.totalInstallments }, (_, i) => shiftPeriod(debt.startPeriod, i));
}

/**
 * What the installment of `period` costs. Every installment is the same except the last one of a
 * deferred debt, which carries what rounding down left over so the installments add up to the total.
 */
export function installmentAmount(debt: DebtAmounts, period: string): number {
  if (debt.kind !== "deferred" || debt.totalMinor == null) return debt.installmentMinor;
  const last = shiftPeriod(debt.startPeriod, debt.totalInstallments - 1);
  return period === last ? debt.totalMinor - debt.installmentMinor * (debt.totalInstallments - 1) : debt.installmentMinor;
}

/** Everything the debt adds up to, whichever way it was set up. */
export function debtTotalMinor(debt: DebtAmounts): number {
  if (debt.kind === "deferred" && debt.totalMinor != null) return debt.totalMinor;
  return debt.installmentMinor * debt.totalInstallments;
}

export type DebtStatus = "upcoming" | "active" | "overdue" | "paid_off";

export type DebtProgress = {
  paidCount: number;
  remainingCount: number;
  paidMinor: number;
  /** What is still owed: the amounts of the unpaid installments. */
  remainingMinor: number;
  /** 0..100, rounded down. */
  percent: number;
  endPeriod: string;
  /** Unpaid months that are already due (up to and including the current one). */
  overduePeriods: string[];
  status: DebtStatus;
};

export function debtProgress(debt: DebtAmounts, paidPeriods: readonly string[], nowPeriod: string): DebtProgress {
  const periods = installmentPeriods(debt);
  const paid = new Set(paidPeriods);
  const paidInRange = periods.filter((period) => paid.has(period));
  const paidCount = paidInRange.length;
  const remainingCount = debt.totalInstallments - paidCount;
  const paidMinor = paidInRange.reduce((sum, period) => sum + installmentAmount(debt, period), 0);
  // "YYYY-MM" strings compare correctly as text.
  const overduePeriods = periods.filter((period) => !paid.has(period) && period <= nowPeriod);

  let status: DebtStatus = "active";
  if (remainingCount === 0) status = "paid_off";
  else if (overduePeriods.length > 0) status = "overdue";
  else if (nowPeriod < debt.startPeriod) status = "upcoming";

  return {
    paidCount,
    remainingCount,
    paidMinor,
    remainingMinor: debtTotalMinor(debt) - paidMinor,
    percent: Math.floor((paidCount / debt.totalInstallments) * 100),
    endPeriod: shiftPeriod(debt.startPeriod, debt.totalInstallments - 1),
    overduePeriods,
    status,
  };
}
