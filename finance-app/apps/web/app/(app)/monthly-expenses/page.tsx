import { currentPeriod, isValidPeriod, type CategoryColor, type CategoryIcon, type CategoryType } from "@finance-app/core";
import { createCategoryRepository, createExpenseRepository } from "@finance-app/db";

import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

import type { CategoryOption, ExpenseItem } from "./expense-form-dialog";
import { ExpensesView } from "./expenses-view";

export const metadata = { title: "Monthly expenses · Finance App" };

type Props = { searchParams: { period?: string | string[] } };

export default async function MonthlyExpensesPage({ searchParams }: Props) {
  const requested = Array.isArray(searchParams.period) ? searchParams.period[0] : searchParams.period;
  const thisMonth = currentPeriod();
  const period = isValidPeriod(requested) ? requested : thisMonth;

  const user = await getSessionUser();
  const db = getDb();
  const [rows, total, categoryRows] = user
    ? await Promise.all([
        createExpenseRepository(db).listByPeriod(user.id, period),
        createExpenseRepository(db).totalByPeriod(user.id, period),
        createCategoryRepository(db).list(user.id),
      ])
    : [[], 0, []];

  // The database stores these as plain strings; they were validated against the closed lists on write.
  const categories: CategoryOption[] = categoryRows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type as CategoryType,
  }));
  const expenses: ExpenseItem[] = rows.map((row) => ({
    id: row.id,
    categoryId: row.categoryId,
    amountMinor: row.amountMinor,
    period: row.period,
    paidOn: row.paidOn,
    note: row.note,
    categoryName: row.categoryName,
    categoryColor: row.categoryColor as CategoryColor,
    categoryIcon: row.categoryIcon as CategoryIcon,
  }));

  return (
    <ExpensesView
      period={period}
      isCurrentPeriod={period === thisMonth}
      expenses={expenses}
      total={total}
      categories={categories}
    />
  );
}
