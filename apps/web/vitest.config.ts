import { defineConfig } from "vitest/config";

// Unit tests only; the Playwright specs in tests/e2e run with `pnpm test:e2e`.
export default defineConfig({
  test: { include: ["tests/unit/**/*.test.ts"] },
});
