"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { setLocale } from "@/i18n/actions";
import { LOCALES, type Locale } from "@/i18n/config";

// Each language is named in its own language, so it is recognizable whatever the current one is.
const LOCALE_NAMES: Record<Locale, string> = { en: "English", es: "Español" };

// Drawn as SVG because Windows renders flag emoji as plain letters.
const FLAGS: Record<Locale, JSX.Element> = {
  // United States: 13 stripes and a blue canton.
  en: (
    <svg viewBox="0 0 30 20" aria-hidden="true" className="h-3.5 w-5 rounded-[2px]">
      <rect width="30" height="20" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((stripe) => (
        <rect key={stripe} y={(stripe * 20) / 13} width="30" height={20 / 13} fill="#b22234" />
      ))}
      <rect width="13" height={(7 * 20) / 13} fill="#3c3b6e" />
      {[2.5, 6.5, 10.5].flatMap((x) =>
        [2, 4.5].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.7" fill="#fff" />),
      )}
    </svg>
  ),
  // Colombia: yellow half, then blue and red quarters.
  es: (
    <svg viewBox="0 0 30 20" aria-hidden="true" className="h-3.5 w-5 rounded-[2px]">
      <rect width="30" height="10" fill="#fcd116" />
      <rect y="10" width="30" height="5" fill="#003893" />
      <rect y="15" width="30" height="5" fill="#ce1126" />
    </svg>
  ),
};

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("language");
  const [pending, startTransition] = useTransition();

  return (
    <div role="radiogroup" aria-label={t("label")} className={`flex gap-1 ${className}`}>
      {LOCALES.map((value) => {
        const selected = value === locale;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={LOCALE_NAMES[value]}
            title={LOCALE_NAMES[value]}
            disabled={pending}
            onClick={() => {
              if (!selected) startTransition(() => setLocale(value));
            }}
            className="flex min-h-11 min-w-11 items-center justify-center disabled:cursor-not-allowed"
          >
            <span
              className={`rounded-[4px] border p-[3px] transition-opacity ${
                selected ? "border-leaf" : "border-transparent opacity-50 hover:opacity-100"
              }`}
            >
              {FLAGS[value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
