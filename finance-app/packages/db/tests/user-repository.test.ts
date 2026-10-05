import { describe, expect, it } from "vitest";

import { createUserRepository } from "../src/user-repository";
import { createTestDb } from "./helpers";

async function setup() {
  const db = await createTestDb();
  const repo = createUserRepository(db);
  const user = await repo.createUser({
    username: "brand",
    email: "brand@example.com",
    passwordHash: "hash-value",
  });
  return { repo, user };
}

describe("user repository", () => {
  it("finds a user by email", async () => {
    const { repo, user } = await setup();
    const found = await repo.findByIdentifier("brand@example.com");
    expect(found?.id).toBe(user.id);
  });

  it("finds a user by username", async () => {
    const { repo, user } = await setup();
    const found = await repo.findByIdentifier("brand");
    expect(found?.id).toBe(user.id);
  });

  it("returns null for an unknown identifier", async () => {
    const { repo } = await setup();
    await expect(repo.findByIdentifier("nobody")).resolves.toBeNull();
  });

  it("stores the password hash it was given, not a plaintext password", async () => {
    const { repo } = await setup();
    const found = await repo.findByIdentifier("brand");
    expect(found?.passwordHash).toBe("hash-value");
  });

  it("persists lockout state and reads it back", async () => {
    const { repo, user } = await setup();
    const lockedUntil = new Date("2026-10-05T12:15:00Z");

    await repo.saveLockoutState(user.id, { failedAttempts: 5, lockedUntil });

    const found = await repo.findByIdentifier("brand");
    expect(found?.failedAttempts).toBe(5);
    expect(found?.lockedUntil?.getTime()).toBe(lockedUntil.getTime());
  });

  it("clears lockout state when saved with no lock", async () => {
    const { repo, user } = await setup();
    await repo.saveLockoutState(user.id, {
      failedAttempts: 5,
      lockedUntil: new Date("2026-10-05T12:15:00Z"),
    });

    await repo.saveLockoutState(user.id, { failedAttempts: 0, lockedUntil: null });

    const found = await repo.findByIdentifier("brand");
    expect(found?.failedAttempts).toBe(0);
    expect(found?.lockedUntil).toBeNull();
  });
});
