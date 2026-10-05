import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export function createDbClient(databaseUrl: string): PostgresJsDatabase {
  const client = postgres(databaseUrl);
  return drizzle(client);
}

export { sharedColumns } from "../schema/shared-columns";
