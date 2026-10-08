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

/** A local calendar day relative to today, as YYYY-MM-DD (what a date input takes). */
function dayFromToday(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

async function createTrip(
  page: Page,
  fields: { name: string; kind: "Individual" | "Group"; people?: string; start?: string; end?: string },
) {
  await page.goto("/travels");
  await expect(page.getByRole("heading", { name: "Travels", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "New trip" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Trip name").fill(fields.name);
  await dialog.getByLabel("Type").selectOption({ label: fields.kind });
  if (fields.people) await dialog.getByLabel("People going").fill(fields.people);
  if (fields.start) await dialog.getByLabel("Start date (optional)").fill(fields.start);
  if (fields.end) await dialog.getByLabel("End date (optional)").fill(fields.end);
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

test("group trip: Settle up says who pays whom and marking it paid clears the balances", async ({ page }) => {
  const name = `Cartagena ${runId}`;
  await signIn(page, OWNER.email);
  await createTrip(page, { name, kind: "Group", people: "Brandon, Maria, Fanny" });
  await addExpense(page, { description: "Hotel", category: "Lodging", amount: "600000", status: "Paid", paidBy: "Brandon" });
  await addExpense(page, { description: "Flight", category: "Flights", amount: "300000", status: "Paid", paidBy: "Maria" });
  await addExpense(page, { description: "Tour", category: "Activities", amount: "90000", status: "Pending" });

  await page.getByRole("button", { name: "Settle up", exact: true }).click();
  const panel = page.getByTestId("settle-panel");
  // Everyone's part is 300.000: Brandon is owed 300.000, Maria is even and Fanny owes 300.000.
  await expect(panel.getByTestId("transfer-row")).toHaveCount(1);
  await expect(panel.getByTestId("transfer-row")).toContainText("Fanny pays Brandon");
  await expect(panel.getByTestId("transfer-row")).toContainText("300.000");
  await expect(panel).toContainText("1 expense is still pending and not included");

  // A new paid expense recalculates the open list at once.
  await addExpense(page, { description: "Taxi", category: "Transport", amount: "90000", status: "Paid", paidBy: "Maria" });
  await expect(panel.getByTestId("transfer-row")).toHaveCount(2);

  await panel.getByRole("button", { name: "Mark as paid: Fanny pays Brandon" }).click();
  await expect(panel.getByTestId("transfer-row")).toHaveCount(1);
  await panel.getByRole("button", { name: /^Mark as paid:/ }).click();
  await expect(panel).toContainText("Everyone is settled up.");
  for (const person of ["Brandon", "Maria", "Fanny"]) {
    await expect(page.getByTestId(`balance-${person}`)).toContainText("settled up");
  }

  // A payment marked by mistake can be undone.
  await page.getByRole("button", { name: /^Undo payment from Fanny/ }).first().click();
  await expect(panel.getByTestId("transfer-row")).not.toHaveCount(0);

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

test("trips show whether they are upcoming, in progress or finished, and can be filtered", async ({ page }) => {
  const upcoming = `Soon ${runId}`;
  const ongoing = `Now ${runId}`;
  const finished = `Past ${runId}`;
  await signIn(page, OWNER.email);
  await createTrip(page, { name: upcoming, kind: "Individual", start: dayFromToday(10), end: dayFromToday(12) });
  await createTrip(page, { name: ongoing, kind: "Individual", start: dayFromToday(-1), end: dayFromToday(1) });
  await createTrip(page, { name: finished, kind: "Individual", start: dayFromToday(-10), end: dayFromToday(-8) });

  // The detail of each trip says where it stands.
  await expect(page.getByTestId("trip-phase")).toHaveText("Finished");
  await expect(page.getByTestId("trip-phase-detail")).toHaveText("Ended 8 days ago");

  await page.goto("/travels");
  const card = (name: string) => page.getByRole("link", { name: new RegExp(name) });
  await expect(card(upcoming).getByTestId("trip-phase")).toHaveText("Upcoming");
  await expect(card(upcoming).getByTestId("trip-phase-detail")).toHaveText("Starts in 10 days");
  await expect(card(ongoing).getByTestId("trip-phase")).toHaveText("In progress");
  await expect(card(ongoing).getByTestId("trip-phase-detail")).toHaveText("Day 2 of 3 · 1 day left");
  await expect(card(ongoing).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
  await expect(card(finished).getByTestId("trip-phase")).toHaveText("Finished");

  // What is happening now comes before what is coming and before what is over.
  const names = await page.getByRole("heading", { level: 2 }).allTextContents();
  expect(names.indexOf(ongoing)).toBeLessThan(names.indexOf(upcoming));
  expect(names.indexOf(upcoming)).toBeLessThan(names.indexOf(finished));

  // The filter chips narrow the list.
  await page.getByRole("button", { name: /^Finished/ }).click();
  await expect(card(finished)).toBeVisible();
  await expect(card(upcoming)).toHaveCount(0);
  await expect(card(ongoing)).toHaveCount(0);
  await page.getByRole("button", { name: /^In progress/ }).click();
  await expect(card(ongoing)).toBeVisible();
  await expect(card(finished)).toHaveCount(0);
  await page.getByRole("button", { name: /^All/ }).click();
  await expect(card(upcoming)).toBeVisible();

  for (const name of [upcoming, ongoing, finished]) {
    await card(name).click();
    await deleteTrip(page);
  }
});

test("a trip with no dates shows no status", async ({ page }) => {
  const name = `Undated ${runId}`;
  await signIn(page, OWNER.email);
  await createTrip(page, { name, kind: "Individual" });
  await expect(page.getByTestId("trip-phase")).toHaveCount(0);
  await deleteTrip(page);
});

test("group trip: people are numbered and a fully paid trip gets the settled stamp", async ({ page }) => {
  const name = `Bogota ${runId}`;
  await signIn(page, OWNER.email);
  await createTrip(page, { name, kind: "Group", people: "Me, Ana, Leo" });
  await expect(page.getByTestId("person-number")).toHaveText(["1.", "2.", "3."]);
  await expect(page.getByTestId("balance-Ana").getByTestId("person-number")).toHaveText("2.");

  // Nothing is settled before there is anything paid.
  await expect(page.getByTestId("trip-settled")).toHaveCount(0);

  await addExpense(page, { description: "Cabin", category: "Lodging", amount: "900000", status: "Paid", paidBy: "Me" });
  await expect(page.getByTestId("trip-settled")).toHaveCount(0);

  await page.getByRole("button", { name: "Settle up", exact: true }).click();
  const panel = page.getByTestId("settle-panel");
  await panel.getByRole("button", { name: "Mark as paid: Ana pays Me" }).click();
  await expect(page.getByTestId("trip-settled")).toHaveCount(0);
  await panel.getByRole("button", { name: "Mark as paid: Leo pays Me" }).click();
  await expect(page.getByTestId("trip-settled")).toBeVisible();
  await expect(panel).toContainText("Every expense is paid and nobody owes anyone");

  // The stamp is also on the card in the list, and goes away if a new expense is still unpaid.
  await page.goto("/travels");
  await expect(page.getByRole("link", { name: new RegExp(name) }).getByTestId("trip-settled")).toBeVisible();
  await page.getByRole("link", { name: new RegExp(name) }).click();
  await addExpense(page, { description: "Dinner", category: "Food", amount: "60000", status: "Pending" });
  await expect(page.getByTestId("trip-settled")).toHaveCount(0);

  await deleteTrip(page);
});

test("individual trip: the settled stamp appears when every expense is paid", async ({ page }) => {
  const name = `Cusco ${runId}`;
  await signIn(page, OWNER.email);
  await createTrip(page, { name, kind: "Individual" });
  await addExpense(page, { description: "Flights", category: "Flights", amount: "1500000", status: "Pending" });
  await expect(page.getByTestId("trip-settled")).toHaveCount(0);
  await page.getByRole("button", { name: "Mark paid: Flights" }).click();
  await expect(page.getByTestId("trip-settled")).toBeVisible();
  await deleteTrip(page);
});
