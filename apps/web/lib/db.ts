import { createDbClient, type DbClient } from "@finance-app/db";

let client: DbClient | undefined;

export function getDb(): DbClient {
  if (!client) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    client = createDbClient(databaseUrl);
  }
  return client;
}
