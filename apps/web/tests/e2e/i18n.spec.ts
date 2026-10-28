import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { expect, test, type Page } from "@playwright/test";

/**
 * Covers specs/010-idiomas-i18n. Like the other specs it needs a reachable PostgreSQL
 * (DATABASE_URL); the user is created through the seed command.
 */

const PASSWORD = "e2e-test-password-123";
const USER = { email: "i18n-user@example.com", username: "i18n-user" };
const packageDir = fileURLToPath(new URL("../../../../packages/db", import.meta.url));
const runId = Date.now().toString(36);

test.beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "src/seed-user-cli.ts",
      "--email",
      USER.email,
      "--username",
      USER.username,
      "--password",
      PASSWORD,
    ],
    { cwd: packageDir, env: process.env, stdio: "pipe" },
  );
});

async function chooseLanguage(page: Page, name: "English" | "Español") {
  // The switcher exists in both the phone menu and the sidebar; only one of them is visible.
  await page.getByRole("radio", { name }).click();
}

test("the login screen can be switched to Spanish and the choice survives a reload", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in", level: 1 })).toBeVisible();

  await chooseLanguage(page, "Español");
  await expect(page.getByRole("heading", { name: "Iniciar sesión", level: 1 })).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");

  await page.reload();
  await expect(page.getByRole("heading", { name: "Iniciar sesión", level: 1 })).toBeVisible();

  await chooseLanguage(page, "English");
  await expect(page.getByRole("heading", { name: "Sign in", level: 1 })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("the language follows the browser until one is chosen, and falls back to English", async ({ browser }) => {
  const spanish = await browser.newContext({ locale: "es-CO" });
  const spanishPage = await spanish.newPage();
  await spanishPage.goto("/login");
  await expect(spanishPage.getByRole("heading", { name: "Iniciar sesión", level: 1 })).toBeVisible();
  await spanish.close();

  const french = await browser.newContext({ locale: "fr-FR" });
  const frenchPage = await french.newPage();
  await frenchPage.goto("/login");
  await expect(frenchPage.getByRole("heading", { name: "Sign in", level: 1 })).toBeVisible();
  await french.close();
});

test("the app, validation errors and server errors appear in the chosen language, and user data is untouched", async ({
  page,
}) => {
  await page.goto("/login");
  await chooseLanguage(page, "Español");
  await page.getByLabel("Correo o nombre de usuario").fill(USER.username);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: /Bienvenido de nuevo/, level: 1 })).toBeVisible();

  // The language stays after signing in; the navigation is translated.
  await page.getByRole("link", { name: "Categorías" }).click();
  await expect(page.getByRole("heading", { name: "Categorías", level: 1 })).toBeVisible();

  const name = `Netflix ${runId}`;
  for (const attempt of [1, 2]) {
    await page.getByRole("button", { name: "Nueva categoría" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nombre").fill(name);
    await dialog.getByRole("button", { name: "Crear categoría" }).click();
    if (attempt === 2) {
      // Server-side error, translated.
      await expect(dialog.getByText("Ya tienes una categoría con este nombre.")).toBeVisible();
      await dialog.getByRole("button", { name: "Cancelar" }).click();
    } else {
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    }
  }

  // Validation error from the domain: the payment info is too long.
  await page.getByRole("button", { name: "Nueva categoría" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre").fill(`Larga ${runId}`);
  await dialog.getByLabel(/Link de pago/).fill("x".repeat(520));
  await dialog.getByRole("button", { name: "Crear categoría" }).click();
  await expect(dialog.getByText("La información de pago debe tener máximo 500 caracteres.")).toBeVisible();
  await dialog.getByRole("button", { name: "Cancelar" }).click();

  // Back to English: same data, English labels.
  await chooseLanguage(page, "English");
  await expect(page.getByRole("heading", { name: "Categories", level: 1 })).toBeVisible();
  await expect(page.getByText(name, { exact: true })).toBeVisible();

  // Clean up.
  await page.getByRole("button", { name: `Delete ${name}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete category" }).click();
  await expect(page.getByText(name, { exact: true })).toHaveCount(0);
});
