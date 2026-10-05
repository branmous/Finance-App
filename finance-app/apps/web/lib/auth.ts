import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getAuthorizedEmail(): string {
  const authorizedEmail = process.env.AUTHORIZED_EMAIL;
  if (!authorizedEmail) {
    throw new Error("AUTHORIZED_EMAIL environment variable is not set");
  }
  return normalizeEmail(authorizedEmail);
}

/**
 * Single-user email sign-in: whoever provides an email is "authenticated",
 * but only the normalized AUTHORIZED_EMAIL is allowed past the signIn callback
 * below (see FR-009, FR-010, and contracts/auth.md). No password is checked
 * because this app has exactly one real user and is gated by AUTHORIZED_EMAIL,
 * not by a credential secret.
 */
export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      authorize(credentials) {
        const email = credentials?.email;
        if (!email) {
          return null;
        }
        return { id: normalizeEmail(email), email: normalizeEmail(email) };
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/denied",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        return false;
      }
      return normalizeEmail(user.email) === getAuthorizedEmail();
    },
    async session({ session }) {
      return session;
    },
  },
};
