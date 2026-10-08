import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { expect, test, type Page } from "@playwright/test";

/**
 * Covers specs/009-viajes. Needs a reachable PostgreSQL (DATABASE_URL) with the 0008_travels
 * migration applied; users are created through the seed command. Every test files its trip under
 * a name with a per-run suffix and deletes it at the end, so it never mixes with real data.
 */

const PASSWORD = "e2e-test-password-123";
const OWNER = { email: "trip-owner@example.com", username: "trip-owner" };
const OTHER = { email: "trip-other@example.com", username: "trip-other" };
const packageDir = fileURLToPath(new URL("../../../../packages/db", import.meta.url));
const runId = Date.now().toString(36);

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

async function createTrip(page: Page, fields: { name: string; kind: "Individual" | "Group"; people?: string }) {
  await page.goto("/travels");
  await expect(page.getByRole("heading", { name: "Travels", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "New trip" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Trip name").fill(fields.name);
  await dialog.getByLabel("Type").selectOption({ label: fields.kind });
  if (fields.people) await dialog.getByLabel("People going").fill(fields.people);
  await dialog.getByRole("button", { name: "Create trip" }).click();
  await expect(page.getByRole("heading", { name: fields.name, level: 1 })).toBeVisible();
}

async function addExpense(
  page: Page,
  fields: { description: string; category: string; amount: string; status: "Paid" | "Pending"; paidBy?: string },
) {
  await page.getByRole("button", { name: "New expense" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("What is it?").fill(fields.description);
  await dialog.getByLabel("Category").selectOption({ label: fields.category });
  await dialog.getByLabel("Total amount (COP)").fill(fields.amount);
  await dialog.getByLabel("Status").selectOption({ label: fields.status });
  if (fields.paidBy) await dialog.getByLabel("Who paid?").selectOption({ label: fields.paidBy });
  await dialog.getByRole("button", { name: "Add expense" }).click();
  await expect(dialog).toBeHidden();
}

async function deleteTrip(page: Page) {
  await page.getByRole("button", { name: "Delete trip" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete trip" }).click();
  await expect(page).toHaveURL(/\/travels$/);
}

test("individual trip: adds expenses by category, marks one paid and totals them", async ({ page }) => {
  const name = `Punta Cana ${runId}`;
  await signIn(page, OWNER.email);
  await createTrip(page, { name, kind: "Individual" });
  await expect(page.getByTestId("trip-total")).toContainText("0");

  await addExpense(page, { description: "Flights", category: "Flights", amount: "1800000", status: "Pending" });
  await addExpense(page, { description: "Hotel", category: "Lodging", amount: "2500000", status: "Paid" });

  await expect(page.getByTestId("trip-total")).toContainText("4.300.000");
  await expect(page.getByTestId("trip-paid")).toContainText("2.500.000");
  await expect(page.getByTestId("trip-pending")).toContainText("1.800.000");
  await expect(page.getByRole("list", { name: "By category" })).toContainText("Lodging");

  await page.getByRole("button", { name: "Mark paid: Flights" }).click();
  await expect(page.getByTestId("trip-paid")).toContainText("4.300.000");
  await expect(page.getByTestId("trip-pending")).toContainText("0");

  // An individual trip has no balances or people to split with.
  await expect(page.getByText("Who owes whom")).toHaveCount(0);

  await deleteTrip(page);
});

test("group trip: splits an expense, recalculates when someone is left out and when it is unpaid", async ({ page }) => {
  const name = `Santander ${runId}`;
  await signIn(page, OWNER.email);
  await createTrip(page, { name, kind: "Group", people: "Me, Ana, Leo" });

  await addExpense(page, { description: "Hotel", category: "Lodging", amount: "900000", status: "Paid", paidBy: "Me" });
  await expect(page.getByTestId("balance-Me")).toContainText("is owed");
  await expect(page.getByTestId("balance-Me")).toContainText("600.000");
  await expect(page.getByTestId("balance-Ana")).toContainText("owes");
  await expect(page.getByTestId("balance-Ana")).toContainText("300.000");

  // Leaving Leo out recalculates the other two parts at once.
  await page.getByRole("button", { name: "Leo pays for Hotel" }).click();
  await expect(page.getByTestId("expense-each")).toContainText("450.000");
  await expect(page.getByTestId("balance-Ana")).toContainText("450.000");
  await expect(page.getByTestId("balance-Leo")).toContainText("settled up");

  // Putting Leo back and marking the expense as not paid yet clears every balance.
  await page.getByRole("button", { name: "Leo pays for Hotel" }).click();
  await page.getByLabel("Paid by for Hotel").selectOption({ label: "Not paid yet" });
  await expect(page.getByTestId("balance-Me")).toContainText("settled up");
  await expect(page.getByTestId("trip-pending")).toContainText("900.000");

  await deleteTrip(page);
});

test("group trip: a payment between people settles the balances", async ({ page }) => {
  const name = `Cartagena ${runId}`;
  await signIn(page, OWNER.email);
  await createTrip(page, { name, kind: "Group", people: "Me, Ana" });
  await addExpense(page, { description: "Boat", category: "Activities", amount: "400000", status: "Paid", paidBy: "Me" });
  await expect(page.getByTestId("balance-Ana")).toContainText("200.000");

  await page.getByRole("button", { name: "Record payment" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Paid by").selectOption({ label: "Ana" });
  await dialog.getByLabel("Received by").selectOption({ label: "Me" });
  await dialog.getByLabel("Amount (COP)").fill("200000");
  await dialog.getByRole("button", { name: "Record payment" }).click();
  await expect(dialog).toBeHidden();

  await expect(page.getByTestId("balance-Ana")).toContainText("settled up");
  await expect(page.getByTestId("balance-Me")).toContainText("settled up");

  await deleteTrip(page);
});

test("group trip: someone who paid cannot be removed; a new person can be added", async ({ page }) => {
  const name = `Medellin ${runId}`;
  await signIn(page, OWNER.email);
  await createTrip(page, { name, kind: "Group", people: "Me, Ana, Leo" });
  await addExpense(page, { description: "Taxi", category: "Transport", amount: "60000", status: "Paid", paidBy: "Ana" });

  await page.getByRole("button", { name: "Remove Ana" }).click();
  await expect(page.getByRole("alert")).toContainText("cannot be removed");

  await page.getByLabel("Add a person").fill("Sofia");
  await page.getByRole("button", { name: "Add person" }).click();
  await expect(page.getByTestId("balance-Sofia")).toBeVisible();

  await deleteTrip(page);
});

test("rejects an invalid trip and an invalid amount", async ({ page }) => {
  await signIn(page, OWNER.email);
  await page.goto("/travels");
  await page.getByRole("button", { name: "New trip" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Type").selectOption({ label: "Group" });
  await dialog.getByLabel("Trip name").fill(`Invalid ${runId}`);
  await dialog.getByLabel("People going").fill("Me");
  await dialog.getByRole("button", { name: "Create trip" }).click();
  await expect(dialog.getByText("A group trip needs at least two people.")).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();

  const name = `Validation ${runId}`;
  await createTrip(page, { name, kind: "Individual" });
  await page.getByRole("button", { name: "New expense" }).first().click();
  const expense = page.getByRole("dialog");
  await expense.getByLabel("What is it?").fill("Free?");
  await expense.getByLabel("Total amount (COP)").fill("0");
  await expense.getByRole("button", { name: "Add expense" }).click();
  await expect(expense.getByText("Enter an amount greater than zero.")).toBeVisible();
  await expense.getByRole("button", { name: "Cancel" }).click();

  await deleteTrip(page);
});

test("another user does not see my trip, and the page requires sign in", async ({ page }) => {
  await page.goto("/travels");
  await expect(page).toHaveURL(/\/login/);

  const name = `Private ${runId}`;
  await signIn(page, OWNER.email);
  await createTrip(page, { name, kind: "Individual" });
  const tripUrl = page.url();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await signIn(page, OTHER.email);
  await page.goto("/travels");
  await expect(page.getByText(name)).toHaveCount(0);
  const response = await page.goto(tripUrl);
  expect(response?.status()).toBe(404);
  await page.goto("/");
  await page.getByRole("button", { name: "Log out" }).click();

  await signIn(page, OWNER.email);
  await page.goto(tripUrl);
  await deleteTrip(page);
});

test("is reachable from the menu", async ({ page }) => {
  await signIn(page, OWNER.email);
  await page.getByRole("link", { name: "Travels" }).first().click();
  await expect(page).toHaveURL(/\/travels/);
});
