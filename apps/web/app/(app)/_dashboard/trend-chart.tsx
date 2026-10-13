import type { TrendPoint } from "@finance-app/core/dashboard";
import { formatCop } from "@finance-app/core/expenses";
import { useLocale, useTranslations } from "next-intl";

import { intlLocale, useFormatters } from "@/lib/format";

const WIDTH = 600;
const HEIGHT = 220;
const PAD = { top: 16, right: 8, bottom: 28, left: 8 };

/** "Sep" / "sept" for a "YYYY-MM" period, in the viewer's language. */
function shortMonth(period: string, locale: string): string {
  const [year, month] = period.split("-").map(Number) as [number, number];
  return new Intl.DateTimeFormat(intlLocale(locale), { month: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

/**
 * Income (solid) against spending (hatched) for the last months. The two series differ by fill pattern
 * as well as color, and the whole chart is described in its label.
 */
export function TrendChart({ points }: { points: TrendPoint[] }) {
  const t = useTranslations("dashboard.trend");
  const locale = useLocale();
  const format = useFormatters();
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return null;

  const max = Math.max(1, ...points.flatMap((point) => [point.incomeMinor, point.spentMinor]));
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const slot = (WIDTH - PAD.left - PAD.right) / points.length;
  const barWidth = Math.min(34, slot * 0.34);
  const barHeight = (value: number) => (value / max) * plotHeight;

  const description = [
    t("label", { from: format.month(first.period), to: format.month(last.period) }),
    ...points.map((point) =>
      t("point", {
        month: format.month(point.period),
        income: formatCop(point.incomeMinor),
        spent: formatCop(point.spentMinor),
      }),
    ),
  ].join(". ");

  return (
    <section aria-labelledby="trend-title" className="rounded-panel border border-paper-line p-5 sm:p-6">
      <h2 id="trend-title" className="text-base font-semibold">
        {t("title")}
      </h2>
      <p className="mt-0.5 text-sm text-paper-muted">{t("hint")}</p>

      <svg
        role="img"
        aria-label={description}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-4 h-auto w-full"
        data-testid="trend-chart"
      >
        <defs>
          <pattern id="dashboard-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#fbf0d4" />
            <rect width="3" height="6" fill="#e9a820" />
          </pattern>
        </defs>
        <line x1={PAD.left} x2={WIDTH - PAD.right} y1={HEIGHT - PAD.bottom} y2={HEIGHT - PAD.bottom} stroke="#d9e1d6" />
        <text x={PAD.left} y={11} fontSize="11" fill="#5f726a">
          {formatCop(max)}
        </text>
        {points.map((point, index) => {
          const center = PAD.left + slot * index + slot / 2;
          const incomeHeight = barHeight(point.incomeMinor);
          const spentHeight = barHeight(point.spentMinor);
          return (
            <g key={point.period} data-period={point.period}>
              <title>
                {t("point", {
                  month: format.month(point.period),
                  income: formatCop(point.incomeMinor),
                  spent: formatCop(point.spentMinor),
                })}
              </title>
              <rect
                x={center - barWidth - 1}
                y={HEIGHT - PAD.bottom - incomeHeight}
                width={barWidth}
                height={incomeHeight}
                rx={3}
                fill="#1f7a5c"
              />
              <rect
                x={center + 1}
                y={HEIGHT - PAD.bottom - spentHeight}
                width={barWidth}
                height={spentHeight}
                rx={3}
                fill="url(#dashboard-hatch)"
                stroke="#e9a820"
              />
              <text x={center} y={HEIGHT - 8} fontSize="12" textAnchor="middle" fill="#5f726a">
                {shortMonth(point.period, locale)}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-paper-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-sm bg-leaf" />
          {t("income")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-3 rounded-sm border border-saffron"
            style={{ background: "repeating-linear-gradient(45deg, #e9a820 0 3px, #fbf0d4 3px 6px)" }}
          />
          {t("spent")}
        </span>
      </p>
    </section>
  );
}
