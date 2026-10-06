"use server";

import { validateExpenseInput, type ExpenseInputErrors } from "@finance-app/core";
import { ExpenseCategoryNotFoundError, createExpenseRepository } from "@finance-app/db";
import { revalidatePath } from "next/cache";

import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export type ExpenseActionResult =
  | { ok: true }
  | { ok: false; errors?: ExpenseInputErrors; message?: string };

const SESSION_EXPIRED = "Your session has expired. Sign in again.";
const NOT_FOUND = "This expense no longer exists.";
const CATEGORY_NOT_FOUND = "This category no longer exists.";

function refresh() {
  revalidatePath("/monthly-expenses");
  revalidatePath("/");
}

export async function createExpense(input: unknown): Promise<ExpenseActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  const parsed = validateExpenseInput(input);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  try {
    await createExpenseRepository(getDb()).create(user.id, parsed.value);
  } catch (error) {
    if (error instanceof ExpenseCategoryNotFoundError) {
      return { ok: false, errors: { categoryId: CATEGORY_NOT_FOUND } };
    }
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
    if (error instanceof ExpenseCategoryNotFoundError) {
      return { ok: false, errors: { categoryId: CATEGORY_NOT_FOUND } };
    }
    throw error;
  }
  refresh();
  return { ok: true };
}

export async function deleteExpense(id: string): Promise<ExpenseActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  const removed = await createExpenseRepository(getDb()).remove(user.id, id);
  if (!removed) return { ok: false, message: NOT_FOUND };
  refresh();
  return { ok: true };
}
