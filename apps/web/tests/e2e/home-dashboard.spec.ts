import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { expect, test, type Page } from "@playwright/test";

/**
 * Covers specs/012-home-dashboard. Needs a reachable PostgreSQL (DATABASE_URL). The owner comes from the
 * dashboard seed fixture (packages/db/src/seed-dashboard-cli.ts), which wipes and reloads a known scenario
 * in March and February 2020, long past so every figure below is exact:
 *
 *   March:    income 5.000.000 · spent 2.500.000 (Rent 1.500.000, Streaming 100.000, Food 900.000 unpaid)
 *   February: income 5.000.000 · spent 2.200.000 (Food 600.000)
 *   debt of 200.000 for six months from January (all overdue today) · a finished, unsettled trip with a
 *   1.000.000 expense that must stay out of the month
 */

const PASSWORD = "e2e-test-password-123";
const OWNER = { email: "dash-owner@example.com", username: "dash-owner" };
const OTHER = { email: "dash-other@example.com", username: "dash-other" };
const packageDir = fileURLToPath(new URL("../../../../packages/db", import.meta.url));

function run(script: string, user: { email: string; username: string }) {
  execFileSync(
    process.execPath,
    ["--import", "tsx", script, "--email", user.email, "--username", user.username, "--password", PASSWORD],
    { cwd: packageDir, env: process.env, stdio: "pipe" },
  );
}

test.beforeAll(() => {
  run("src/seed-dashboard-cli.ts", OWNER);
  run("src/seed-user-cli.ts", OTHER);
});

async function signIn(page: Page, identifier: string) {
  await page.goto("/login");
  await page.getByLabel("Email or username").fill(identifier);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL("/");
}

/** The month before the current one as "YYYY-MM": what the home shows by default. */
function lastClosedMonth(): string {
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

test("compares March with February: flow, categories, commitments, debts, trend and alerts", async ({ page }) => {
  await signIn(page, OWNER.email);
  await page.goto("/?period=2020-03");

  await expect(page.getByTestId("dashboard-period")).toHaveText("March 2020 vs February 2020");

  // Cash flow, with the change against February spelled out.
  await expect(page.getByTestId("flow-income")).toContainText("5.000.000");
  await expect(page.getByTestId("flow-spent")).toContainText("2.500.000");
  await expect(page.getByTestId("flow-spent").locator("[data-direction]")).toHaveAttribute("data-direction", "up");
  await expect(page.getByTestId("flow-spent")).toContainText("300.000 (13.6%)");
  await expect(page.getByTestId("flow-left")).toContainText("2.500.000");
  await expect(page.getByTestId("flow-rate")).toContainText("50%");

  // Where it went: biggest peso change first, then by spending.
  const rows = page.getByTestId("category-rows").locator("[data-category]");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toHaveAttribute("data-category", "Food");
  await expect(rows.nth(0)).toContainText("300.000 (50%)");
  await expect(rows.nth(1)).toHaveAttribute("data-category", "Rent");
  await expect(rows.nth(2)).toHaveAttribute("data-category", "Streaming");

  // Fixed expenses plus subscriptions against income.
  await expect(page.getByTestId("commitment-total")).toContainText("1.600.000");
  await expect(page.getByTestId("commitment-share")).toHaveText("32% of your income");

  // Debts are shown apart.
  await expect(page.getByTestId("debts-monthly")).toContainText("200.000");
  await expect(page.getByTestId("debts-remaining")).toHaveText("6");
  await expect(page.getByTestId("debts-overdue")).toHaveText("6");

  // Six-month trend, described for assistive technology.
  await expect(page.getByTestId("trend-chart")).toHaveAttribute(
    "aria-label",
    /March 2020: income .*5\.000\.000, spent .*2\.500\.000/,
  );

  // Alerts, most severe first and capped at four: overdue installments, the food increase, the unpaid food
  // and the unsettled trip (subscriptions would be a fifth, so they wait).
  const alerts = page.getByTestId("alerts").locator("[data-alert]");
  await expect(alerts).toHaveCount(4);
  await expect(alerts.nth(0)).toHaveAttribute("data-alert", "overdueInstallments");
  await expect(alerts.nth(0)).toContainText("6 debt installments are overdue");
  await expect(alerts.nth(1)).toHaveAttribute("data-alert", "categoryRise");
  await expect(alerts.nth(1)).toContainText("Food rose 50%");
  await expect(alerts.nth(2)).toHaveAttribute("data-alert", "pendingPayments");
  await expect(alerts.nth(2)).toContainText("1 expense has no payment date");
  await expect(alerts.nth(3)).toHaveAttribute("data-alert", "unsettledTrips");
});

test("trips live in their own strip and never change the monthly totals", async ({ page }) => {
  await signIn(page, OWNER.email);
  await page.goto("/?period=2020-03");

  const trip = page.getByTestId("trips-strip").locator('[data-trip="Beach week"]');
  await expect(trip).toBeVisible();
  await expect(trip.getByTestId("trip-total")).toContainText("1.000.000");
  await expect(trip.getByTestId("trip-per-person")).toContainText("500.000");
  await expect(trip.getByTestId("trip-phase")).toHaveAttribute("data-phase", "finished");
  await expect(trip).toContainText("To settle");

  // The 1.000.000 spent on the trip in March is not part of March's spending, savings or categories.
  await expect(page.getByTestId("flow-spent")).toContainText("2.500.000");
  await expect(page.getByTestId("flow-spent")).not.toContainText("3.500.000");
  await expect(page.getByTestId("flow-left")).toContainText("2.500.000");
  await expect(page.getByTestId("category-rows").locator("[data-category]")).toHaveCount(3);

  await trip.getByRole("link").click();
  await expect(page).toHaveURL(/\/travels\/[0-9a-f-]{36}$/);
});

test("moves between months, and falls back to the last closed month for a bad or future period", async ({ page }) => {
  await signIn(page, OWNER.email);
  await page.goto("/?period=2020-03");

  await page.getByRole("link", { name: "Previous month" }).click();
  await expect(page).toHaveURL(/period=2020-02/);
  await expect(page.getByTestId("dashboard-period")).toHaveText("February 2020 vs January 2020");
  await expect(page.getByTestId("flow-spent")).toContainText("2.200.000");
  await expect(page.getByTestId("flow-spent")).toContainText("No data for January 2020");

  await page.getByRole("link", { name: "Next month" }).click();
  await expect(page.getByTestId("dashboard-period")).toHaveText("March 2020 vs February 2020");

  const expected = lastClosedMonth();
  for (const bad of ["abc", "2999-01", "2026-13"]) {
    await page.goto(`/?period=${bad}`);
    await expect(page.getByTestId("dashboard-period")).toHaveAttribute("data-period", expected);
  }
});

test("reminds which month is waiting to be loaded and links straight to it", async ({ page }) => {
  await signIn(page, OWNER.email);
  const month = lastClosedMonth();

  // The owner has nothing recorded in the last closed month.
  const banner = page.getByTestId("capture-banner");
  await expect(banner).toBeVisible();
  await expect(banner.getByRole("link")).toHaveAttribute("href", `/monthly-expenses?period=${month}`);
  await expect(page.getByText(/There is no income or spending in/)).toBeVisible();

  // The banner always points at the month before the current one, wherever the person is looking.
  await page.goto("/?period=2020-03");
  await expect(page.getByTestId("capture-banner")).toBeVisible();
  await expect(page.getByTestId("capture-banner").getByRole("link")).toHaveAttribute(
    "href",
    `/monthly-expenses?period=${month}`,
  );
});

test("shows the same dashboard in Spanish", async ({ page }) => {
  await signIn(page, OWNER.email);
  await page.goto("/?period=2020-03");
  await page.locator("select[aria-label]:visible").selectOption({ label: "Español" });

  await expect(page.getByRole("heading", { name: /Flujo del mes/ })).toBeVisible();
  await expect(page.getByTestId("flow-rate")).toContainText("50%");
  await expect(page.getByRole("heading", { name: "A dónde fue" })).toBeVisible();
  await expect(page.getByTestId("alerts").locator('[data-alert="categoryRise"]')).toContainText("Food subió 50%");
  await expect(page.getByRole("heading", { name: "Viajes" })).toBeVisible();
});

test("a different user sees none of it", async ({ page }) => {
  await signIn(page, OTHER.email);
  await page.goto("/?period=2020-03");

  await expect(page.getByText(/There is no income or spending in March 2020/)).toBeVisible();
  await expect(page.getByTestId("category-rows")).toHaveCount(0);
  await expect(page.getByTestId("trips-strip").locator("[data-trip]")).toHaveCount(0);
  await expect(page.getByText("Beach week")).toHaveCount(0);
  await expect(page.getByTestId("debts-monthly")).toHaveCount(0);
});
