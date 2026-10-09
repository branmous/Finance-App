import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { expect, test, type Page } from "@playwright/test";

/**
 * Covers specs/006-deudas. Like the other specs it needs a reachable PostgreSQL
 * (DATABASE_URL); users are created through the seed command. Names carry a per-run
 * suffix, and debts start in far-future years so they never mix with real data.
 */

const PASSWORD = "e2e-test-password-123";
const OWNER = { email: "debt-owner@example.com", username: "debt-owner" };
const OTHER = { email: "debt-other@example.com", username: "debt-other" };
const packageDir = fileURLToPath(new URL("../../../../packages/db", import.meta.url));
const runId = Date.now().toString(36);
// Paid installments are expenses that outlive their debt, so each run files its debts under its own
// far-future year (distinct per second) and reruns never add up in the same month totals.
const YEAR = 2100 + (Math.floor(Date.now() / 1000) % 7800);

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

async function createCategory(page: Page, name: string) {
  await page.goto("/categories");
  await page.getByRole("button", { name: "New category" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByLabel("Type").selectOption({ label: "Fixed expenses" });
  await dialog.getByRole("button", { name: "Create category" }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
}

async function addDebt(
  page: Page,
  debt: { name: string; category: string; amount: string; start: string; end: string; paid: string },
) {
  await page.goto("/debts");
  await page.getByRole("button", { name: /^(New debt|Add your first debt)$/ }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("What is it for?").fill(debt.name);
  await dialog.getByLabel("Category").selectOption({ label: debt.category });
  await dialog.getByLabel("Monthly payment (COP)").fill(debt.amount);
  await dialog.getByLabel("First payment").fill(debt.start);
  await dialog.getByLabel("Last payment").fill(debt.end);
  await dialog.getByLabel("Installments already paid").fill(debt.paid);
  await dialog.getByRole("button", { name: "Add debt" }).click();
  await expect(page.getByTestId(`debt-${debt.name}`)).toBeVisible();
}

test.describe("debts", () => {
  test("registers a debt with the months already paid and shows its progress", async ({ page }) => {
    const category = `Insurance ${runId}`;
    const name = `Moto insurance ${runId}`;
    await signIn(page, OWNER.email);
    await createCategory(page, category);
    await page.goto("/debts");

    await page.getByRole("button", { name: /^(New debt|Add your first debt)$/ }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("What is it for?").fill(name);
    await dialog.getByLabel("Category").selectOption({ label: category });
    await dialog.getByLabel("Monthly payment (COP)").fill("300000");
    await dialog.getByLabel("First payment").fill(`${YEAR}-01`);
    await dialog.getByLabel("Last payment").fill(`${YEAR}-11`);
    await expect(dialog.getByTestId("debt-summary")).toContainText("11 installments");
    await dialog.getByLabel("Installments already paid").fill("3");
    await dialog.getByRole("button", { name: "Add debt" }).click();

    const card = page.getByTestId(`debt-${name}`);
    await expect(card.getByTestId("debt-progress")).toHaveText("3 of 11 paid");
    await expect(card.getByRole("button", { name: `January ${YEAR}, paid` })).toHaveAttribute("aria-pressed", "true");
    await expect(card.getByRole("button", { name: `April ${YEAR}, pending` })).toHaveAttribute("aria-pressed", "false");

    // The paid months are real expenses of their month, under the debt's category.
    await page.goto(`/monthly-expenses?period=${YEAR}-02`);
    await expect(page.getByTestId("month-total")).toHaveText(/300\.000/);
    await expect(page.getByText(category, { exact: true })).toBeVisible();
    await page.goto(`/monthly-expenses?period=${YEAR}-04`);
    await expect(page.getByTestId("month-total")).toHaveText(/0/);
  });

  test("ticks and unticks a month, keeping the monthly expenses in step", async ({ page }) => {
    const category = `Loans ${runId}`;
    const name = `Phone loan ${runId}`;
    await signIn(page, OWNER.email);
    await createCategory(page, category);
    await addDebt(page, { name, category, amount: "50000", start: `${YEAR + 1}-01`, end: `${YEAR + 1}-06`, paid: "0" });

    const card = page.getByTestId(`debt-${name}`);
    await expect(card.getByTestId("debt-progress")).toHaveText("0 of 6 paid");

    await card.getByRole("button", { name: `March ${YEAR + 1}, pending` }).click();
    await expect(card.getByTestId("debt-progress")).toHaveText("1 of 6 paid");
    await page.goto(`/monthly-expenses?period=${YEAR + 1}-03`);
    await expect(page.getByTestId("month-paid")).toHaveText(/50\.000/);

    await page.goto("/debts");
    await card.getByRole("button", { name: `March ${YEAR + 1}, paid` }).click();
    await expect(card.getByTestId("debt-progress")).toHaveText("0 of 6 paid");
    await page.goto(`/monthly-expenses?period=${YEAR + 1}-03`);
    await expect(page.getByTestId("month-total")).toHaveText(/0/);
  });

  test("edits a debt and deletes it while keeping what was paid", async ({ page }) => {
    const category = `Cards ${runId}`;
    const name = `Laptop ${runId}`;
    await signIn(page, OWNER.email);
    await createCategory(page, category);
    await addDebt(page, { name, category, amount: "100000", start: `${YEAR + 2}-01`, end: `${YEAR + 2}-04`, paid: "2" });

    const card = page.getByTestId(`debt-${name}`);
    await page.getByRole("button", { name: `Edit ${name}` }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Last payment").fill(`${YEAR + 2}-08`);
    await dialog.getByRole("button", { name: "Save changes" }).click();
    await expect(card.getByTestId("debt-progress")).toHaveText("2 of 8 paid");

    // Shrinking the range below a paid month is refused.
    await page.getByRole("button", { name: `Edit ${name}` }).click();
    await dialog.getByLabel("Last payment").fill(`${YEAR + 2}-01`);
    await dialog.getByRole("button", { name: "Save changes" }).click();
    await expect(dialog.getByText(/already paid outside this range/)).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();

    await page.getByRole("button", { name: `Delete ${name}` }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete debt" }).click();
    await expect(page.getByTestId(`debt-${name}`)).toHaveCount(0);

    await page.goto(`/monthly-expenses?period=${YEAR + 2}-01`);
    await expect(page.getByTestId("month-total")).toHaveText(/100\.000/);
  });

  test("keeps debts private to their owner", async ({ browser }) => {
    const category = `Private ${runId}`;
    const name = `Secret debt ${runId}`;
    const ownerPage = await (await browser.newContext()).newPage();
    await signIn(ownerPage, OWNER.email);
    await createCategory(ownerPage, category);
    await addDebt(ownerPage, { name, category, amount: "1000", start: `${YEAR + 3}-01`, end: `${YEAR + 3}-03`, paid: "0" });

    const otherPage = await (await browser.newContext()).newPage();
    await signIn(otherPage, OTHER.email);
    await otherPage.goto("/debts");
    await expect(otherPage.getByText(name)).toHaveCount(0);
  });
});
