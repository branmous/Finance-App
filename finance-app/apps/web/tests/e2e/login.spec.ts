import { expect, test } from "@playwright/test";

/**
 * Covers the three auth contract cases from specs/001-cimientos/contracts/auth.md:
 * 1. No session -> redirected to /login
 * 2. Authenticated with a non-authorized email -> redirected to /denied, never sees "/"
 * 3. Authenticated with AUTHORIZED_EMAIL -> sees the welcome page at "/"
 *
 * The authorized/unauthorized sign-in is driven by the test-only credentials
 * provider (see lib/auth.ts), enabled only when NODE_ENV !== "production".
 */

test.describe("Foundations: authenticated access", () => {
  test("visiting / without a session redirects to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("signing in with a non-authorized email is denied", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("someone-else@example.com");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/denied$/);
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("signing in with the authorized email reaches the welcome page", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(process.env.AUTHORIZED_EMAIL ?? "you@example.com");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText(/welcome/i)).toBeVisible();
  });
});
