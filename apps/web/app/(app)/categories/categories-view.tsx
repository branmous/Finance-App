"use client";

import { CATEGORY_TYPES, isHttpUrl } from "@finance-app/core/categories";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { CategoryBadge } from "@/components/ui/category-badge";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { RowActions } from "@/components/ui/row-actions";
import { useValidationMessage } from "@/lib/use-validation-message";

import { deleteCategory } from "./actions";
import { CategoryFormDialog, type CategoryItem } from "./category-form-dialog";

function PaymentInfo({ value }: { value: string }) {
  if (isHttpUrl(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="block truncate text-sm text-leaf underline underline-offset-2"
      >
        {value}
      </a>
    );
  }
  return <span className="block truncate text-sm text-paper-muted">{value}</span>;
}

export function CategoriesView({ categories }: { categories: CategoryItem[] }) {
  const t = useTranslations("categories");
  const tCommon = useTranslations("common");
  const message = useValidationMessage();
  // `undefined` = closed, `null` = creating, an item = editing.
  const [editing, setEditing] = useState<CategoryItem | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<CategoryItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const openEditor = (item: CategoryItem | null) => setEditing(item);

  function confirmDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteCategory(deleting.id);
      if (result.ok) {
        setDeleting(null);
      } else {
        setDeleteError(message(result.message) ?? t("deleteFailed"));
      }
    });
  }

  const groups = CATEGORY_TYPES.map((type) => ({
    type,
    items: categories.filter((category) => category.type === type),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="mt-1.5 text-paper-muted">{t("subtitle")}</p>
        </div>
        <Button onClick={() => openEditor(null)}>
          <Icon name="plus" width={18} height={18} />
          {t("new")}
        </Button>
      </div>

      <div className="mt-8">
        {groups.length === 0 ? (
          <EmptyState
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            action={<Button onClick={() => openEditor(null)}>{t("emptyAction")}</Button>}
          />
        ) : (
          <div className="space-y-10">
            {groups.map((group) => (
              <section key={group.type} aria-labelledby={`group-${group.type}`}>
                <div className="flex flex-wrap items-baseline gap-x-3 border-b border-paper-line pb-2">
                  <h2 id={`group-${group.type}`} className="text-lg font-semibold">
                    {t(`types.${group.type}.label`)}
                  </h2>
                  <p className="text-sm text-paper-muted">{t(`types.${group.type}.hint`)}</p>
                </div>
                <ul className="divide-y divide-paper-line">
                  {group.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-4 py-3">
                      <CategoryBadge color={item.color} icon={item.icon} />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{item.name}</span>
                        {item.paymentInfo ? <PaymentInfo value={item.paymentInfo} /> : null}
                      </div>
                      <RowActions
                        edit={{ label: t("edit", { name: item.name }), onClick: () => openEditor(item) }}
                        remove={{
                          label: t("delete", { name: item.name }),
                          onClick: () => {
                            setDeleteError(null);
                            setDeleting(item);
                          },
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <CategoryFormDialog
        open={editing !== undefined}
        category={editing ?? null}
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
