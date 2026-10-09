import { describe, expect, it } from "vitest";

import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_NAME_MAX_LENGTH,
  CATEGORY_PAYMENT_INFO_MAX_LENGTH,
  CATEGORY_TYPES,
  validateCategoryInput,
} from "../../src/categories/category";

const valid = {
  name: "Netflix",
  type: CATEGORY_TYPES[0],
  color: CATEGORY_COLORS[0],
  icon: CATEGORY_ICONS[0],
  paymentInfo: "",
};

describe("validateCategoryInput", () => {
  it("accepts a valid category", () => {
    expect(validateCategoryInput(valid)).toEqual({ ok: true, value: valid });
  });

  it("trims the name", () => {
    const result = validateCategoryInput({ ...valid, name: "  Netflix  " });
    expect(result).toEqual({ ok: true, value: valid });
  });

  it("rejects an empty or whitespace-only name", () => {
    for (const name of ["", "   "]) {
      const result = validateCategoryInput({ ...valid, name });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.name).toBeDefined();
    }
  });

  it("accepts a name of exactly the maximum length and rejects one longer", () => {
    const atLimit = "a".repeat(CATEGORY_NAME_MAX_LENGTH);
    expect(validateCategoryInput({ ...valid, name: atLimit }).ok).toBe(true);

    const result = validateCategoryInput({ ...valid, name: atLimit + "a" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.name).toBeDefined();
  });

  it("treats payment info as optional and trims it", () => {
    const { name, type, color, icon } = valid;
    expect(validateCategoryInput({ name, type, color, icon })).toEqual({ ok: true, value: valid });

    const result = validateCategoryInput({ ...valid, paymentInfo: "  https://pay.example.com  " });
    expect(result).toEqual({ ok: true, value: { ...valid, paymentInfo: "https://pay.example.com" } });
  });

  it("rejects payment info longer than the maximum", () => {
    const atLimit = "a".repeat(CATEGORY_PAYMENT_INFO_MAX_LENGTH);
    expect(validateCategoryInput({ ...valid, paymentInfo: atLimit }).ok).toBe(true);

    const result = validateCategoryInput({ ...valid, paymentInfo: atLimit + "a" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.paymentInfo).toBeDefined();
  });

  it("rejects a type, color or icon outside the allowed lists", () => {
    const result = validateCategoryInput({
      ...valid,
      type: "other-type",
      color: "#123456",
      icon: "rocket-launcher",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.type).toBeDefined();
      expect(result.errors.color).toBeDefined();
      expect(result.errors.icon).toBeDefined();
      expect(result.errors.name).toBeUndefined();
    }
  });

  it("rejects non-object input and non-string fields", () => {
    expect(validateCategoryInput(null).ok).toBe(false);
    expect(validateCategoryInput(undefined).ok).toBe(false);
    expect(validateCategoryInput({ ...valid, name: 42 }).ok).toBe(false);
  });

  it("covers the category types named in the spec", () => {
    expect([...CATEGORY_TYPES].sort()).toEqual(
      ["fixed", "household", "other", "small_expense", "subscription", "travel"].sort(),
    );
  });
});
