import { hashPassword, normalizeIdentifier } from "@finance-app/core";

import type { UserRepository } from "./user-repository";

const MIN_PASSWORD_LENGTH = 12;

export type SeedUserInput = {
  email: string;
  username: string;
  password: string;
};

export type SeedUserResult = { status: "created"; userId: string } | { status: "already-exists" };

export async function seedUser(repo: UserRepository, input: SeedUserInput): Promise<SeedUserResult> {
  const email = normalizeIdentifier(input.email);
  const username = normalizeIdentifier(input.username);

  const existing = (await repo.findByIdentifier(email)) ?? (await repo.findByIdentifier(username));
  if (existing) {
    return { status: "already-exists" };
  }

  const passwordHash = await hashPassword(input.password);
  const created = await repo.createUser({ email, username, passwordHash });
  return { status: "created", userId: created.id };
}

export function parseSeedArgs(argv: string[]): SeedUserInput {
  const values = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag !== undefined && flag.length > 2 && flag.startsWith("--") && value !== undefined) {
      values.set(flag.slice(2), value);
      i++;
    }
  }

  const missing = ["email", "username", "password"].filter((key) => !values.get(key));
  if (missing.length > 0) {
    throw new Error(`Missing required argument(s): ${missing.map((key) => `--${key}`).join(", ")}`);
  }

  const password = values.get("password") as string;
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`--password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  return {
    email: values.get("email") as string,
    username: values.get("username") as string,
    password,
  };
}
