"use client";

import { formatCop, shiftPeriod } from "@finance-app/core/expenses";
import type { PeriodSummary } from "@finance-app/db";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { CategoryBadge } from "@/components/ui/category-badge";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { useFormatters } from "@/lib/format";
import { useValidationMessage } from "@/lib/use-validation-message";

import { deleteExpense, unlinkExpense } from "./actions";
import { BalanceCard } from "./balance-card";
import { BulkImportDialog } from "./bulk-import-dialog";
import { CopyExpensesDialog } from "./copy-expenses-dialog";
import { ExpenseFormDialog, type CategoryOption, type ExpenseItem } from "./expense-form-dialog";

type Props = {
  period: string;
  isCurrentPeriod: boolean;
  expenses: ExpenseItem[];
  /** Previous month's expenses, offered for copying; only loaded for the current month. */
  lastMonthExpenses: ExpenseItem[];
  summary: PeriodSummary;
  /** Income recorded for the month shown, in whole pesos. */
  incomeTotal: number;
  categories: CategoryOption[];
};

const NAV_LINK =
  "inline-flex size-11 items-center justify-center rounded-field border border-paper-line text-ink hover:bg-leaf-tint";

function periodHref(period: string) {
  return `/monthly-expenses?period=${period}`;
}

export function ExpensesView({
  period,
  isCurrentPeriod,
  expenses,
  lastMonthExpenses,
  summary,
  incomeTotal,
  categories,
}: Props) {
  const t = useTranslations("expenses");
  const tCommon = useTranslations("common");
  const message = useValidationMessage();
  const format = useFormatters();
  // `undefined` = closed, `null` = creating, an item = editing.
  const [editing, setEditing] = useState<ExpenseItem | null | undefined>(undefined);
  const [copying, setCopying] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [deleting, setDeleting] = useState<ExpenseItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const hasCategories = categories.length > 0;
  const monthLabel = format.month(period);

  // An expense paid with another one is shown under it; the month total counts only the parents.
  const ids = new Set(expenses.map((item) => item.id));
  const topLevel = expenses.filter((item) => !item.parentId || !ids.has(item.parentId));
  const childrenOf = (parentId: string) => expenses.filter((item) => item.parentId === parentId);
  const deletingChildren = deleting ? childrenOf(deleting.id).length : 0;
  const editingChildren = editing ? childrenOf(editing.id).length : 0;

  function makeIndependent(item: ExpenseItem) {
    setListError(null);
    startTransition(async () => {
      const result = await unlinkExpense(item.id);
      if (!result.ok) setListError(message(result.message) ?? t("updateFailed"));
    });
  }

  function renderRow(item: ExpenseItem, parent?: ExpenseItem) {
    const linked = childrenOf(item.id);
    const linkedTotal = linked.reduce((sum, child) => sum + child.amountMinor, 0);
    return (
      <div className={`flex items-center gap-4 py-3 ${parent ? "pl-6 sm:pl-12" : ""}`}>
        <CategoryBadge color={item.categoryColor} icon={item.categoryIcon} size={parent ? 32 : 40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{item.categoryName}</p>
          <p className="truncate text-sm text-paper-muted">
            {parent ? (
              t("paidWith", { name: parent.categoryName })
            ) : item.paidOn ? (
              t("paidOn", { date: format.day(item.paidOn) })
            ) : (
              <span className="rounded-full bg-saffron-tint px-2 py-0.5 text-xs font-semibold text-ink">
                {t("pending")}
              </span>
            )}
            {item.note ? ` · ${item.note}` : ""}
          </p>
          {linked.length > 0 ? (
            <p className={`truncate text-xs ${linkedTotal > item.amountMinor ? "font-semibold text-clay" : "text-paper-muted"}`}>
              {t("includes", { amount: formatCop(linkedTotal), count: linked.length })}
              {linkedTotal > item.amountMinor ? ` · ${t("moreThanAmount")}` : ""}
            </p>
          ) : null}
        </div>
        <span className="font-semibold tabular-nums">{formatCop(item.amountMinor)}</span>
        {parent ? (
          <Button
            variant="ghost"
            className="px-2.5 text-xs"
            onClick={() => makeIndependent(item)}
            loading={pending}
            aria-label={t("makeIndependentLabel", { name: item.categoryName })}
          >
            {t("makeIndependent")}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          className="px-2.5"
          onClick={() => setEditing(item)}
          aria-label={t("edit", { name: item.categoryName })}
        >
          <Icon name="pencil" width={18} height={18} />
        </Button>
        <Button
          variant="ghost"
          className="px-2.5 hover:text-clay"
          onClick={() => {
            setDeleteError(null);
            setDeleting(item);
          }}
          aria-label={t("delete", { name: item.categoryName })}
        >
          <Icon name="trash" width={18} height={18} />
        </Button>
      </div>
    );
  }

  function confirmDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteExpense(deleting.id);
      if (result.ok) {
        setDeleting(null);
      } else {
        setDeleteError(message(result.message) ?? t("deleteFailed"));
      }
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="mt-1.5 text-paper-muted">{t("subtitle")}</p>
        </div>
        {hasCategories ? (
          <div className="flex flex-wrap gap-3">
            {isCurrentPeriod ? (
              <Button variant="secondary" onClick={() => setCopying(true)}>
                <Icon name="repeat" width={18} height={18} />
                {t("copyFromLast")}
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => setBulkImporting(true)}>
              <Icon name="plus" width={18} height={18} />
              {t("bulkImport")}
            </Button>
            <Button onClick={() => setEditing(null)}>
              <Icon name="plus" width={18} height={18} />
              {t("new")}
            </Button>
          </div>
        ) : null}
      </div>

      <nav aria-label={tCommon("month")} className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href={periodHref(shiftPeriod(period, -1))}
          aria-label={tCommon("previousMonth")}
          className={NAV_LINK}
        >
          <Icon name="chevronLeft" />
        </Link>
        <h2 className="min-w-40 text-center text-xl font-semibold" aria-live="polite">
          {monthLabel}
        </h2>
        <Link href={periodHref(shiftPeriod(period, 1))} aria-label={tCommon("nextMonth")} className={NAV_LINK}>
          <Icon name="chevronRight" />
        </Link>
        {isCurrentPeriod ? null : (
          <Link href="/monthly-expenses" className="text-sm font-semibold text-leaf underline underline-offset-4">
            {tCommon("backToThisMonth")}
          </Link>
        )}
      </nav>

      <section aria-labelledby="month-total" className="mt-6 rounded-panel bg-ink p-6 text-paper sm:p-8">
        <h2 id="month-total" className="text-sm font-medium text-ink-muted">
          {t("totalSpent", { month: monthLabel })}
        </h2>
        <p className="mt-2 font-display text-5xl font-semibold" data-testid="month-total">
          {formatCop(summary.total)}
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          {t("count", { count: topLevel.length })}
          {expenses.length > topLevel.length
            ? ` · ${t("paidWithAnother", { count: expenses.length - topLevel.length })}`
            : ""}
        </p>
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-ink-line pt-4 text-sm">
          <div>
            <dt className="text-ink-muted">{t("paid")}</dt>
            <dd className="font-semibold tabular-nums" data-testid="month-paid">
              {formatCop(summary.paid)}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">{t("pending")}</dt>
            <dd className="font-semibold tabular-nums" data-testid="month-pending">
              {formatCop(summary.pending)}
            </dd>
          </div>
        </dl>
      </section>

      <BalanceCard period={period} income={incomeTotal} spent={summary.total} paid={summary.paid} />

      <div className="mt-8">
        {!hasCategories ? (
          <EmptyState
            title={t("createCategoryFirst")}
            description={t("createCategoryDescription")}
            action={
              <Link
                href="/categories"
                className="inline-flex min-h-11 items-center rounded-field bg-ink px-4 text-sm font-semibold text-white hover:bg-ink-soft"
              >
                {t("goToCategories")}
              </Link>
            }
          />
        ) : expenses.length === 0 ? (
          <EmptyState
            title={t("emptyTitle", { month: monthLabel })}
            description={t("emptyDescription")}
            action={<Button onClick={() => setEditing(null)}>{t("emptyAction")}</Button>}
          />
        ) : (
          <>
            {listError ? (
              <p role="alert" className="mb-3 rounded-field bg-clay-tint px-3 py-2.5 text-sm text-clay">
                {listError}
              </p>
            ) : null}
            <ul className="divide-y divide-paper-line border-y border-paper-line">
              {topLevel.map((item) => (
                <li key={item.id}>
                  {renderRow(item)}
                  {childrenOf(item.id).length > 0 ? (
                    <ul className="divide-y divide-paper-line border-t border-paper-line bg-leaf-tint/40">
                      {childrenOf(item.id).map((child) => (
                        <li key={child.id}>{renderRow(child, item)}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <ExpenseFormDialog
        open={editing !== undefined}
        expense={editing ?? null}
        categories={categories}
        defaultPeriod={period}
        parentCandidates={topLevel}
        hasChildren={editingChildren > 0}
        onClose={() => setEditing(undefined)}
      />

      <CopyExpensesDialog
        open={copying}
        sourcePeriod={shiftPeriod(period, -1)}
        sources={lastMonthExpenses}
        existing={expenses}
        onClose={() => setCopying(false)}
      />

      <BulkImportDialog open={bulkImporting} defaultPeriod={period} onClose={() => setBulkImporting(false)} />

      <Dialog open={deleting !== null} title={t("deleteTitle")} onClose={() => setDeleting(null)}>
        <p className="text-sm text-paper-muted">
          {t.rich("deleteConfirm", {
            name: deleting?.categoryName ?? "",
            amount: deleting ? formatCop(deleting.amountMinor) : "",
            strong: (chunks) => <strong className="text-ink">{chunks}</strong>,
          })}
        </p>
        {deletingChildren > 0 ? (
          <p className="mt-3 rounded-field bg-saffron-tint px-3 py-2.5 text-sm">
            {t("deleteLinked", { count: deletingChildren })}
          </p>
        ) : null}
        {deleteError ? (
          <p role="alert" className="mt-4 rounded-field bg-clay-tint px-3 py-2.5 text-sm text-clay">
            {deleteError}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            {tCommon("cancel")}
          </Button>
          <Button variant="danger" onClick={confirmDelete} loading={pending}>
            {t("deleteAction")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
