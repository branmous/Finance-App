/* eslint-disable no-console -- CLI entry point: console output is the interface */
import { createDbClient } from "./client";
import { createUserRepository } from "./user-repository";
import { parseSeedArgs, seedUser } from "./seed-user";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const input = parseSeedArgs(process.argv.slice(2));
  const db = createDbClient(databaseUrl);
  const result = await seedUser(createUserRepository(db), input);

  if (result.status === "already-exists") {
    console.log(`User with email or username "${input.email}" already exists. Nothing changed.`);
  } else {
    console.log(`Created user ${result.userId}.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
