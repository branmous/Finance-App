"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { setLocale } from "@/i18n/actions";
import { LOCALES, type Locale } from "@/i18n/config";

// Each language is named in its own language, so it is recognizable whatever the current one is.
const LOCALE_NAMES: Record<Locale, string> = { en: "English", es: "Español" };

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("language");
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label={t("label")}
      value={locale}
      disabled={pending}
      onChange={(event) => {
        const next = event.target.value;
        startTransition(() => setLocale(next));
      }}
      className={`block min-h-11 w-full rounded-field border border-ink-line bg-transparent px-3 text-sm font-medium text-inherit ${className}`}
    >
      {LOCALES.map((value) => (
        <option key={value} value={value} className="text-black">
          {LOCALE_NAMES[value]}
        </option>
      ))}
    </select>
  );
}
