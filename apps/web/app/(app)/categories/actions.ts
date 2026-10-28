"use server";

import { validateCategoryInput, validationError, type CategoryInputErrors, type ValidationError } from "@finance-app/core";
import { CategoryInUseError, DuplicateCategoryNameError, createCategoryRepository } from "@finance-app/db";
import { revalidatePath } from "next/cache";

import { SESSION_EXPIRED } from "@/lib/action-errors";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export type CategoryActionResult =
  | { ok: true }
  | { ok: false; errors?: CategoryInputErrors; message?: ValidationError };

/** Like {@link CategoryActionResult}, but a created category also reports its id so the caller can pick it. */
export type CreateCategoryResult =
  | { ok: true; id: string }
  | { ok: false; errors?: CategoryInputErrors; message?: ValidationError };

const NOT_FOUND = validationError("categoryNotFound");
const DUPLICATE_NAME = validationError("duplicateCategoryName");
const IN_USE = validationError("categoryInUse");

function refresh() {
  revalidatePath("/categories");
  // The expense form lists the user's categories, and can create one on the spot.
  revalidatePath("/monthly-expenses");
  revalidatePath("/");
}

export async function createCategory(input: unknown): Promise<CreateCategoryResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  const parsed = validateCategoryInput(input);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  let id: string;
  try {
    ({ id } = await createCategoryRepository(getDb()).create(user.id, parsed.value));
  } catch (error) {
    if (error instanceof DuplicateCategoryNameError) {
      return { ok: false, errors: { name: DUPLICATE_NAME } };
    }
    throw error;
  }
  refresh();
  return { ok: true, id };
}

export async function updateCategory(id: string, input: unknown): Promise<CategoryActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  const parsed = validateCategoryInput(input);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  try {
    const updated = await createCategoryRepository(getDb()).update(user.id, id, parsed.value);
    if (!updated) return { ok: false, message: NOT_FOUND };
  } catch (error) {
    if (error instanceof DuplicateCategoryNameError) {
      return { ok: false, errors: { name: DUPLICATE_NAME } };
    }
    throw error;
  }
  refresh();
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<CategoryActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  try {
    const removed = await createCategoryRepository(getDb()).remove(user.id, id);
    if (!removed) return { ok: false, message: NOT_FOUND };
  } catch (error) {
    if (error instanceof CategoryInUseError) return { ok: false, message: IN_USE };
    throw error;
  }
  refresh();
  return { ok: true };
}
