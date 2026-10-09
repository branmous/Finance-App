import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    // The app follows the browser language until a language is chosen; the specs assert English text.
    locale: "en-US",
    trace: "on-first-retry",
  },
  webServer: {
    // Auth.js's CSRF cookie is unreliable under Next.js dev-mode hot reload
    // (Fast Refresh can invalidate the cookie mid-request); building and
    // starting a production server avoids that entirely, which is also
    // what CI should exercise.
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
