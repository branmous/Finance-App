"use server";

import { validateIncomeInput, validationError, type IncomeInputErrors, type ValidationError } from "@finance-app/core";
import { createIncomeRepository } from "@finance-app/db";
import { revalidatePath } from "next/cache";

import { SESSION_EXPIRED } from "@/lib/action-errors";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export type IncomeActionResult =
  | { ok: true }
  | { ok: false; errors?: IncomeInputErrors; message?: ValidationError };

const NOT_FOUND = validationError("incomeNotFound");

function refresh() {
  revalidatePath("/monthly-income");
  revalidatePath("/monthly-expenses");
  revalidatePath("/");
}

export async function createIncome(input: unknown): Promise<IncomeActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  const parsed = validateIncomeInput(input);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  await createIncomeRepository(getDb()).create(user.id, parsed.value);
  refresh();
  return { ok: true };
}

export async function updateIncome(id: string, input: unknown): Promise<IncomeActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  const parsed = validateIncomeInput(input);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  const updated = await createIncomeRepository(getDb()).update(user.id, id, parsed.value);
  if (!updated) return { ok: false, message: NOT_FOUND };
  refresh();
  return { ok: true };
}

export async function deleteIncome(id: string): Promise<IncomeActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  const removed = await createIncomeRepository(getDb()).remove(user.id, id);
  if (!removed) return { ok: false, message: NOT_FOUND };
  refresh();
  return { ok: true };
}
