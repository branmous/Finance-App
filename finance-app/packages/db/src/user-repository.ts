import type { LockoutState } from "@finance-app/core";
import { eq, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { PgliteDatabase } from "drizzle-orm/pglite";

import { users } from "../schema/users";

export type DbClient = PostgresJsDatabase | PgliteDatabase;

export type NewUser = {
  username: string;
  email: string;
  passwordHash: string;
};

export function createUserRepository(db: DbClient) {
  return {
    async findByIdentifier(identifier: string) {
      const [row] = await db
        .select()
        .from(users)
        .where(or(eq(users.email, identifier), eq(users.username, identifier)))
        .limit(1);
      return row ?? null;
    },

    async createUser(input: NewUser) {
      const [row] = await db.insert(users).values(input).returning();
      if (!row) {
        throw new Error("Insert into users returned no row");
      }
      return row;
    },

    async saveLockoutState(userId: string, state: LockoutState) {
      await db
        .update(users)
        .set({
          failedAttempts: state.failedAttempts,
          lockedUntil: state.lockedUntil,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    },
  };
}

export type UserRepository = ReturnType<typeof createUserRepository>;
