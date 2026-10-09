import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export function createDbClient(databaseUrl: string): PostgresJsDatabase {
  // `prepare: false`: el pooler de Neon (PgBouncer, modo transacción) no soporta
  // prepared statements. `max: 1`: en serverless cada instancia usa una sola conexión.
  const client = postgres(databaseUrl, { prepare: false, max: 1 });
  return drizzle(client);
}
