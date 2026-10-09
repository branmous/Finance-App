"use client";

import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_NAME_MAX_LENGTH,
  CATEGORY_PAYMENT_INFO_MAX_LENGTH,
  CATEGORY_TYPES,
  type CategoryColor,
  type CategoryIcon,
  type CategoryInputErrors,
  type CategoryType,
} from "@finance-app/core/categories";
import type { ValidationError } from "@finance-app/core";
import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { useValidationMessage } from "@/lib/use-validation-message";

import { createCategory, updateCategory } from "./actions";

export type CategoryItem = {
  id: string;
  name: string;
  type: CategoryType;
  color: CategoryColor;
  icon: CategoryIcon;
  paymentInfo: string;
};

type Props = {
  open: boolean;
  /** The category being edited, or null to create a new one. */
  category: CategoryItem | null;
  onClose: () => void;
};

export function CategoryFormDialog({ open, category, onClose }: Props) {
  const t = useTranslations("categories");
  // The inner form is keyed by category so its state resets every time the dialog opens for another item.
  return (
    <Dialog open={open} title={category ? t("formEditTitle") : t("formNewTitle")} onClose={onClose}>
      <CategoryForm key={category?.id ?? "new"} category={category} onClose={onClose} />
    </Dialog>
  );
}

function CategoryForm({ category, onClose }: Pick<Props, "category" | "onClose">) {
  const t = useTranslations("categories");
  const tCommon = useTranslations("common");
  const message = useValidationMessage();
  const [name, setName] = useState(category?.name ?? "");
  const [type, setType] = useState<CategoryType>(category?.type ?? "subscription");
  const [color, setColor] = useState<CategoryColor>(category?.color ?? CATEGORY_COLORS[0]);
  const [icon, setIcon] = useState<CategoryIcon>(category?.icon ?? CATEGORY_ICONS[0]);
  const [paymentInfo, setPaymentInfo] = useState(category?.paymentInfo ?? "");
  const [errors, setErrors] = useState<CategoryInputErrors>({});
  const [formError, setFormError] = useState<ValidationError | null>(null);
  const [pending, startTransition] = useTransition();

  const typeOptions = CATEGORY_TYPES.map((value) => ({ value, label: t(`types.${value}.label`) }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    startTransition(async () => {
      const input = { name, type, color, icon, paymentInfo };
      const result = category ? await updateCategory(category.id, input) : await createCategory(input);
      if (result.ok) {
        onClose();
        return;
      }
      setErrors(result.errors ?? {});
      setFormError(result.message ?? null);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        id="category-name"
        label={t("name")}
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={CATEGORY_NAME_MAX_LENGTH + 10}
        placeholder={t("namePlaceholder")}
        error={message(errors.name)}
        autoFocus
        required
      />

      <Select
        id="category-type"
        label={t("type")}
        value={type}
        onChange={(event) => setType(event.target.value as CategoryType)}
        options={typeOptions}
        error={message(errors.type)}
      />

      <Input
        id="category-payment-info"
        label={t("paymentInfo")}
        value={paymentInfo}
        onChange={(event) => setPaymentInfo(event.target.value)}
        maxLength={CATEGORY_PAYMENT_INFO_MAX_LENGTH + 10}
        placeholder={t("paymentInfoPlaceholder")}
        error={message(errors.paymentInfo)}
      />

      <fieldset>
        <legend className="text-sm font-medium">{t("color")}</legend>
        <div className="mt-2 flex flex-wrap gap-2.5">
          {CATEGORY_COLORS.map((value) => (
            <label key={value} className="relative cursor-pointer">
              <input
                type="radio"
                name="color"
                value={value}
                checked={color === value}
                onChange={() => setColor(value)}
                aria-label={t(`colors.${value}`)}
                className="peer sr-only"
              />
              <span
                className="block size-8 rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-paper-raised peer-checked:ring-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-leaf"
                style={{ backgroundColor: value }}
              />
            </label>
          ))}
        </div>
        {errors.color ? <p className="mt-1.5 text-sm text-clay">{message(errors.color)}</p> : null}
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">{t("icon")}</legend>
        <div className="mt-2 grid grid-cols-6 gap-2">
          {CATEGORY_ICONS.map((value) => (
            <label key={value} className="relative cursor-pointer">
              <input
                type="radio"
                name="icon"
                value={value}
                checked={icon === value}
                onChange={() => setIcon(value)}
                aria-label={t("iconOption", { name: value })}
                className="peer sr-only"
              />
              <span
                className="flex size-10 items-center justify-center rounded-field border border-paper-line text-paper-muted peer-checked:border-transparent peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-leaf"
                style={icon === value ? { backgroundColor: color } : undefined}
              >
                <Icon name={value} />
              </span>
            </label>
          ))}
        </div>
        {errors.icon ? <p className="mt-1.5 text-sm text-clay">{message(errors.icon)}</p> : null}
      </fieldset>

      {formError ? (
        <p role="alert" className="rounded-field bg-clay-tint px-3 py-2.5 text-sm text-clay">
          {message(formError)}
        </p>
      ) : null}

      <div className="flex justify-end gap-3 pt-1">
        <Button variant="secondary" onClick={onClose}>
          {tCommon("cancel")}
        </Button>
        <Button type="submit" loading={pending}>
          {category ? t("save") : t("create")}
        </Button>
      </div>
    </form>
  );
}
