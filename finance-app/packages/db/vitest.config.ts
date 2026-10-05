import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // Each test boots an in-process PGlite (WASM Postgres) and hashes with bcrypt cost 12.
    testTimeout: 60_000,
  },
});
