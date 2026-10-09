import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationsFolder = fileURLToPath(new URL("../migrations", import.meta.url));

describe("database migrations", () => {
  it("creates the users table with unique username and email", async () => {
    const client = new PGlite();
    const db = drizzle(client);
    await migrate(db, { migrationsFolder });

    const columns = await client.query<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'",
    );
    const names = columns.rows.map((row) => row.column_name);
    expect(names).toEqual(
      expect.arrayContaining([
        "id",
        "username",
        "email",
        "password_hash",
        "failed_attempts",
        "locked_until",
      ]),
    );

    await expect(
      client.query(
        "INSERT INTO users (username, email, password_hash) VALUES ('a', 'a@x.com', 'h'), ('a', 'b@x.com', 'h')",
      ),
    ).rejects.toThrow();
  });

  it("can be applied twice without error or duplicate history", async () => {
    const client = new PGlite();
    const db = drizzle(client);
    await migrate(db, { migrationsFolder });
    await expect(migrate(db, { migrationsFolder })).resolves.toBeUndefined();
  });
});
