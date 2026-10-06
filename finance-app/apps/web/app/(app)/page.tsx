import { CATEGORY_TYPES, type CategoryType } from "@finance-app/core";
import { createCategoryRepository } from "@finance-app/db";
import Link from "next/link";

import { Guilloche } from "@/components/guilloche";
import { CATEGORY_TYPE_LABELS } from "@/lib/category-labels";
import { getDb } from "@/lib/db";
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

const PENDING_WIDGETS = [
  { title: "Spent this month", note: "Your total will show here." },
  { title: "Where it went", note: "A breakdown by category." },
  { title: "Latest expenses", note: "Your most recent entries." },
];

/**
 * Dashboard shell. Category figures are real; spending widgets are marked as pending
 * until the expenses module exists, so nothing here is invented data.
 */
export default async function DashboardPage() {
  const user = await getSessionUser();
  const categories = user ? await createCategoryRepository(getDb()).list(user.id) : [];

  const counts = CATEGORY_TYPES.map((type) => ({
    type,
    count: categories.filter((category) => category.type === type).length,
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-semibold">Welcome back, {user?.name}</h1>
      <p className="mt-1.5 text-paper-muted">Here is how your spending is organized.</p>

      <section
        aria-labelledby="categories-summary"
        className="relative mt-8 overflow-hidden rounded-panel bg-ink p-6 text-paper sm:p-8"
      >
        <Guilloche className="absolute -right-24 -top-24 h-80 w-80 text-ink-line" />
        <div className="relative">
          <h2 id="categories-summary" className="text-sm font-medium text-ink-muted">
            Your categories
          </h2>
          <p className="mt-2 font-display text-6xl font-semibold">{categories.length}</p>

          {categories.length > 0 ? (
            <>
              <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-ink-soft" role="img" aria-label="Categories by type">
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
                      {CATEGORY_TYPE_LABELS[item.type]}
                      <span className="text-ink-muted">{item.count}</span>
                    </li>
                  ))}
              </ul>
            </>
          ) : (
            <p className="mt-4 max-w-md text-ink-muted">
              You have no categories yet.{" "}
              <Link href="/categories" className="font-semibold text-saffron underline underline-offset-4">
                Create your first category
              </Link>{" "}
              to start grouping expenses.
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="coming-soon" className="mt-10">
        <h2 id="coming-soon" className="text-xl font-semibold">
          Coming with expenses
        </h2>
        <p className="mt-1 text-sm text-paper-muted">These panels fill in once you start recording expenses.</p>
        <ul className="mt-4 grid gap-4 sm:grid-cols-3">
          {PENDING_WIDGETS.map((widget) => (
            <li key={widget.title} className="rounded-panel border border-dashed border-paper-line p-5">
              <h3 className="text-base font-semibold">{widget.title}</h3>
              <p className="mt-1 text-sm text-paper-muted">{widget.note}</p>
              <p className="mt-6 font-display text-3xl font-semibold text-paper-line">—</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
