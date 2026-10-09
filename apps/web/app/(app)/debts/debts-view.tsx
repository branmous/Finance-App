"use client";

import { debtProgress, installmentPeriods, type DebtProgress, type DebtStatus } from "@finance-app/core/debts";
import { formatCop } from "@finance-app/core/expenses";
import type { ValidationError } from "@finance-app/core";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { CategoryBadge } from "@/components/ui/category-badge";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { intlLocale, useFormatters } from "@/lib/format";
import { useValidationMessage } from "@/lib/use-validation-message";

import type { CategoryOption } from "../monthly-expenses/expense-form-dialog";
import { deleteDebt, markPaidThrough, setInstallmentPaid } from "./actions";
import { DebtFormDialog, type DebtItem } from "./debt-form-dialog";

type Props = {
  debts: DebtItem[];
  categories: CategoryOption[];
  /** The current month, "YYYY-MM", computed on the server. */
  nowPeriod: string;
};

const STATUS_ORDER: Record<DebtStatus, number> = { overdue: 0, active: 1, upcoming: 2, paid_off: 3 };

function shortMonth(period: string, locale: string): string {
  const [year, month] = period.split("-").map(Number) as [number, number];
  return new Intl.DateTimeFormat(intlLocale(locale), { month: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

function StatusPill({ status, overdue }: { status: DebtStatus; overdue: number }) {
  const t = useTranslations("debts");
  if (status === "paid_off") {
    return <span className="rounded-full bg-leaf-tint px-2.5 py-0.5 text-xs font-semibold text-leaf">{t("paidOff")}</span>;
  }
  if (status === "overdue") {
    return (
      <span className="rounded-full bg-clay-tint px-2.5 py-0.5 text-xs font-semibold text-clay">
        {t("due", { count: overdue })}
      </span>
    );
  }
  if (status === "upcoming") {
    return <span className="rounded-full bg-saffron-tint px-2.5 py-0.5 text-xs font-semibold text-ink">{t("notStarted")}</span>;
  }
  return null;
}

export function DebtsView({ debts, categories, nowPeriod }: Props) {
  const t = useTranslations("debts");
  const tCommon = useTranslations("common");
  const message = useValidationMessage();
  const format = useFormatters();
  // `undefined` = closed, `null` = creating, an item = editing.
  const [editing, setEditing] = useState<DebtItem | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<DebtItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  // Paid months shown right away while the server confirms; dropped as soon as fresh data arrives.
  const [optimistic, setOptimistic] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  useEffect(() => setOptimistic({}), [debts]);

  const hasCategories = categories.length > 0;

  const rows = debts
    .map((debt) => {
      const paidPeriods = optimistic[debt.id] ?? debt.paidPeriods;
      return { debt, paidPeriods, progress: debtProgress(debt, paidPeriods, nowPeriod) };
    })
    .sort((a, b) => STATUS_ORDER[a.progress.status] - STATUS_ORDER[b.progress.status]);

  const running = rows.filter((row) => row.progress.status === "active" || row.progress.status === "overdue");
  const monthlyTotal = running.reduce((sum, row) => sum + row.debt.installmentMinor, 0);
  const remainingTotal = rows.reduce((sum, row) => sum + row.progress.remainingMinor, 0);

  async function runWithRollback(debtId: string, next: string[], action: () => Promise<{ ok: boolean; message?: ValidationError }>) {
    setListError(null);
    setOptimistic((current) => ({ ...current, [debtId]: next }));
    const result = await action();
    if (!result.ok) {
      setOptimistic((current) => {
        const { [debtId]: _dropped, ...rest } = current;
        void _dropped;
        return rest;
      });
      setListError(message(result.message) ?? t("saveFailed"));
    }
  }

  function toggle(debtId: string, paidPeriods: string[], period: string) {
    const paid = !paidPeriods.includes(period);
    const next = paid ? [...paidPeriods, period].sort() : paidPeriods.filter((item) => item !== period);
    void runWithRollback(debtId, next, () => setInstallmentPaid(debtId, period, paid));
  }

  function catchUp(debt: DebtItem, paidPeriods: string[], progress: DebtProgress) {
    const through = progress.overduePeriods[progress.overduePeriods.length - 1];
    if (!through) return;
    const targets = installmentPeriods(debt).filter((period) => period <= through);
    const next = [...new Set([...paidPeriods, ...targets])].sort();
    void runWithRollback(debt.id, next, () => markPaidThrough(debt.id, through));
  }

  function confirmDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteDebt(deleting.id);
      if (result.ok) setDeleting(null);
      else setDeleteError(message(result.message) ?? t("deleteFailed"));
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
          <Button onClick={() => setEditing(null)}>
            <Icon name="plus" width={18} height={18} />
            {t("new")}
          </Button>
        ) : null}
      </div>

      {debts.length > 0 ? (
        <section aria-labelledby="debts-summary" className="mt-8 rounded-panel bg-ink p-6 text-paper sm:p-8">
          <h2 id="debts-summary" className="text-sm font-medium text-ink-muted">
            {t("stillToPay")}
          </h2>
          <p className="mt-2 font-display text-5xl font-semibold" data-testid="debts-remaining">
            {formatCop(remainingTotal)}
          </p>
          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-ink-line pt-4 text-sm">
            <div>
              <dt className="text-ink-muted">{t("monthlyPayments")}</dt>
              <dd className="font-semibold tabular-nums" data-testid="debts-monthly">
                {formatCop(monthlyTotal)}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">{t("inProgress")}</dt>
              <dd className="font-semibold tabular-nums">{running.length}</dd>
            </div>
          </dl>
        </section>
      ) : null}

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
        ) : debts.length === 0 ? (
          <EmptyState
            title={t("emptyTitle")}
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
            <ul className="space-y-5">
              {rows.map(({ debt, paidPeriods, progress }) => (
                <li
                  key={debt.id}
                  data-testid={`debt-${debt.name}`}
                  className={`rounded-panel border border-paper-line bg-paper-raised p-5 sm:p-6 ${
                    progress.status === "paid_off" ? "opacity-80" : ""
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <CategoryBadge color={debt.categoryColor} icon={debt.categoryIcon} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h2 className="truncate text-lg font-semibold">{debt.name}</h2>
                        <StatusPill status={progress.status} overdue={progress.overduePeriods.length} />
                      </div>
                      <p className="text-sm text-paper-muted">
                        {debt.categoryName} · {format.month(debt.startPeriod)} – {format.month(progress.endPeriod)}
                        {debt.note ? ` · ${debt.note}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums">{formatCop(debt.installmentMinor)}</p>
                      <p className="text-xs text-paper-muted">{t("perMonth")}</p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-baseline justify-between text-sm">
                      <p className="font-medium" data-testid="debt-progress">
                        {t("paidProgress", { paid: progress.paidCount, total: debt.totalInstallments })}
                      </p>
                      <p className="text-paper-muted tabular-nums">
                        {progress.remainingCount === 0
                          ? t("nothingLeft")
                          : t("amountLeft", { amount: formatCop(progress.remainingMinor) })}
                      </p>
                    </div>
                    <div
                      role="progressbar"
                      aria-label={t("progressLabel", { name: debt.name })}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progress.percent}
                      className="mt-2 h-2.5 overflow-hidden rounded-full bg-paper-line"
                    >
                      <div
                        className="h-full rounded-full bg-leaf transition-all"
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                  </div>

                  <ul className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8" aria-label={t("monthsLabel", { name: debt.name })}>
                    {installmentPeriods(debt).map((period) => {
                      const paid = paidPeriods.includes(period);
                      const due = !paid && period <= nowPeriod;
                      const current = period === nowPeriod;
                      const tone = paid
                        ? "border-leaf bg-leaf text-white hover:bg-leaf-dark"
                        : due
                          ? "border-clay bg-clay-tint text-clay hover:brightness-95"
                          : "border-paper-line bg-paper-raised text-ink hover:bg-leaf-tint";
                      return (
                        <li key={period}>
                          <button
                            type="button"
                            onClick={() => toggle(debt.id, paidPeriods, period)}
                            aria-pressed={paid}
                            aria-label={t(paid ? "monthPaid" : due ? "monthDue" : "monthPending", {
                              month: format.month(period),
                            })}
                            className={`flex min-h-12 w-full flex-col items-center justify-center rounded-field border text-xs font-semibold transition-colors ${tone} ${
                              current ? "ring-2 ring-saffron ring-offset-1" : ""
                            }`}
                          >
                            {paid ? <Icon name="check" width={14} height={14} /> : null}
                            <span>{shortMonth(period, format.locale)}</span>
                            <span className="font-normal opacity-80">&rsquo;{period.slice(2, 4)}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      {progress.overduePeriods.length > 1 ? (
                        <Button
                          variant="secondary"
                          onClick={() => catchUp(debt, paidPeriods, progress)}
                          aria-label={t("markAllDueLabel", { name: debt.name })}
                        >
                          <Icon name="check" width={16} height={16} />
                          {t("markAllDue", { count: progress.overduePeriods.length })}
                        </Button>
                      ) : null}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        className="px-2.5"
                        onClick={() => setEditing(debt)}
                        aria-label={t("edit", { name: debt.name })}
                      >
                        <Icon name="pencil" width={18} height={18} />
                      </Button>
                      <Button
                        variant="ghost"
                        className="px-2.5 hover:text-clay"
                        onClick={() => {
                          setDeleteError(null);
                          setDeleting(debt);
                        }}
                        aria-label={t("delete", { name: debt.name })}
                      >
                        <Icon name="trash" width={18} height={18} />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <DebtFormDialog
        open={editing !== undefined}
        debt={editing ?? null}
        categories={categories}
        onClose={() => setEditing(undefined)}
      />

      <Dialog open={deleting !== null} title={t("deleteTitle")} onClose={() => setDeleting(null)}>
        <p className="text-sm text-paper-muted">
          {t.rich("deleteConfirm", {
            name: deleting?.name ?? "",
            strong: (chunks) => <strong className="text-ink">{chunks}</strong>,
          })}
        </p>
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
