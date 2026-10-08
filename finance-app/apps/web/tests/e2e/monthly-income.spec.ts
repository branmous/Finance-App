import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { expect, test, type Page } from "@playwright/test";

/**
 * Covers specs/007-ingresos-mensuales. Needs a reachable PostgreSQL (DATABASE_URL);
 * users are created through the seed command. Incomes are filed under far-future
 * months, one per test, so they never mix with real data or with each other.
 */

const PASSWORD = "e2e-test-password-123";
const OWNER = { email: "inc-owner@example.com", username: "inc-owner" };
const OTHER = { email: "inc-other@example.com", username: "inc-other" };
const packageDir = fileURLToPath(new URL("../../../../packages/db", import.meta.url));
const runId = Date.now().toString(36);

const MONTHS = { basic: "2032-03", validation: "2032-04", privacy: "2032-05", guard: "2032-06" };

function seedUser(user: { email: string; username: string }) {
  execFileSync(
    process.execPath,
    ["--import", "tsx", "src/seed-user-cli.ts", "--email", user.email, "--username", user.username, "--password", PASSWORD],
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

async function openMonth(page: Page, period: string) {
  await page.goto(`/monthly-income?period=${period}`);
  await expect(page.getByRole("heading", { name: "Monthly income", level: 1 })).toBeVisible();
}

async function addIncome(page: Page, fields: { type: string; amount: string; note: string }) {
  await page.getByRole("button", { name: "New income" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Type").selectOption({ label: fields.type });
  await dialog.getByLabel("Amount received (COP)").fill(fields.amount);
  await dialog.getByLabel("Note (optional)").fill(fields.note);
  await dialog.getByRole("button", { name: "Add income" }).click();
  await expect(dialog).toBeHidden();
}

async function deleteIncome(page: Page, typeLabel: string) {
  await page.getByRole("button", { name: `Delete ${typeLabel} income` }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete income" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
}

test("adds incomes, sums the month, edits and deletes", async ({ page }) => {
  await signIn(page, OWNER.email);
  await openMonth(page, MONTHS.basic);
  await expect(page.getByTestId("month-total")).toContainText("0");

  await addIncome(page, { type: "Payroll", amount: "3000000", note: `salary ${runId}` });
  await addIncome(page, { type: "Freelance", amount: "500000", note: `gig ${runId}` });
  await expect(page.getByText("2 incomes")).toBeVisible();
  await expect(page.getByTestId("month-total")).toContainText("3.500.000");

  await page.getByRole("button", { name: "Edit Freelance income" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Amount received (COP)").fill("700000");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId("month-total")).toContainText("3.700.000");

  await deleteIncome(page, "Freelance");
  await deleteIncome(page, "Payroll");
  await expect(page.getByText("No income in")).toBeVisible();
});

test("rejects an invalid amount", async ({ page }) => {
  await signIn(page, OWNER.email);
  await openMonth(page, MONTHS.validation);
  await page.getByRole("button", { name: "New income" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Amount received (COP)").fill("0");
  await dialog.getByRole("button", { name: "Add income" }).click();
  await expect(dialog.getByText("Enter an amount greater than zero.")).toBeVisible();
});

test("another user does not see my incomes", async ({ page }) => {
  await signIn(page, OWNER.email);
  await openMonth(page, MONTHS.privacy);
  await addIncome(page, { type: "Payroll", amount: "1234567", note: `private ${runId}` });
  await expect(page.getByTestId("month-total")).toContainText("1.234.567");
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await signIn(page, OTHER.email);
  await openMonth(page, MONTHS.privacy);
  await expect(page.getByText(`private ${runId}`)).toHaveCount(0);
  await expect(page.getByTestId("month-total")).not.toContainText("1.234.567");
  await page.getByRole("button", { name: "Log out" }).click();

  await signIn(page, OWNER.email);
  await openMonth(page, MONTHS.privacy);
  await deleteIncome(page, "Payroll");
});

test("requires sign in and is reachable from the menu", async ({ page }) => {
  await page.goto("/monthly-income");
  await expect(page).toHaveURL(/\/login/);

  await signIn(page, OWNER.email);
  await page.getByRole("link", { name: "Monthly income" }).first().click();
  await expect(page).toHaveURL(/\/monthly-income/);
  await openMonth(page, MONTHS.guard);
});
