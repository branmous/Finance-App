"use server";

import { validateCategoryInput, type CategoryInputErrors } from "@finance-app/core";
import { DuplicateCategoryNameError, createCategoryRepository } from "@finance-app/db";
import { revalidatePath } from "next/cache";

import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export type CategoryActionResult =
  | { ok: true }
  | { ok: false; errors?: CategoryInputErrors; message?: string };

const SESSION_EXPIRED = "Your session has expired. Sign in again.";
const NOT_FOUND = "This category no longer exists.";
const DUPLICATE_NAME = "You already have a category with this name.";

function refresh() {
  revalidatePath("/categories");
  revalidatePath("/");
}

export async function createCategory(input: unknown): Promise<CategoryActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  const parsed = validateCategoryInput(input);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  try {
    await createCategoryRepository(getDb()).create(user.id, parsed.value);
  } catch (error) {
    if (error instanceof DuplicateCategoryNameError) {
      return { ok: false, errors: { name: DUPLICATE_NAME } };
    }
    throw error;
  }
  refresh();
  return { ok: true };
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

  const removed = await createCategoryRepository(getDb()).remove(user.id, id);
  if (!removed) return { ok: false, message: NOT_FOUND };
  refresh();
  return { ok: true };
}
