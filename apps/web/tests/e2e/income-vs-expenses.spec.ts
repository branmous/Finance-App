import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { expect, test, type Page } from "@playwright/test";

/**
 * Covers specs/008-ingresos-vs-gastos. Needs a reachable PostgreSQL (DATABASE_URL).
 * Uses a far-future month so it never mixes with real data.
 */

const PASSWORD = "e2e-test-password-123";
const OWNER = { email: "bal-owner@example.com", username: "bal-owner" };
const packageDir = fileURLToPath(new URL("../../../../packages/db", import.meta.url));
const runId = Date.now().toString(36);
const PERIOD = "2033-03";

test.beforeAll(() => {
  execFileSync(
    process.execPath,
    ["--import", "tsx", "src/seed-user-cli.ts", "--email", OWNER.email, "--username", OWNER.username, "--password", PASSWORD],
    { cwd: packageDir, env: process.env, stdio: "pipe" },
  );
});

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email or username").fill(OWNER.email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL("/");
}

async function addExpense(page: Page, category: string, amount: string) {
  await page.getByRole("button", { name: "New expense" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Category").selectOption({ label: category });
  await dialog.getByLabel("Amount paid (COP)").fill(amount);
  await dialog.getByLabel("Date paid").fill("2033-03-05");
  await dialog.getByLabel("Counts toward month").fill(PERIOD);
  await dialog.getByRole("button", { name: "Add expense" }).click();
  await expect(dialog).toBeHidden();
}

async function addIncome(page: Page, amount: string) {
  await page.goto(`/monthly-income?period=${PERIOD}`);
  await page.getByRole("button", { name: "New income" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Amount received (COP)").fill(amount);
  await dialog.getByRole("button", { name: "Add income" }).click();
  await expect(dialog).toBeHidden();
}

test("compares the month's income with its spending", async ({ page }) => {
  const category = `Balance ${runId}`;
  await signIn(page);

  await page.goto("/categories");
  await page.getByRole("button", { name: "New category" }).first().click();
  const categoryDialog = page.getByRole("dialog");
  await categoryDialog.getByLabel("Name").fill(category);
  await categoryDialog.getByLabel("Type").selectOption({ label: "Fixed expenses" });
  await categoryDialog.getByRole("button", { name: "Create category" }).click();
  await expect(page.getByText(category, { exact: true })).toBeVisible();

  // No income yet: a hint instead of a comparison.
  await page.goto(`/monthly-expenses?period=${PERIOD}`);
  await expect(page.getByTestId("balance-status")).toContainText("No income recorded");

  await addIncome(page, "3000000");
  await page.goto(`/monthly-expenses?period=${PERIOD}`);
  await addExpense(page, category, "1000000");
  await expect(page.getByTestId("balance-income")).toContainText("3.000.000");
  await expect(page.getByTestId("balance-left")).toContainText("2.000.000");
  await expect(page.getByTestId("balance-left-now")).toContainText("2.000.000");

  await addExpense(page, category, "2500000");
  await expect(page.getByTestId("balance-status")).toContainText("Over budget by");
  await expect(page.getByTestId("balance-left")).toContainText("-");

  // Cleanup so reruns start from the same state.
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: `Delete ${category} expense` }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete expense" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
  }
  await page.goto(`/monthly-income?period=${PERIOD}`);
  await page.getByRole("button", { name: /Delete .* income/ }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete income" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.goto("/categories");
  await page.getByRole("button", { name: `Delete ${category}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete category" }).click();
  await expect(page.getByText(category, { exact: true })).toHaveCount(0);
});
