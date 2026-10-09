import type { Locale } from "../i18n/config";
import enShell from "./en.json";
import enCategories from "./en/categories.json";
import enIncome from "./en/income.json";
import enDashboard from "./en/dashboard.json";
import enDebts from "./en/debts.json";
import enExpenses from "./en/expenses.json";
import enTravels from "./en/travels.json";
import enValidation from "./en/validation.json";
import esShell from "./es.json";
import esCategories from "./es/categories.json";
import esIncome from "./es/income.json";
import esDashboard from "./es/dashboard.json";
import esDebts from "./es/debts.json";
import esExpenses from "./es/expenses.json";
import esTravels from "./es/travels.json";
import esValidation from "./es/validation.json";

/**
 * One catalog per language. The shell (app name, nav, login) lives in <locale>.json and each
 * feature has its own file under <locale>/ — add the same file in both languages.
 */
export const catalogs = {
  en: { ...enShell, validation: enValidation, categories: enCategories, income: enIncome, expenses: enExpenses, debts: enDebts, travels: enTravels, dashboard: enDashboard },
  es: { ...esShell, validation: esValidation, categories: esCategories, income: esIncome, expenses: esExpenses, debts: esDebts, travels: esTravels, dashboard: esDashboard },
} satisfies Record<Locale, Record<string, unknown>>;
