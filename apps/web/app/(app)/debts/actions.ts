"use server";

import {
  isUuid,
  isValidPeriod,
  validateDebtInput,
  validationError,
  type DebtInputErrors,
  type ValidationError,
} from "@finance-app/core";
import {
  DebtCategoryNotFoundError,
  DebtKindError,
  DebtLockedError,
  DebtPeriodOutOfRangeError,
  DebtRangeError,
  createDebtRepository,
} from "@finance-app/db";
import { revalidatePath } from "next/cache";

import { SESSION_EXPIRED } from "@/lib/action-errors";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export type DebtActionResult = { ok: true } | { ok: false; errors?: DebtInputErrors; message?: ValidationError };

const NOT_FOUND = validationError("debtNotFound");

function refresh() {
  revalidatePath("/debts");
  // Paid installments are expenses, so they change the month totals too.
  revalidatePath("/monthly-expenses");
  revalidatePath("/");
}

function todayLocal(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Turns the repository's expected failures into form errors; anything else is a real bug and rethrown. */
function toActionError(error: unknown): DebtActionResult | null {
  if (error instanceof DebtCategoryNotFoundError) {
    return { ok: false, errors: { categoryId: validationError(error.code) } };
  }
  if (error instanceof DebtRangeError) return { ok: false, errors: { endPeriod: validationError(error.code) } };
  if (error instanceof DebtLockedError) return { ok: false, errors: { totalMinor: validationError(error.code) } };
  if (error instanceof DebtKindError) return { ok: false, errors: { kind: validationError(error.code) } };
  if (error instanceof DebtPeriodOutOfRangeError) return { ok: false, message: validationError(error.code) };
  return null;
}

export async function createDebt(input: unknown): Promise<DebtActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  const parsed = validateDebtInput(input);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  try {
    await createDebtRepository(getDb()).create(user.id, parsed.value, todayLocal());
  } catch (error) {
    const mapped = toActionError(error);
    if (mapped) return mapped;
    throw error;
  }
  refresh();
  return { ok: true };
}

export async function updateDebt(id: string, input: unknown): Promise<DebtActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };
  if (!isUuid(id)) return { ok: false, message: NOT_FOUND };

  const parsed = validateDebtInput(input);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  try {
    const updated = await createDebtRepository(getDb()).update(user.id, id, parsed.value);
    if (!updated) return { ok: false, message: NOT_FOUND };
  } catch (error) {
    const mapped = toActionError(error);
    if (mapped) return mapped;
    throw error;
  }
  refresh();
  return { ok: true };
}

export async function deleteDebt(id: string): Promise<DebtActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };
  if (!isUuid(id)) return { ok: false, message: NOT_FOUND };

  const removed = await createDebtRepository(getDb()).remove(user.id, id);
  if (!removed) return { ok: false, message: NOT_FOUND };
  refresh();
  return { ok: true };
}

/** Marks one installment paid (creating its expense) or unpaid (removing it). */
export async function setInstallmentPaid(debtId: string, period: string, paid: boolean): Promise<DebtActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };
  if (!isUuid(debtId) || !isValidPeriod(period)) return { ok: false, message: NOT_FOUND };

  const repo = createDebtRepository(getDb());
  try {
    if (paid) {
      if (!(await repo.markPaid(user.id, debtId, period, todayLocal()))) return { ok: false, message: NOT_FOUND };
    } else {
      await repo.unmarkPaid(user.id, debtId, period);
    }
  } catch (error) {
    const mapped = toActionError(error);
    if (mapped) return mapped;
    throw error;
  }
  refresh();
  return { ok: true };
}

/** Catches up: marks every installment from the first one through `period` as paid. */
export async function markPaidThrough(debtId: string, period: string): Promise<DebtActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };
  if (!isUuid(debtId) || !isValidPeriod(period)) return { ok: false, message: NOT_FOUND };

  try {
    if (!(await createDebtRepository(getDb()).markPaidUpTo(user.id, debtId, period, todayLocal()))) {
      return { ok: false, message: NOT_FOUND };
    }
  } catch (error) {
    const mapped = toActionError(error);
    if (mapped) return mapped;
    throw error;
  }
  refresh();
  return { ok: true };
}
