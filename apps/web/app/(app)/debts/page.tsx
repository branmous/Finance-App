import { currentPeriod, type CategoryColor, type CategoryIcon, type CategoryType } from "@finance-app/core";
import { createCategoryRepository, createDebtRepository } from "@finance-app/db";

import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

import type { CategoryOption } from "../monthly-expenses/expense-form-dialog";
import type { DebtItem } from "./debt-form-dialog";
import { DebtsView } from "./debts-view";

export const metadata = { title: "Debts · Finance App" };

export default async function DebtsPage() {
  const user = await getSessionUser();
  const db = getDb();
  const [rows, categoryRows] = user
    ? await Promise.all([createDebtRepository(db).list(user.id), createCategoryRepository(db).list(user.id)])
    : [[], []];

  // The database stores these as plain strings; they were validated against the closed lists on write.
  const categories: CategoryOption[] = categoryRows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type as CategoryType,
  }));
  const debts: DebtItem[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    categoryId: row.categoryId,
    installmentMinor: row.installmentMinor,
    startPeriod: row.startPeriod,
    totalInstallments: row.totalInstallments,
    note: row.note,
    paidPeriods: row.paidPeriods,
    categoryName: row.categoryName,
    categoryColor: row.categoryColor as CategoryColor,
    categoryIcon: row.categoryIcon as CategoryIcon,
  }));

  return <DebtsView debts={debts} categories={categories} nowPeriod={currentPeriod()} />;
}
