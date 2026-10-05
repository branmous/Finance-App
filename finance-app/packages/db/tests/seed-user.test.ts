import { describe, expect, it } from "vitest";

import { parseSeedArgs, seedUser } from "../src/seed-user";
import { createUserRepository } from "../src/user-repository";
import { createTestDb } from "./helpers";

const validArgs = {
  email: "Brand@Example.com",
  username: "Brand",
  password: "a-long-enough-password",
};

describe("parseSeedArgs", () => {
  it("parses email, username, and password flags", () => {
    expect(
      parseSeedArgs([
        "--email",
        "brand@example.com",
        "--username",
        "brand",
        "--password",
        "a-long-enough-password",
      ]),
    ).toEqual({
      email: "brand@example.com",
      username: "brand",
      password: "a-long-enough-password",
    });
  });

  it("names every missing required argument", () => {
    expect(() => parseSeedArgs(["--email", "brand@example.com"])).toThrow(
      /--username, --password/,
    );
  });

  it("rejects passwords shorter than 12 characters", () => {
    expect(() =>
      parseSeedArgs(["--email", "b@x.com", "--username", "b", "--password", "short"]),
    ).toThrow(/at least 12 characters/);
  });
});

describe("seedUser", () => {
  it("creates the user with a hashed password, not the plaintext", async () => {
    const db = await createTestDb();
    const repo = createUserRepository(db);

    const result = await seedUser(repo, validArgs);

    expect(result.status).toBe("created");
    const stored = await repo.findByIdentifier("brand@example.com");
    expect(stored?.email).toBe("brand@example.com");
    expect(stored?.username).toBe("brand");
    expect(stored?.passwordHash).not.toBe(validArgs.password);
    expect(stored?.passwordHash).toMatch(/^\$2[aby]\$12\$/);
  });

  it("does nothing when a user with the same email already exists", async () => {
    const db = await createTestDb();
    const repo = createUserRepository(db);
    await seedUser(repo, validArgs);
    const before = await repo.findByIdentifier("brand@example.com");

    const result = await seedUser(repo, { ...validArgs, password: "another-long-password" });

    expect(result.status).toBe("already-exists");
    const after = await repo.findByIdentifier("brand@example.com");
    expect(after?.passwordHash).toBe(before?.passwordHash);
  });

  it("does nothing when a user with the same username already exists", async () => {
    const db = await createTestDb();
    const repo = createUserRepository(db);
    await seedUser(repo, validArgs);

    const result = await seedUser(repo, {
      email: "other@example.com",
      username: "brand",
      password: "another-long-password",
    });

    expect(result.status).toBe("already-exists");
  });
});
