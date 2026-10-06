import { describe, expect, it } from "vitest";

import { DuplicateCategoryNameError, createCategoryRepository } from "../src/category-repository";
import { createUserRepository } from "../src/user-repository";
import { createTestDb } from "./helpers";

const input = { name: "Netflix", type: "subscription", color: "#0f766e", icon: "repeat" } as const;

async function setup() {
  const db = await createTestDb();
  const users = createUserRepository(db);
  const alice = await users.createUser({ username: "alice", email: "alice@x.com", passwordHash: "h" });
  const bob = await users.createUser({ username: "bob", email: "bob@x.com", passwordHash: "h" });
  return { repo: createCategoryRepository(db), alice, bob };
}

describe("category repository", () => {
  it("creates a category owned by the user and lists it", async () => {
    const { repo, alice } = await setup();
    const created = await repo.create(alice.id, input);

    expect(created).toMatchObject({ ...input, userId: alice.id });
    expect(created.id).toBeTruthy();
    await expect(repo.list(alice.id)).resolves.toHaveLength(1);
  });

  it("lists categories ordered by type then name", async () => {
    const { repo, alice } = await setup();
    await repo.create(alice.id, { ...input, name: "Zoom" });
    await repo.create(alice.id, { ...input, name: "Trip", type: "travel" });
    await repo.create(alice.id, { ...input, name: "Apple" });

    const names = (await repo.list(alice.id)).map((row) => row.name);
    expect(names).toEqual(["Apple", "Zoom", "Trip"]);
  });

  it("rejects a duplicate name for the same user, ignoring case", async () => {
    const { repo, alice } = await setup();
    await repo.create(alice.id, input);
    await expect(repo.create(alice.id, { ...input, name: "netflix" })).rejects.toBeInstanceOf(
      DuplicateCategoryNameError,
    );
  });

  it("allows two users to have a category with the same name", async () => {
    const { repo, alice, bob } = await setup();
    await repo.create(alice.id, input);
    await expect(repo.create(bob.id, input)).resolves.toMatchObject({ userId: bob.id });
  });

  it("only lists the categories of the requesting user", async () => {
    const { repo, alice, bob } = await setup();
    await repo.create(alice.id, input);
    await expect(repo.list(bob.id)).resolves.toEqual([]);
  });

  it("updates an own category and bumps updated_at", async () => {
    const { repo, alice } = await setup();
    const created = await repo.create(alice.id, input);
    const updated = await repo.update(alice.id, created.id, { ...input, name: "Disney+", icon: "tag" });

    expect(updated).toMatchObject({ id: created.id, name: "Disney+", icon: "tag" });
    expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
  });

  it("rejects renaming onto another own category", async () => {
    const { repo, alice } = await setup();
    await repo.create(alice.id, input);
    const other = await repo.create(alice.id, { ...input, name: "Spotify" });
    await expect(repo.update(alice.id, other.id, input)).rejects.toBeInstanceOf(
      DuplicateCategoryNameError,
    );
  });

  it("allows saving a category under its own name unchanged", async () => {
    const { repo, alice } = await setup();
    const created = await repo.create(alice.id, input);
    await expect(repo.update(alice.id, created.id, { ...input, color: "#2563eb" })).resolves.toMatchObject({
      color: "#2563eb",
    });
  });

  it("cannot update or delete a category that belongs to another user", async () => {
    const { repo, alice, bob } = await setup();
    const created = await repo.create(alice.id, input);

    await expect(repo.update(bob.id, created.id, { ...input, name: "Hacked" })).resolves.toBeNull();
    await expect(repo.remove(bob.id, created.id)).resolves.toBe(false);

    const [still] = await repo.list(alice.id);
    expect(still?.name).toBe("Netflix");
  });

  it("deletes an own category", async () => {
    const { repo, alice } = await setup();
    const created = await repo.create(alice.id, input);
    await expect(repo.remove(alice.id, created.id)).resolves.toBe(true);
    await expect(repo.list(alice.id)).resolves.toEqual([]);
    await expect(repo.remove(alice.id, created.id)).resolves.toBe(false);
  });
});
