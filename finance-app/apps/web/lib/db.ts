import { createDbClient } from "@finance-app/db";

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return databaseUrl;
}

export const db = createDbClient(getDatabaseUrl());
