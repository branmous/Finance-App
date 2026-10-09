import { CATEGORY_TYPES, currentPeriod, formatCop, type CategoryType } from "@finance-app/core";
import { createCategoryRepository, createExpenseRepository, createIncomeRepository } from "@finance-app/db";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

import { Guilloche } from "@/components/guilloche";
import { getDb } from "@/lib/db";
import { formatMonth } from "@/lib/format";
import { getSessionUser } from "@/lib/session";

// Per-type shades for the proportion bar, taken from the app palette.
const TYPE_SHADES: Record<CategoryType, string> = {
  subscription: "#e9a820",
  household: "#7fc4a6",
  travel: "#3ea080",
  fixed: "#1f7a5c",
  small_expense: "#f3d27a",
  other: "#8fb0a3",
};

const PENDING_WIDGETS = ["whereItWent", "latest"] as const;

/**
 * Dashboard shell. Category figures and this month's total are real; the remaining
 * spending widgets are marked as pending, so nothing here is invented data.
 */
export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const tCategories = await getTranslations("categories");
  const locale = await getLocale();
  const user = await getSessionUser();
  const period = currentPeriod();
  const monthLabel = formatMonth(period, locale);
  const [categories, monthTotal, incomeTotal] = user
    ? await Promise.all([
        createCategoryRepository(getDb()).list(user.id),
        createExpenseRepository(getDb()).totalByPeriod(user.id, period),
        createIncomeRepository(getDb()).totalByPeriod(user.id, period),
      ])
    : [[], 0, 0];

  const counts = CATEGORY_TYPES.map((type) => ({
    type,
    count: categories.filter((category) => category.type === type).length,
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-semibold">{t("welcome", { name: user?.name ?? "" })}</h1>
      <p className="mt-1.5 text-paper-muted">{t("subtitle")}</p>

      <section
        aria-labelledby="categories-summary"
        className="relative mt-8 overflow-hidden rounded-panel bg-ink p-6 text-paper sm:p-8"
      >
        <Guilloche className="absolute -right-24 -top-24 h-80 w-80 text-ink-line" />
        <div className="relative">
          <h2 id="categories-summary" className="text-sm font-medium text-ink-muted">
            {t("yourCategories")}
          </h2>
          <p className="mt-2 font-display text-6xl font-semibold">{categories.length}</p>

          {categories.length > 0 ? (
            <>
              <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-ink-soft" role="img" aria-label={t("byTypeLabel")}>
                {counts
                  .filter((item) => item.count > 0)
                  .map((item) => (
                    <span
                      key={item.type}
                      style={{ width: `${(item.count / categories.length) * 100}%`, backgroundColor: TYPE_SHADES[item.type] }}
                    />
                  ))}
              </div>
              <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {counts
                  .filter((item) => item.count > 0)
                  .map((item) => (
                    <li key={item.type} className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: TYPE_SHADES[item.type] }} />
                      {tCategories(`types.${item.type}.label`)}
                      <span className="text-ink-muted">{item.count}</span>
                    </li>
                  ))}
              </ul>
            </>
          ) : (
            <p className="mt-4 max-w-md text-ink-muted">
              {t.rich("noCategories", {
                link: (chunks) => (
                  <Link href="/categories" className="font-semibold text-saffron underline underline-offset-4">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="coming-soon" className="mt-10">
        <h2 id="coming-soon" className="text-xl font-semibold">
          {t("thisMonth")}
        </h2>
        <p className="mt-1 text-sm text-paper-muted">{t("thisMonthHint")}</p>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <li className="rounded-panel border border-paper-line p-5">
            <h3 className="text-base font-semibold">{t("incomeIn", { month: monthLabel })}</h3>
            <p className="mt-1 text-sm text-paper-muted">{t("incomeHint")}</p>
            <p className="mt-6 font-display text-3xl font-semibold">{formatCop(incomeTotal)}</p>
            <Link
              href="/monthly-income"
              className="mt-3 inline-block text-sm font-semibold text-leaf underline underline-offset-4"
            >
              {t("viewIncome")}
            </Link>
          </li>
          <li className="rounded-panel border border-paper-line p-5">
            <h3 className="text-base font-semibold">{t("spentIn", { month: monthLabel })}</h3>
            <p className="mt-1 text-sm text-paper-muted">{t("spentHint")}</p>
            <p className="mt-6 font-display text-3xl font-semibold">{formatCop(monthTotal)}</p>
            <Link
              href="/monthly-expenses"
              className="mt-3 inline-block text-sm font-semibold text-leaf underline underline-offset-4"
            >
              {t("viewExpenses")}
            </Link>
          </li>
          {PENDING_WIDGETS.map((widget) => (
            <li key={widget} className="rounded-panel border border-dashed border-paper-line p-5">
              <h3 className="text-base font-semibold">{t(`pending.${widget}.title`)}</h3>
              <p className="mt-1 text-sm text-paper-muted">{t(`pending.${widget}.note`)}</p>
              <p className="mt-6 font-display text-3xl font-semibold text-paper-line">—</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
