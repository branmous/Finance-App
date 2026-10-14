import type { AlertSeverity, DashboardAlert } from "@finance-app/core/dashboard";
import { formatCop } from "@finance-app/core/expenses";
import { useTranslations } from "next-intl";

const LOOKS: Record<AlertSeverity, { glyph: string; box: string }> = {
  high: { glyph: "!", box: "border-clay bg-clay-tint text-clay" },
  medium: { glyph: "▲", box: "border-saffron bg-saffron-tint text-saffron-ink" },
  low: { glyph: "i", box: "border-paper-line bg-paper-raised text-ink" },
};

/** Up to four findings computed from the month's own numbers; the wording comes from the alert code. */
export function AlertsPanel({ alerts }: { alerts: DashboardAlert[] }) {
  const t = useTranslations("dashboard.alerts");

  return (
    <section aria-labelledby="alerts-title" className="rounded-panel border border-paper-line p-5 sm:p-6">
      <h2 id="alerts-title" className="text-base font-semibold">
        {t("title")}
      </h2>

      {alerts.length === 0 ? (
        <p className="mt-4 text-sm text-paper-muted" data-testid="alerts-empty">
          {t("none")}
        </p>
      ) : (
        <ul className="mt-4 space-y-3" data-testid="alerts">
          {alerts.map((alert) => {
            const look = LOOKS[alert.severity];
            const key = alert.code === "subscriptions" && "percent" in alert.params ? "subscriptionsShare" : alert.code;
            // Amounts travel as whole pesos; the wording is where they become money.
            const values = Object.fromEntries(
              Object.entries(alert.params).map(([name, value]) => [name, name === "amount" ? formatCop(Number(value)) : value]),
            );
            return (
              <li
                key={alert.code}
                data-alert={alert.code}
                className={`flex items-start gap-3 rounded-field border px-3 py-2.5 text-sm ${look.box}`}
              >
                <span aria-hidden="true" className="mt-0.5 w-4 shrink-0 text-center font-bold">
                  {look.glyph}
                </span>
                <span>
                  <span className="sr-only">{t(alert.severity)}: </span>
                  {t(key, values)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
