"use client";

import type { ValidationError } from "@finance-app/core";
import { useTranslations } from "next-intl";

/** Returns a function that turns a validation/action error code into text in the active language. */
export function useValidationMessage() {
  const t = useTranslations("validation");
  return (error: ValidationError | null | undefined): string | undefined => {
    if (!error) return undefined;
    return t(error.code, error.params);
  };
}
