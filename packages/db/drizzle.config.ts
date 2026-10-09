import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./schema/**/*.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://finance_app:finance_app@localhost:5432/finance_app",
  },
});
