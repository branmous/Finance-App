import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { catalogs } from "../messages";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, matchAcceptLanguage, type Locale } from "./config";

/** Cookie first, then the browser language, then English. */
export function resolveLocale(): Locale {
  const saved = cookies().get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  return matchAcceptLanguage(headers().get("accept-language")) ?? DEFAULT_LOCALE;
}

type Tree = { [key: string]: string | Tree };

function mergeWithFallback(base: Tree, override: Tree): Tree {
  const result: Tree = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = result[key];
    result[key] =
      typeof value === "object" && typeof current === "object"
        ? mergeWithFallback(current, value)
        : value;
  }
  return result;
}

export default getRequestConfig(async () => {
  const locale = resolveLocale();
  // English is the fallback: a key missing in another language shows the English text, never the raw key.
  const messages =
    locale === "en" ? catalogs.en : mergeWithFallback(catalogs.en as Tree, catalogs[locale] as Tree);
  return { locale, messages };
});
