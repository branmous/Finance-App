import {
  currentPeriod,
  isValidPeriod,
  pendingInstallmentsForPeriod,
  shiftPeriod,
  type CategoryColor,
  type CategoryIcon,
  type CategoryType,
} from "@finance-app/core";
import {
  createCategoryRepository,
  createDebtRepository,
  createExpenseRepository,
  createIncomeRepository,
} from "@finance-app/db";
import { getTranslations } from "next-intl/server";

import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

import type { CategoryOption, ExpenseItem } from "./expense-form-dialog";
import { ExpensesView } from "./expenses-view";

export async function generateMetadata() {
  const t = await getTranslations("expenses");
  return { title: t("metaTitle") };
}

type Props = { searchParams: { period?: string | string[] } };

export default async function MonthlyExpensesPage({ searchParams }: Props) {
  const requested = Array.isArray(searchParams.period) ? searchParams.period[0] : searchParams.period;
  const thisMonth = currentPeriod();
  const period = isValidPeriod(requested) ? requested : thisMonth;

  const isCurrentPeriod = period === thisMonth;

  const user = await getSessionUser();
  const db = getDb();
  const expenseRepo = createExpenseRepository(db);
  const [rows, baseSummary, categoryRows, lastMonthRows, incomeTotal, debtRows] = user
    ? await Promise.all([
        expenseRepo.listByPeriod(user.id, period),
        expenseRepo.summaryByPeriod(user.id, period),
        createCategoryRepository(db).list(user.id),
        // Only the current month offers "copy from last month", so only then is it needed.
        isCurrentPeriod ? expenseRepo.listByPeriod(user.id, shiftPeriod(thisMonth, -1)) : Promise.resolve([]),
        createIncomeRepository(db).totalByPeriod(user.id, period),
        createDebtRepository(db).list(user.id),
      ])
    : [[], { total: 0, paid: 0, pending: 0 }, [], [], 0, []];

  // The database stores these as plain strings; they were validated against the closed lists on write.
  const categories: CategoryOption[] = categoryRows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type as CategoryType,
  }));
  const toItem = (row: (typeof rows)[number]): ExpenseItem => ({
    id: row.id,
    categoryId: row.categoryId,
    amountMinor: row.amountMinor,
    period: row.period,
    paidOn: row.paidOn,
    note: row.note,
    parentId: row.parentId,
    categoryName: row.categoryName,
    categoryColor: row.categoryColor as CategoryColor,
    categoryIcon: row.categoryIcon as CategoryIcon,
    paymentInfo: row.paymentInfo,
  });

  // Installments of a debt that nobody registered for this month are shown as pending too; paying one
  // creates its expense (see the debts actions), so the month and the debt stay in step.
  const categoryById = new Map(categoryRows.map((row) => [row.id, row]));
  const upcoming: ExpenseItem[] = pendingInstallmentsForPeriod(
    debtRows,
    period,
    rows.flatMap((row) => (row.debtId ? [row.debtId] : [])),
  ).flatMap((item) => {
    const category = categoryById.get(item.categoryId);
    if (!category) return [];
    return [
      {
        id: `debt:${item.debtId}:${item.period}`,
        categoryId: item.categoryId,
        amountMinor: item.amountMinor,
        period: item.period,
        paidOn: null,
        note: item.debtName,
        parentId: null,
        categoryName: category.name,
        categoryColor: category.color as CategoryColor,
        categoryIcon: category.icon as CategoryIcon,
        paymentInfo: category.paymentInfo,
        upcomingDebt: { debtId: item.debtId, period: item.period },
      },
    ];
  });
  const upcomingTotal = upcoming.reduce((sum, item) => sum + item.amountMinor, 0);
  const summary = {
    total: baseSummary.total + upcomingTotal,
    paid: baseSummary.paid,
    pending: baseSummary.pending + upcomingTotal,
  };

  return (
    <ExpensesView
      period={period}
      isCurrentPeriod={isCurrentPeriod}
      expenses={[...upcoming, ...rows.map(toItem)]}
      lastMonthExpenses={lastMonthRows.map(toItem)}
      summary={summary}
      incomeTotal={incomeTotal}
      categories={categories}
    />
  );
}
