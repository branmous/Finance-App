import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { fileURLToPath } from "node:url";

/**
 * Applies pending migrations from ../migrations. Safe to run repeatedly:
 * Drizzle tracks applied migrations in its own history table, so re-running
 * this script is a no-op once every migration has already been applied
 * (FR-007 — idempotent migration process).
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const migrationClient = postgres(databaseUrl, { max: 1 });
  const db = drizzle(migrationClient);

  await migrate(db, { migrationsFolder: fileURLToPath(new URL("../migrations", import.meta.url)) });

  await migrationClient.end();
}

main()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log("Migrations applied successfully.");
  })
  .catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error("Migration failed:", error);
    process.exitCode = 1;
  });
