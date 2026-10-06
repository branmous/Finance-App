import {
  isLocked,
  normalizeIdentifier,
  nextFailureState,
  verifyAgainstDummyHash,
  verifyPassword,
} from "@finance-app/core";
import { createUserRepository } from "@finance-app/db";
import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { getDb } from "@/lib/db";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const identifier = normalizeIdentifier(credentials?.identifier ?? "");
        const password = credentials?.password ?? "";
        if (!identifier || !password) {
          return null;
        }

        const repo = createUserRepository(getDb());
        const user = await repo.findByIdentifier(identifier);
        if (!user) {
          await verifyAgainstDummyHash(password);
          return null;
        }

        const now = new Date();
        const lockState = { failedAttempts: user.failedAttempts, lockedUntil: user.lockedUntil };
        if (isLocked(lockState, now)) {
          return null;
        }

        const passwordIsValid = await verifyPassword(password, user.passwordHash);
        if (!passwordIsValid) {
          await repo.saveLockoutState(user.id, nextFailureState(lockState, now));
          return null;
        }

        if (user.failedAttempts > 0 || user.lockedUntil !== null) {
          await repo.saveLockoutState(user.id, { failedAttempts: 0, lockedUntil: null });
        }

        return { id: user.id, email: user.email, name: user.username };
      },
    }),
  ],
  callbacks: {
    // NextAuth stores the user id in the JWT `sub`; expose it so server code can scope data by owner.
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
