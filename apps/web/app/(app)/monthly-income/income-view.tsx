"use client";

import { formatCop, shiftPeriod } from "@finance-app/core/expenses";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { useFormatters } from "@/lib/format";
import { useValidationMessage } from "@/lib/use-validation-message";

import { deleteIncome } from "./actions";
import { IncomeFormDialog, type IncomeItem } from "./income-form-dialog";

type Props = {
  period: string;
  isCurrentPeriod: boolean;
  incomes: IncomeItem[];
  total: number;
};

const NAV_LINK =
  "inline-flex size-11 items-center justify-center rounded-field border border-paper-line text-ink hover:bg-leaf-tint";

function periodHref(period: string) {
  return `/monthly-income?period=${period}`;
}

export function IncomeView({ period, isCurrentPeriod, incomes, total }: Props) {
  const t = useTranslations("income");
  const tCommon = useTranslations("common");
  const message = useValidationMessage();
  const format = useFormatters();
  // `undefined` = closed, `null` = creating, an item = editing.
  const [editing, setEditing] = useState<IncomeItem | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<IncomeItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const monthLabel = format.month(period);
  const typeLabel = (item: IncomeItem) => t(`types.${item.type}`);

  function confirmDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteIncome(deleting.id);
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
        <Button onClick={() => setEditing(null)}>
          <Icon name="plus" width={18} height={18} />
          {t("new")}
        </Button>
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
          <Link href="/monthly-income" className="text-sm font-semibold text-leaf underline underline-offset-4">
            {tCommon("backToThisMonth")}
          </Link>
        )}
      </nav>

      <section aria-labelledby="month-total" className="mt-6 rounded-panel bg-ink p-6 text-paper sm:p-8">
        <h2 id="month-total" className="text-sm font-medium text-ink-muted">
          {t("totalReceived", { month: monthLabel })}
        </h2>
        <p className="mt-2 font-display text-5xl font-semibold" data-testid="month-total">
          {formatCop(total)}
        </p>
        <p className="mt-1 text-sm text-ink-muted">{t("count", { count: incomes.length })}</p>
      </section>

      <div className="mt-8">
        {incomes.length === 0 ? (
          <EmptyState
            title={t("emptyTitle", { month: monthLabel })}
            description={t("emptyDescription")}
            action={<Button onClick={() => setEditing(null)}>{t("emptyAction")}</Button>}
          />
        ) : (
          <ul className="divide-y divide-paper-line border-y border-paper-line">
            {incomes.map((item) => (
              <li key={item.id} className="flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{typeLabel(item)}</p>
                  {item.note ? <p className="truncate text-sm text-paper-muted">{item.note}</p> : null}
                </div>
                <span className="font-semibold tabular-nums">{formatCop(item.amountMinor)}</span>
                <Button
                  variant="ghost"
                  className="px-2.5"
                  onClick={() => setEditing(item)}
                  aria-label={t("edit", { type: typeLabel(item) })}
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
                  aria-label={t("delete", { type: typeLabel(item) })}
                >
                  <Icon name="trash" width={18} height={18} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <IncomeFormDialog
        open={editing !== undefined}
        income={editing ?? null}
        defaultPeriod={period}
        onClose={() => setEditing(undefined)}
      />

      <Dialog open={deleting !== null} title={t("deleteTitle")} onClose={() => setDeleting(null)}>
        <p className="text-sm text-paper-muted">
          {t.rich("deleteConfirm", {
            type: deleting ? typeLabel(deleting) : "",
            amount: deleting ? formatCop(deleting.amountMinor) : "",
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
