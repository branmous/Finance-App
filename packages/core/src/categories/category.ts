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

export type CategoryInputErrors = Partial<Record<keyof CategoryInput, string>>;

export type CategoryValidationResult =
  | { ok: true; value: CategoryInput }
  | { ok: false; errors: CategoryInputErrors };

function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

export function validateCategoryInput(input: unknown): CategoryValidationResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, errors: { name: "Category data is required." } };
  }

  const raw = input as Record<string, unknown>;
  const errors: CategoryInputErrors = {};

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (name.length === 0) {
    errors.name = "Name is required.";
  } else if (name.length > CATEGORY_NAME_MAX_LENGTH) {
    errors.name = `Name must be at most ${CATEGORY_NAME_MAX_LENGTH} characters.`;
  }

  if (!isOneOf(CATEGORY_TYPES, raw.type)) errors.type = "Choose a valid type.";
  if (!isOneOf(CATEGORY_COLORS, raw.color)) errors.color = "Choose a valid color.";
  if (!isOneOf(CATEGORY_ICONS, raw.icon)) errors.icon = "Choose a valid icon.";

  const paymentInfo = typeof raw.paymentInfo === "string" ? raw.paymentInfo.trim() : "";
  if (paymentInfo.length > CATEGORY_PAYMENT_INFO_MAX_LENGTH) {
    errors.paymentInfo = `Payment info must be at most ${CATEGORY_PAYMENT_INFO_MAX_LENGTH} characters.`;
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
