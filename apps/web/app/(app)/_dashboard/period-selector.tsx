import { currentPeriod, shiftPeriod } from "@finance-app/core";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { useFormatters } from "@/lib/format";

/** Moves the whole home one month back or forth; the chosen month lives in the address (`?period=`). */
export function PeriodSelector({ period, previousPeriod }: { period: string; previousPeriod: string }) {
  const t = useTranslations("dashboard.period");
  const format = useFormatters();
  const earlier = shiftPeriod(period, -1);
  const later = shiftPeriod(period, 1);
  const hasLater = later <= currentPeriod();
  const linkClass =
    "inline-flex size-11 items-center justify-center rounded-field border border-paper-line text-ink hover:bg-paper-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-leaf";

  return (
    <nav aria-label={t("nav")} className="flex items-center gap-2">
      <Link href={`/?period=${earlier}`} className={linkClass} aria-label={t("previous")} scroll={false}>
        <Icon name="chevronLeft" width={18} height={18} />
      </Link>
      <p className="min-w-44 text-center text-sm font-semibold" data-testid="dashboard-period" data-period={period}>
        {t("current", { month: format.month(period), previous: format.month(previousPeriod) })}
      </p>
      {hasLater ? (
        <Link href={`/?period=${later}`} className={linkClass} aria-label={t("next")} scroll={false}>
          <Icon name="chevronRight" width={18} height={18} />
        </Link>
      ) : (
        <span aria-hidden="true" className="size-11" />
      )}
    </nav>
  );
}
