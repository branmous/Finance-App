import type { CategoryInput } from "@finance-app/core";
import { and, asc, eq } from "drizzle-orm";

import { categories } from "../schema/categories";
import type { DbClient } from "./user-repository";

export type CategoryRow = typeof categories.$inferSelect;

export class DuplicateCategoryNameError extends Error {
  constructor() {
    super("A category with this name already exists");
    this.name = "DuplicateCategoryNameError";
  }
}

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  const candidate = error as { code?: string; cause?: { code?: string } } | null;
  return candidate?.code === UNIQUE_VIOLATION || candidate?.cause?.code === UNIQUE_VIOLATION;
}

/**
 * Every method takes the owner's userId and scopes its query by it, so a user can
 * never read or change another user's categories (spec 003, FR-006).
 */
export function createCategoryRepository(db: DbClient) {
  return {
    async list(userId: string): Promise<CategoryRow[]> {
      return db
        .select()
        .from(categories)
        .where(eq(categories.userId, userId))
        .orderBy(asc(categories.type), asc(categories.name));
    },

    async create(userId: string, input: CategoryInput): Promise<CategoryRow> {
      try {
        const [row] = await db
          .insert(categories)
          .values({ ...input, userId })
          .returning();
        if (!row) {
          throw new Error("Insert into categories returned no row");
        }
        return row;
      } catch (error) {
        if (isUniqueViolation(error)) throw new DuplicateCategoryNameError();
        throw error;
      }
    },

    async update(userId: string, id: string, input: CategoryInput): Promise<CategoryRow | null> {
      try {
        const [row] = await db
          .update(categories)
          .set({ ...input, updatedAt: new Date() })
          .where(and(eq(categories.id, id), eq(categories.userId, userId)))
          .returning();
        return row ?? null;
      } catch (error) {
        if (isUniqueViolation(error)) throw new DuplicateCategoryNameError();
        throw error;
      }
    },

    async remove(userId: string, id: string): Promise<boolean> {
      const rows = await db
        .delete(categories)
        .where(and(eq(categories.id, id), eq(categories.userId, userId)))
        .returning();
      return rows.length > 0;
    },
  };
}

export type CategoryRepository = ReturnType<typeof createCategoryRepository>;
