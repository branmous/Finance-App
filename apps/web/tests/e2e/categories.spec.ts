import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { expect, test, type Page } from "@playwright/test";

/**
 * Covers specs/003-categorias-gastos. Like login.spec.ts it needs a reachable
 * PostgreSQL (DATABASE_URL); users are created through the seed command.
 * Category names carry a per-run suffix so reruns never collide with leftovers.
 */

const PASSWORD = "e2e-test-password-123";
const OWNER = { email: "cat-owner@example.com", username: "cat-owner" };
const OTHER = { email: "cat-other@example.com", username: "cat-other" };
const packageDir = fileURLToPath(new URL("../../../../packages/db", import.meta.url));
const runId = Date.now().toString(36);

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
  seedUser(OWNER);
  seedUser(OTHER);
});

async function signIn(page: Page, identifier: string) {
  await page.goto("/login");
  await page.getByLabel("Email or username").fill(identifier);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL("/");
}

async function openCategories(page: Page) {
  await page.getByRole("link", { name: "Categories" }).click();
  await expect(page).toHaveURL(/\/categories$/);
  await expect(page.getByRole("heading", { name: "Categories", level: 1 })).toBeVisible();
}

async function createCategory(page: Page, name: string, type = "Subscriptions") {
  await page.getByRole("button", { name: "New category" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByLabel("Type").selectOption({ label: type });
  await dialog.getByLabel("Blue").check({ force: true });
  await dialog.getByLabel("Icon plane").check({ force: true });
  await dialog.getByRole("button", { name: "Create category" }).click();
}

async function deleteCategory(page: Page, name: string) {
  await page.getByRole("button", { name: `Delete ${name}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete category" }).click();
  await expect(page.getByText(name, { exact: true })).toHaveCount(0);
}

test("the dashboard menu offers Categories and Log out", async ({ page }) => {
  await signIn(page, OWNER.email);
  await expect(page.getByText(/welcome back/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Categories" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
});

test("creates, edits and deletes a category", async ({ page }) => {
  const name = `Trip ${runId}`;
  const renamed = `Journey ${runId}`;
  await signIn(page, OWNER.email);
  await openCategories(page);

  await createCategory(page, name, "Travel");
  await expect(page.getByRole("heading", { name: "Travel", level: 2 })).toBeVisible();
  await expect(page.getByText(name, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: `Edit ${name}` }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill(renamed);
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText(renamed, { exact: true })).toBeVisible();
  await expect(page.getByText(name, { exact: true })).toHaveCount(0);

  await deleteCategory(page, renamed);
});

test("rejects a duplicate name ignoring case, and an empty name", async ({ page }) => {
  const name = `Netflix ${runId}`;
  await signIn(page, OWNER.email);
  await openCategories(page);
  await createCategory(page, name);
  await expect(page.getByText(name, { exact: true })).toBeVisible();

  await createCategory(page, name.toUpperCase());
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("You already have a category with this name.")).toBeVisible();

  await dialog.getByLabel("Name").fill("   ");
  await dialog.getByRole("button", { name: "Create category" }).click();
  await expect(dialog.getByText("Name is required.")).toBeVisible();

  await dialog.getByRole("button", { name: "Cancel" }).click();
  await deleteCategory(page, name);
});

test("a user never sees another user's categories", async ({ page }) => {
  const name = `Private ${runId}`;
  await signIn(page, OWNER.email);
  await openCategories(page);
  await createCategory(page, name);
  await expect(page.getByText(name, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await signIn(page, OTHER.email);
  await openCategories(page);
  await expect(page.getByText(name, { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Log out" }).click();

  await signIn(page, OWNER.email);
  await openCategories(page);
  await deleteCategory(page, name);
});

test("logging out ends the session and protects /categories", async ({ page }) => {
  await signIn(page, OWNER.email);
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/categories");
  await expect(page).toHaveURL(/\/login$/);
});

test("the menu stays reachable on a phone-sized screen without horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await signIn(page, OWNER.email);

  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("link", { name: "Categories" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});
