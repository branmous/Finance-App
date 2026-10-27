import { validationError, type ValidationError } from "../validation";

export const CATEGORY_TYPES = [
  "subscription",
  "household",
  "travel",
  "fixed",
  "small_expense",
  "other",
] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

export const CATEGORY_COLORS = [
  "#0f766e",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#475569",
] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export const CATEGORY_ICONS = [
  "repeat",
  "home",
  "plane",
  "receipt",
  "coffee",
  "cart",
  "car",
  "heart",
  "gift",
  "book",
  "tag",
] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

export const CATEGORY_NAME_MAX_LENGTH = 40;
export const CATEGORY_PAYMENT_INFO_MAX_LENGTH = 500;

export type CategoryInput = {
  name: string;
  type: CategoryType;
  color: CategoryColor;
  icon: CategoryIcon;
  paymentInfo: string;
};

export type CategoryInputErrors = Partial<Record<keyof CategoryInput, ValidationError>>;

export type CategoryValidationResult =
  | { ok: true; value: CategoryInput }
  | { ok: false; errors: CategoryInputErrors };

function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

export function validateCategoryInput(input: unknown): CategoryValidationResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, errors: { name: validationError("categoryDataRequired") } };
  }

  const raw = input as Record<string, unknown>;
  const errors: CategoryInputErrors = {};

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (name.length === 0) {
    errors.name = validationError("nameRequired");
  } else if (name.length > CATEGORY_NAME_MAX_LENGTH) {
    errors.name = validationError("nameTooLong", { max: CATEGORY_NAME_MAX_LENGTH });
  }

  if (!isOneOf(CATEGORY_TYPES, raw.type)) errors.type = validationError("invalidType");
  if (!isOneOf(CATEGORY_COLORS, raw.color)) errors.color = validationError("invalidColor");
  if (!isOneOf(CATEGORY_ICONS, raw.icon)) errors.icon = validationError("invalidIcon");

  const paymentInfo = typeof raw.paymentInfo === "string" ? raw.paymentInfo.trim() : "";
  if (paymentInfo.length > CATEGORY_PAYMENT_INFO_MAX_LENGTH) {
    errors.paymentInfo = validationError("paymentInfoTooLong", { max: CATEGORY_PAYMENT_INFO_MAX_LENGTH });
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      name,
      type: raw.type as CategoryType,
      color: raw.color as CategoryColor,
      icon: raw.icon as CategoryIcon,
      paymentInfo,
    },
  };
}

/** True for an http(s) URL, the only kind of payment info that can be opened as a link. */
export function isHttpUrl(value: string): boolean {
  return /^https?:\/\/[^\s/?#]+\S*$/i.test(value);
}
