import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Covers specs/011-carga-masiva-gastos. Like monthly-expenses.spec.ts it needs a reachable
 * PostgreSQL (DATABASE_URL); users come from the seed command, category names carry a per-run
 * suffix and every test loads a far-future month of its own so totals never mix.
 */

const PASSWORD = "e2e-test-password-123";
const OWNER = { email: "bulk-owner@example.com", username: "bulk-owner" };
const OTHER = { email: "bulk-other@example.com", username: "bulk-other" };
const packageDir = fileURLToPath(new URL("../../../../packages/db", import.meta.url));
const runId = Date.now().toString(36);

const MONTHS = { load: "2032-03", errors: "2032-04" };

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

async function logOut(page: Page) {
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

async function createCategory(page: Page, name: string) {
  await page.goto("/categories");
  await page.getByRole("button", { name: "New category" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByLabel("Type").selectOption({ label: "Fixed expenses" });
  await dialog.getByRole("button", { name: "Create category" }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
}

async function deleteCategory(page: Page, name: string) {
  await page.goto("/categories");
  await page.getByRole("button", { name: `Delete ${name}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete category" }).click();
  await expect(page.getByText(name, { exact: true })).toHaveCount(0);
}

async function openMonth(page: Page, period: string) {
  await page.goto(`/monthly-expenses?period=${period}`);
  await expect(page.getByRole("heading", { name: "Monthly expenses", level: 1 })).toBeVisible();
}

async function deleteExpense(page: Page, category: string) {
  await page.getByRole("button", { name: `Delete ${category} expense` }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete expense" }).click();
}

async function openBulkDialog(page: Page) {
  await page.getByRole("button", { name: "Bulk upload" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Month to load")).toBeVisible();
  return dialog;
}

async function chooseCsv(dialog: Locator, content: string) {
  await dialog.getByLabel("CSV file").setInputFiles({
    name: "expenses.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(content, "utf8"),
  });
}

test("downloads the template and loads a month of expenses, all independent", async ({ page }) => {
  const rent = `Bulk rent ${runId}`;
  const market = `Bulk market, ${runId}`;
  await signIn(page, OWNER.email);
  await createCategory(page, rent);
  await createCategory(page, market);

  await openMonth(page, MONTHS.load);
  let dialog = await openBulkDialog(page);

  // The template lists the user's categories, quoting the one with a comma.
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    dialog.getByRole("link", { name: "Download template" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("expenses-template.csv");
  const template = readFileSync(await download.path(), "utf8");
  expect(template).toContain("category,amount,paidOn,note");
  expect(template).toContain(`${rent},,,`);
  expect(template).toContain(`"${market}",,,`);

  // Untouched template rows are skipped; the filled ones become expenses.
  await dialog.getByLabel("Month to load").fill(MONTHS.load);
  await chooseCsv(
    dialog,
    [
      "category,amount,paidOn,note",
      `${rent},"$1.500.000",2032-03-05,March rent`,
      `"${market}",250000,,`,
      `${rent},,,`,
    ].join("\n"),
  );
  await expect(dialog.getByText(/^2 expenses · .*1\.750\.000$/)).toBeVisible();
  await expect(dialog.getByText(/already has/)).toHaveCount(0);

  await dialog.getByRole("button", { name: "Add 2 expenses" }).click();
  await expect(dialog.getByText("2 expenses added to March 2032.")).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).last().click();

  await expect(page.getByTestId("month-total")).toContainText("1.750.000");
  await expect(page.getByTestId("month-paid")).toContainText("1.500.000");
  await expect(page.getByTestId("month-pending")).toContainText("250.000");
  await expect(page.getByText("March rent")).toBeVisible();
  await expect(page.getByText(/Paid with/)).toHaveCount(0);

  // Loading again warns that the month already has expenses and only adds.
  dialog = await openBulkDialog(page);
  await chooseCsv(dialog, `category,amount,paidOn,note\n${rent},10,,`);
  await expect(dialog.getByText(/March 2032 already has 2 expenses/)).toBeVisible();
  await dialog.getByRole("button", { name: "Add 1 expense" }).click();
  await expect(dialog.getByText("1 expense added to March 2032.")).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).last().click();
  await expect(page.getByTestId("month-total")).toContainText("1.750.010");

  await deleteExpense(page, rent);
  await deleteExpense(page, rent);
  await deleteExpense(page, market);
  await deleteCategory(page, rent);
  await deleteCategory(page, market);
});

test("reports every problem with its line and saves nothing", async ({ page }) => {
  const rent = `Bulk err ${runId}`;
  await signIn(page, OWNER.email);
  await createCategory(page, rent);

  await openMonth(page, MONTHS.errors);
  const dialog = await openBulkDialog(page);
  await dialog.getByLabel("Month to load").fill(MONTHS.errors);

  await chooseCsv(dialog, `category,amount,paidOn,note\n${rent},100,,\nGhost ${runId},50,,\n${rent},abc,,`);
  const problems = dialog.getByRole("alert");
  await expect(problems).toContainText("Nothing was saved");
  await expect(problems).toContainText(`Line 3, category: The category "Ghost ${runId}" does not exist.`);
  await expect(problems).toContainText("Line 4, amount");
  await expect(dialog.getByRole("button", { name: /^Add \d+ expenses?$/ })).toBeDisabled();

  // A parent column is refused, so a file can never link an expense to another one.
  await chooseCsv(dialog, `category,amount,paidOn,note,parent\n${rent},100,,,Card`);
  await expect(problems).toContainText('The column "parent" is not allowed');

  // A missing column is reported too.
  await chooseCsv(dialog, `category,amount\n${rent},100`);
  await expect(problems).toContainText('missing the "paidOn" column');

  await dialog.getByRole("button", { name: "Cancel" }).click();
  await openMonth(page, MONTHS.errors);
  await expect(page.getByText("No expenses in April 2032")).toBeVisible();
  await deleteCategory(page, rent);
});

test("the template only lists the user's own categories and needs a session", async ({ page, request }) => {
  const rent = `Bulk private ${runId}`;

  // No session: the middleware sends the request to the login page instead of serving a file.
  const anonymous = await request.get("/monthly-expenses/template", { maxRedirects: 0 });
  expect(anonymous.status()).toBeGreaterThanOrEqual(300);
  expect(anonymous.status()).toBeLessThan(400);

  await signIn(page, OWNER.email);
  await createCategory(page, rent);
  await logOut(page);

  await signIn(page, OTHER.email);
  const response = await page.request.get("/monthly-expenses/template");
  expect(response.ok()).toBe(true);
  expect(await response.text()).not.toContain(rent);

  await logOut(page);

  await signIn(page, OWNER.email);
  await deleteCategory(page, rent);
});
