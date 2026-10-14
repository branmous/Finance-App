import type { Comparison } from "@finance-app/core/dashboard";
import { formatCop } from "@finance-app/core/expenses";
import { useTranslations } from "next-intl";

type Props = {
  comparison: Comparison;
  /** Whether a rise is good news (income, what is left) or bad news (spending). */
  goodWhen: "up" | "down";
  previousLabel: string;
  /** False when the month compared against has no data at all. */
  available: boolean;
  /** Dark panels need lighter colors to stay readable. */
  onDark?: boolean;
};

/**
 * Change against the previous month. The direction is spelled out with an arrow and a word, so it
 * never depends on color alone.
 */
export function Delta({ comparison, goodWhen, previousLabel, available, onDark = false }: Props) {
  const t = useTranslations("dashboard.flow");
  if (!available) {
    return <p className={`text-xs ${onDark ? "text-ink-muted" : "text-paper-muted"}`}>{t("noPrevious", { month: previousLabel })}</p>;
  }

  const { delta, deltaPercent } = comparison;
  const direction = delta === 0 ? "same" : delta > 0 ? "up" : "down";
  const good = direction === "same" ? null : direction === goodWhen;
  const tone =
    good === null
      ? onDark
        ? "text-ink-muted"
        : "text-paper-muted"
      : good
        ? onDark
          ? "text-[#7fc4a6]"
          : "text-leaf"
        : onDark
          ? "text-saffron"
          : "text-clay";
  const arrow = direction === "up" ? "▲" : direction === "down" ? "▼" : "•";

  return (
    <p className={`text-xs font-medium tabular-nums ${tone}`} data-direction={direction}>
      <span aria-hidden="true">{arrow} </span>
      <span className="sr-only">{t(direction)} </span>
      {direction === "same" ? t("same") : formatCop(Math.abs(delta))}
      {direction !== "same" && deltaPercent !== null ? ` (${Math.abs(deltaPercent)}%)` : null}{" "}
      <span className={onDark ? "text-ink-muted" : "text-paper-muted"}>{t("vs", { month: previousLabel })}</span>
    </p>
  );
}
