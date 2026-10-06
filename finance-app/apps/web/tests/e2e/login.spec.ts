import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { expect, test, type Page } from "@playwright/test";

/**
 * Covers specs/002-login-usuario. These tests need a reachable PostgreSQL
 * (DATABASE_URL) because the login verifies credentials against the users
 * table. Test users are created through the same seed command the owner uses.
 */

const PASSWORD = "e2e-test-password-123";
const MAIN_USER = { email: "e2e@example.com", username: "e2e-user" };
const LOCKOUT_USER = { email: "lockout@example.com", username: "lockout-user" };
const packageDir = fileURLToPath(new URL("../../../../packages/db", import.meta.url));

function seedUser(user: { email: string; username: string }) {
  execFileSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "src/seed-user-cli.ts",
      "--email",
      user.email,
      "--username",
      user.username,
      "--password",
      PASSWORD,
    ],
    { cwd: packageDir, env: process.env, stdio: "pipe" },
  );
}

test.beforeAll(() => {
  seedUser(MAIN_USER);
  seedUser(LOCKOUT_USER);
});

async function submitLogin(page: Page, identifier: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email or username").fill(identifier);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

test("visiting / without a session redirects to /login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});

test("signing in with email and password reaches the welcome page", async ({ page }) => {
  await submitLogin(page, MAIN_USER.email, PASSWORD);
  await expect(page).toHaveURL("/");
  await expect(page.getByText(/welcome/i)).toBeVisible();
});

test("signing in with username and password reaches the welcome page", async ({ page }) => {
  await submitLogin(page, MAIN_USER.username, PASSWORD);
  await expect(page).toHaveURL("/");
});

test("a wrong password shows a generic error and stays on /login", async ({ page }) => {
  await submitLogin(page, MAIN_USER.email, "not-the-right-password");
  await expect(page.getByRole("alert")).toHaveText("Invalid email/username or password.");
  await expect(page).toHaveURL(/\/login$/);
});

test("an unknown identifier shows the same generic error", async ({ page }) => {
  await submitLogin(page, "nobody@example.com", PASSWORD);
  await expect(page.getByRole("alert")).toHaveText("Invalid email/username or password.");
});

test("five failed attempts lock the account even with the right password afterwards", async ({
  page,
}) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    await submitLogin(page, LOCKOUT_USER.username, "wrong-password-attempt");
    await expect(page.getByRole("alert")).toBeVisible();
  }

  await submitLogin(page, LOCKOUT_USER.username, PASSWORD);
  await expect(page.getByRole("alert")).toHaveText("Invalid email/username or password.");
  await expect(page).toHaveURL(/\/login$/);
});
