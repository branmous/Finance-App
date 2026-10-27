import { useTranslations } from "next-intl";
import Link from "next/link";

import { useFormatters } from "@/lib/format";

/** Expenses are recorded a month behind: reminds which month is waiting and goes straight to it. */
export function CaptureBanner({ month }: { month: string }) {
  const t = useTranslations("dashboard.capture");
  const format = useFormatters();
  const label = format.month(month);

  return (
    <aside
      aria-labelledby="capture-title"
      data-testid="capture-banner"
      className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-panel border border-saffron bg-saffron-tint p-4 sm:px-6"
    >
      <div>
        <h2 id="capture-title" className="text-base font-semibold text-saffron-ink">
          {t("title", { month: label })}
        </h2>
        <p className="mt-0.5 text-sm text-saffron-ink">{t("body", { month: label })}</p>
      </div>
      <Link
        href={`/monthly-expenses?period=${month}`}
        className="inline-flex min-h-11 items-center rounded-field bg-ink px-4 text-sm font-semibold text-paper hover:bg-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
      >
        {t("cta", { month: label })}
      </Link>
    </aside>
  );
}
