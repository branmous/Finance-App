"use server";

import {
  currentPeriod,
  isUuid,
  validateExpenseInput,
  validationError,
  type ExpenseInputErrors,
  type ValidationError,
} from "@finance-app/core";
import {
  ExpenseCategoryNotFoundError,
  InvalidExpenseParentError,
  createExpenseRepository,
} from "@finance-app/db";
import { revalidatePath } from "next/cache";

import { SESSION_EXPIRED } from "@/lib/action-errors";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export type ExpenseActionResult =
  | { ok: true }
  | { ok: false; errors?: ExpenseInputErrors; message?: ValidationError };

const NOT_FOUND = validationError("expenseNotFound");
const CATEGORY_NOT_FOUND = validationError("categoryNotFound");

function refresh() {
  revalidatePath("/monthly-expenses");
  revalidatePath("/");
}

/** Turns the repository's expected failures into field errors; anything else is a real bug and rethrown. */
function toActionError(error: unknown): ExpenseActionResult | null {
  if (error instanceof ExpenseCategoryNotFoundError) {
    return { ok: false, errors: { categoryId: CATEGORY_NOT_FOUND } };
  }
  if (error instanceof InvalidExpenseParentError) {
    return { ok: false, errors: { parentId: validationError(error.code) } };
  }
  return null;
}

export async function createExpense(input: unknown): Promise<ExpenseActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  const parsed = validateExpenseInput(input);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  try {
    await createExpenseRepository(getDb()).create(user.id, parsed.value);
  } catch (error) {
    const mapped = toActionError(error);
    if (mapped) return mapped;
    throw error;
  }
  refresh();
  return { ok: true };
}

export async function updateExpense(id: string, input: unknown): Promise<ExpenseActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  const parsed = validateExpenseInput(input);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  try {
    const updated = await createExpenseRepository(getDb()).update(user.id, id, parsed.value);
    if (!updated) return { ok: false, message: NOT_FOUND };
  } catch (error) {
    const mapped = toActionError(error);
    if (mapped) return mapped;
    throw error;
  }
  refresh();
  return { ok: true };
}

/** Makes an expense that was paid with another one stand on its own again. */
export async function unlinkExpense(id: string): Promise<ExpenseActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };
  if (!isUuid(id)) return { ok: false, message: NOT_FOUND };

  const done = await createExpenseRepository(getDb()).unlink(user.id, id);
  if (!done) return { ok: false, message: NOT_FOUND };
  refresh();
  return { ok: true };
}

export type CopyExpensesResult = { ok: true; copied: number } | { ok: false; message: ValidationError };

const MAX_COPY_BATCH = 200;

/**
 * Copies the selected expenses (normally last month's) into the current month as pending.
 * The target month is computed here, never taken from the client.
 */
export async function copyExpenses(ids: unknown): Promise<CopyExpensesResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_COPY_BATCH || !ids.every(isUuid)) {
    return { ok: false, message: validationError("selectExpensesToCopy") };
  }

  const copied = await createExpenseRepository(getDb()).copyToPeriod(user.id, [...new Set(ids)], currentPeriod());
  if (copied === 0) return { ok: false, message: NOT_FOUND };
  refresh();
  return { ok: true, copied };
}

export async function deleteExpense(id: string): Promise<ExpenseActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  const removed = await createExpenseRepository(getDb()).remove(user.id, id);
  if (!removed) return { ok: false, message: NOT_FOUND };
  refresh();
  return { ok: true };
}
