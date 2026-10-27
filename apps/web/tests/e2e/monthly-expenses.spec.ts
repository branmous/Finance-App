import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Covers specs/004-gastos-mensuales. Like categories.spec.ts it needs a reachable
 * PostgreSQL (DATABASE_URL); users are created through the seed command.
 * Category names carry a per-run suffix so reruns never collide with leftovers.
 * Expenses are filed under far-future months so they never mix with real data.
 */

const PASSWORD = "e2e-test-password-123";
const OWNER = { email: "exp-owner@example.com", username: "exp-owner" };
const OTHER = { email: "exp-other@example.com", username: "exp-other" };
const packageDir = fileURLToPath(new URL("../../../../packages/db", import.meta.url));
const runId = Date.now().toString(36);

// Each test uses its own month so totals are isolated from each other.
const MONTHS = {
  basic: "2031-03",
  late: "2031-04",
  edit: "2031-05",
  privacy: "2031-06",
  guard: "2031-07",
  link: "2031-08",
  linkNext: "2031-09",
  linkDelete: "2031-10",
};

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

/** `paidOn: null` leaves the expense pending (not paid yet). */
type ExpenseFields = {
  category: string;
  amount: string;
  paidOn: string | null;
  period: string;
  note?: string;
  /** Category name of the expense this one was paid with (it must already exist in that month). */
  paidWith?: string;
};

function monthOf(offset: number): string {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Types part of the name in the category search box and picks the matching option. */
async function pickCategory(dialog: Locator, name: string) {
  const search = dialog.getByRole("combobox", { name: "Category" });
  await search.fill(name);
  await dialog.getByRole("option", { name, exact: true }).click();
  await expect(search).toHaveValue(name);
}

async function addExpense(page: Page, fields: ExpenseFields) {
  await page.getByRole("button", { name: "New expense" }).first().click();
  const dialog = page.getByRole("dialog");
  await pickCategory(dialog, fields.category);
  await dialog.getByLabel("Amount paid (COP)").fill(fields.amount);
  if (fields.paidOn === null) {
    await dialog.getByLabel("Already paid").uncheck();
  } else {
    await dialog.getByLabel("Date paid").fill(fields.paidOn);
  }
  await dialog.getByLabel("Counts toward month").fill(fields.period);
  if (fields.paidWith) {
    const select = dialog.getByLabel("Paid with (optional)");
    const value = await select.locator("option", { hasText: fields.paidWith }).getAttribute("value");
    await select.selectOption(value!);
  }
  if (fields.note) await dialog.getByLabel("Note (optional)").fill(fields.note);
  await dialog.getByRole("button", { name: "Add expense" }).click();
  await expect(dialog).toBeHidden();
}

async function deleteExpense(page: Page, category: string) {
  await page.getByRole("button", { name: `Delete ${category} expense` }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete expense" }).click();
}

test("records an expense and shows the month total", async ({ page }) => {
  const rent = `Rent ${runId}`;
  await signIn(page, OWNER.email);
  await createCategory(page, rent);

  await openMonth(page, MONTHS.basic);
  await expect(page.getByTestId("month-total")).toContainText("0");
  await addExpense(page, { category: rent, amount: "2000000", paidOn: "2031-03-05", period: MONTHS.basic });
  await addExpense(page, { category: rent, amount: "350.000", paidOn: "2031-03-10", period: MONTHS.basic });

  await expect(page.getByTestId("month-total")).toContainText("2.350.000");
  await expect(page.getByText("2 expenses")).toBeVisible();

  await deleteExpense(page, rent);
  await deleteExpense(page, rent);
  await expect(page.getByTestId("month-total")).not.toContainText("2.");
  await deleteCategory(page, rent);
});

test("creates a category from the expense form and uses it right away", async ({ page }) => {
  const name = `Inline ${runId}`;
  await signIn(page, OWNER.email);
  await createCategory(page, `Seed ${runId}`); // the form needs at least one category to open

  await openMonth(page, MONTHS.basic);
  await page.getByRole("button", { name: "New expense" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Category" }).fill(name);
  await dialog.getByRole("option", { name: `Create “${name}”` }).click();

  await expect(dialog.getByLabel("Name")).toHaveValue(name);
  await dialog.getByRole("button", { name: "Save category" }).click();
  await expect(dialog.getByRole("combobox", { name: "Category" })).toHaveValue(name);

  await dialog.getByLabel("Amount paid (COP)").fill("12000");
  await dialog.getByLabel("Date paid").fill("2031-03-02");
  await dialog.getByRole("button", { name: "Add expense" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(name, { exact: true })).toBeVisible();

  await deleteExpense(page, name);
  await deleteCategory(page, name);
  await deleteCategory(page, `Seed ${runId}`);
});

test("a late payment counts toward the month it belongs to, and past months can be browsed", async ({ page }) => {
  const rent = `Late rent ${runId}`;
  await signIn(page, OWNER.email);
  await createCategory(page, rent);

  // April's rent paid on May 3rd.
  await openMonth(page, MONTHS.late);
  await addExpense(page, {
    category: rent,
    amount: "1500000",
    paidOn: "2031-05-03",
    period: MONTHS.late,
    note: "paid late",
  });
  await expect(page.getByTestId("month-total")).toContainText("1.500.000");
  await expect(page.getByText("paid late")).toBeVisible();

  // It does not count toward the month it was paid in.
  await page.getByRole("link", { name: "Next month" }).click();
  await expect(page).toHaveURL(new RegExp(`period=${MONTHS.edit}$`));
  await expect(page.getByRole("heading", { name: "May 2031", level: 2, exact: true })).toBeVisible();
  await expect(page.getByText("No expenses in May 2031")).toBeVisible();

  // Going back one month shows the expense and its total again.
  await page.getByRole("link", { name: "Previous month" }).click();
  await expect(page.getByRole("heading", { name: "April 2031", level: 2, exact: true })).toBeVisible();
  await expect(page.getByTestId("month-total")).toContainText("1.500.000");

  await deleteExpense(page, rent);
  await deleteCategory(page, rent);
});

test("edits an expense and the total follows", async ({ page }) => {
  const rent = `Edit rent ${runId}`;
  await signIn(page, OWNER.email);
  await createCategory(page, rent);

  await openMonth(page, MONTHS.edit);
  await addExpense(page, { category: rent, amount: "100000", paidOn: "2031-05-02", period: MONTHS.edit });
  await expect(page.getByTestId("month-total")).toContainText("100.000");

  await page.getByRole("button", { name: `Edit ${rent} expense` }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Amount paid (COP)").fill("250000");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId("month-total")).toContainText("250.000");

  await deleteExpense(page, rent);
  await deleteCategory(page, rent);
});

test("validates the amount", async ({ page }) => {
  const rent = `Valid rent ${runId}`;
  await signIn(page, OWNER.email);
  await createCategory(page, rent);

  await openMonth(page, MONTHS.guard);
  await page.getByRole("button", { name: "New expense" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Amount paid (COP)").fill("0");
  await dialog.getByRole("button", { name: "Add expense" }).click();
  await expect(dialog.getByText("Enter an amount greater than zero.")).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();

  await deleteCategory(page, rent);
});

test("a category with expenses cannot be deleted until they are removed", async ({ page }) => {
  const rent = `Guarded ${runId}`;
  await signIn(page, OWNER.email);
  await createCategory(page, rent);
  await openMonth(page, MONTHS.guard);
  await addExpense(page, { category: rent, amount: "10000", paidOn: "2031-07-01", period: MONTHS.guard });

  await page.goto("/categories");
  await page.getByRole("button", { name: `Delete ${rent}` }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Delete category" }).click();
  await expect(dialog.getByRole("alert")).toContainText("has expenses");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText(rent, { exact: true })).toBeVisible();

  await openMonth(page, MONTHS.guard);
  await deleteExpense(page, rent);
  await deleteCategory(page, rent);
});

test("a user never sees another user's expenses", async ({ page }) => {
  const rent = `Private ${runId}`;
  await signIn(page, OWNER.email);
  await createCategory(page, rent);
  await openMonth(page, MONTHS.privacy);
  await addExpense(page, { category: rent, amount: "777000", paidOn: "2031-06-01", period: MONTHS.privacy });
  await expect(page.getByTestId("month-total")).toContainText("777.000");
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await signIn(page, OTHER.email);
  await openMonth(page, MONTHS.privacy);
  await expect(page.getByText(rent)).toHaveCount(0);
  await expect(page.getByTestId("month-total")).not.toContainText("777.000");
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await signIn(page, OWNER.email);
  await openMonth(page, MONTHS.privacy);
  await deleteExpense(page, rent);
  await deleteCategory(page, rent);
});

test("the page is protected and the menu links to it", async ({ page }) => {
  await page.goto("/monthly-expenses");
  await expect(page).toHaveURL(/\/login$/);

  await signIn(page, OWNER.email);
  await page.getByRole("link", { name: "Monthly expenses", exact: true }).click();
  await expect(page).toHaveURL(/\/monthly-expenses$/);
});

test("an expense can be tracked without a paid date and marked as paid later", async ({ page }) => {
  const rent = `Pending rent ${runId}`;
  await signIn(page, OWNER.email);
  await createCategory(page, rent);

  await openMonth(page, MONTHS.guard);
  await addExpense(page, { category: rent, amount: "900000", paidOn: null, period: MONTHS.guard });
  await addExpense(page, { category: rent, amount: "100000", paidOn: "2031-07-02", period: MONTHS.guard });

  await expect(page.getByTestId("month-total")).toContainText("1.000.000");
  await expect(page.getByTestId("month-pending")).toContainText("900.000");
  await expect(page.getByTestId("month-paid")).toContainText("100.000");
  await expect(page.getByText("Pending", { exact: true }).first()).toBeVisible();

  // Mark the pending one as paid.
  await page.getByRole("button", { name: `Edit ${rent} expense` }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Already paid")).not.toBeChecked();
  await dialog.getByLabel("Already paid").check();
  await dialog.getByLabel("Date paid").fill("2031-07-09");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId("month-pending")).toContainText("0");
  await expect(page.getByTestId("month-paid")).toContainText("1.000.000");

  await deleteExpense(page, rent);
  await deleteExpense(page, rent);
  await deleteCategory(page, rent);
});

test("copies selected expenses from last month into the current month as pending", async ({ page }) => {
  const rent = `Copy rent ${runId}`;
  const gym = `Copy gym ${runId}`;
  const lastMonth = monthOf(-1);
  await signIn(page, OWNER.email);
  await createCategory(page, rent);
  await createCategory(page, gym);

  await openMonth(page, lastMonth);
  await addExpense(page, { category: rent, amount: "2000000", paidOn: `${lastMonth}-03`, period: lastMonth });
  await addExpense(page, { category: gym, amount: "80000", paidOn: `${lastMonth}-04`, period: lastMonth });

  await page.goto("/monthly-expenses");
  await expect(page.getByTestId("month-total")).toContainText("0");
  await page.getByRole("button", { name: "Copy from last month" }).click();
  const dialog = page.getByRole("dialog");
  const addButton = dialog.getByRole("button", { name: /^Add/ });

  // Nothing is selected by default, so nothing can be added yet.
  await expect(dialog.getByText("Nothing selected")).toBeVisible();
  await expect(addButton).toBeDisabled();

  // Only the rent is picked; the gym is left out.
  await dialog.getByRole("checkbox", { name: new RegExp(rent) }).check();
  await expect(dialog.getByText(/1 selected/)).toBeVisible();
  await addButton.click();
  await expect(dialog).toBeHidden();

  await expect(page.getByTestId("month-total")).toContainText("2.000.000");
  await expect(page.getByTestId("month-pending")).toContainText("2.000.000");
  await expect(page.getByText(gym, { exact: true })).toHaveCount(0);

  // Copying again flags the one that is already there.
  await page.getByRole("button", { name: "Copy from last month" }).click();
  await expect(dialog.getByText("Already added")).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();

  // Clean up: the copy in this month, then last month's expenses and categories.
  await deleteExpense(page, rent);
  await openMonth(page, lastMonth);
  await deleteExpense(page, rent);
  await deleteExpense(page, gym);
  await deleteCategory(page, rent);
  await deleteCategory(page, gym);
});

test("copy from last month is only offered for the current month", async ({ page }) => {
  await signIn(page, OWNER.email);
  await openMonth(page, monthOf(-1));
  await expect(page.getByRole("button", { name: "Copy from last month" })).toHaveCount(0);

  await openMonth(page, monthOf(1));
  await expect(page.getByRole("button", { name: "Copy from last month" })).toHaveCount(0);
});

test("an expense paid with another is included in it, not added twice, and can become independent", async ({
  page,
}) => {
  const card = `Card ${runId}`;
  const netflix = `Netflix ${runId}`;
  await signIn(page, OWNER.email);
  await createCategory(page, card);
  await createCategory(page, netflix);

  await openMonth(page, MONTHS.link);
  await addExpense(page, { category: card, amount: "200000", paidOn: "2031-08-05", period: MONTHS.link });
  await addExpense(page, {
    category: netflix,
    amount: "38000",
    paidOn: null,
    period: MONTHS.link,
    paidWith: card,
  });

  // Netflix is inside the card's $200.000, so the month still totals $200.000.
  await expect(page.getByTestId("month-total")).toContainText("200.000");
  await expect(page.getByTestId("month-total")).not.toContainText("238.000");
  await expect(page.getByText("Includes", { exact: false })).toContainText("38.000");
  await expect(page.getByText(`Paid with ${card}`)).toBeVisible();
  await expect(page.getByTestId("month-pending")).toContainText("0");

  // Netflix is paid on its own from now on: it counts by itself.
  await page.getByRole("button", { name: `Make ${netflix} independent` }).click();
  await expect(page.getByTestId("month-total")).toContainText("238.000");
  await expect(page.getByText(`Paid with ${card}`)).toHaveCount(0);
  await expect(page.getByTestId("month-pending")).toContainText("38.000");

  await deleteExpense(page, netflix);
  await deleteExpense(page, card);
  await deleteCategory(page, netflix);
  await deleteCategory(page, card);
});

test("the same expense can be paid with a card one month and on its own the next", async ({ page }) => {
  const card = `Card2 ${runId}`;
  const netflix = `Netflix2 ${runId}`;
  await signIn(page, OWNER.email);
  await createCategory(page, card);
  await createCategory(page, netflix);

  await openMonth(page, MONTHS.link);
  await addExpense(page, { category: card, amount: "150000", paidOn: "2031-08-05", period: MONTHS.link });
  await addExpense(page, { category: netflix, amount: "38000", paidOn: null, period: MONTHS.link, paidWith: card });
  await expect(page.getByTestId("month-total")).toContainText("150.000");

  await openMonth(page, MONTHS.linkNext);
  await addExpense(page, { category: netflix, amount: "38000", paidOn: "2031-09-02", period: MONTHS.linkNext });
  await expect(page.getByTestId("month-total")).toContainText("38.000");
  await expect(page.getByText(/Paid with/)).toHaveCount(0);

  await deleteExpense(page, netflix);
  await openMonth(page, MONTHS.link);
  await deleteExpense(page, netflix);
  await deleteExpense(page, card);
  await deleteCategory(page, netflix);
  await deleteCategory(page, card);
});

test("deleting the parent frees its linked expenses, and a parent cannot itself be paid with another", async ({
  page,
}) => {
  const card = `Card3 ${runId}`;
  const netflix = `Netflix3 ${runId}`;
  await signIn(page, OWNER.email);
  await createCategory(page, card);
  await createCategory(page, netflix);

  await openMonth(page, MONTHS.linkDelete);
  await addExpense(page, { category: card, amount: "100000", paidOn: "2031-10-03", period: MONTHS.linkDelete });
  await addExpense(page, {
    category: netflix,
    amount: "38000",
    paidOn: null,
    period: MONTHS.linkDelete,
    paidWith: card,
  });

  // The card has an expense paid with it, so it cannot be paid with another one.
  await page.getByRole("button", { name: `Edit ${card} expense` }).click();
  const editDialog = page.getByRole("dialog");
  await expect(editDialog.getByLabel("Paid with (optional)")).toBeDisabled();
  await editDialog.getByRole("button", { name: "Cancel" }).click();

  // Deleting it warns, then leaves Netflix standing on its own.
  await page.getByRole("button", { name: `Delete ${card} expense` }).click();
  const deleteDialog = page.getByRole("dialog");
  await expect(deleteDialog.getByText(/1 linked expense will become independent/)).toBeVisible();
  await deleteDialog.getByRole("button", { name: "Delete expense" }).click();
  await expect(page.getByTestId("month-total")).toContainText("38.000");
  await expect(page.getByText(netflix, { exact: true })).toBeVisible();

  await deleteExpense(page, netflix);
  await deleteCategory(page, netflix);
  await deleteCategory(page, card);
});

test("copying a parent and its linked expense together keeps them linked", async ({ page }) => {
  const card = `Card4 ${runId}`;
  const netflix = `Netflix4 ${runId}`;
  const lastMonth = monthOf(-1);
  await signIn(page, OWNER.email);
  await createCategory(page, card);
  await createCategory(page, netflix);

  await openMonth(page, lastMonth);
  await addExpense(page, { category: card, amount: "120000", paidOn: `${lastMonth}-05`, period: lastMonth });
  await addExpense(page, { category: netflix, amount: "38000", paidOn: null, period: lastMonth, paidWith: card });

  await page.goto("/monthly-expenses");
  await page.getByRole("button", { name: "Copy from last month" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox", { name: new RegExp(card) }).check();
  await dialog.getByRole("checkbox", { name: new RegExp(netflix) }).check();
  await dialog.getByRole("button", { name: "Add 2 expenses" }).click();
  await expect(dialog).toBeHidden();

  // Both arrive in this month, Netflix still under the card, and only the card is counted.
  await expect(page.getByTestId("month-total")).toContainText("120.000");
  await expect(page.getByText(`Paid with ${card}`)).toBeVisible();

  // Clean up the copies, then last month.
  await deleteExpense(page, netflix);
  await deleteExpense(page, card);
  await openMonth(page, lastMonth);
  await deleteExpense(page, netflix);
  await deleteExpense(page, card);
  await deleteCategory(page, netflix);
  await deleteCategory(page, card);
});
