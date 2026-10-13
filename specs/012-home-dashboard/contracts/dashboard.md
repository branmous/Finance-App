# Contracts: Home dashboard

## Repositorios (`packages/db`)

Todos reciben `userId` primero, filtran por él y cuentan solo gastos de primer nivel (`parent_id IS NULL`).

```ts
// expense-repository.ts
categoryTotalsByPeriod(userId: string, period: string): Promise<CategoryTotal[]>
totalsByPeriodRange(userId: string, from: string, to: string): Promise<{ period: string; totalMinor: number }[]>
countPendingByPeriod(userId: string, period: string): Promise<number>

// income-repository.ts
totalsByPeriodRange(userId: string, from: string, to: string): Promise<{ period: string; totalMinor: number }[]>
```

- `from` y `to` son períodos `YYYY-MM` inclusivos; solo se devuelven períodos con datos.
- `categoryTotalsByPeriod` devuelve `categoryId, name, type, color, icon, totalMinor`, ordenado por `totalMinor` descendente.
- `countPendingByPeriod` cuenta gastos de primer nivel sin `paid_on`.

## Núcleo (`@finance-app/core/dashboard`)

```ts
compareAmounts(current: number, previous: number): Comparison
savingsRate(income: number, spent: number): number | null
mergeCategoryTotals(current: CategoryTotal[], previous: CategoryTotal[]): CategoryComparison[] // por |delta| desc, luego current desc, luego nombre
topWithRest(rows: CategoryComparison[], limit?: number): { top: CategoryComparison[]; rest: RestGroup | null } // limit = 6
commitment(input: { categories: CategoryTotal[]; income: number }): Commitment
trendPeriods(endPeriod: string, months?: number): string[] // months = 6, cronológico
buildTrend(periods: string[], spent: PeriodTotal[], income: PeriodTotal[]): TrendPoint[]
debtsOverview(debts: DebtInput[], period: string, nowPeriod: string): DebtsOverview
perPersonMinor(totalMinor: number, participantCount: number): number
tripYearSpan(startDate: string | null, endDate: string | null, year: number): { startPct: number; widthPct: number } | null
buildAlerts(input: AlertInput): DashboardAlert[] // máximo MAX_ALERTS = 4
```

Constantes con nombre: `ALERT_CATEGORY_RISE_PERCENT = 20`, `ALERT_CATEGORY_RISE_MIN_MINOR = 50_000`, `ALERT_TIGHT_MARGIN_PERCENT = 20`, `MAX_ALERTS = 4`, `TOP_CATEGORIES = 6`, `TREND_MONTHS = 6`.

### Alertas

| Código | Severidad | Condición | Parámetros |
|--------|-----------|-----------|------------|
| `deficit` | high | `spent > income` e `income > 0` | `amount` (spent − income) |
| `overdueInstallments` | high | `overdueInstallments > 0` | `count` |
| `tightMargin` | medium | `income > 0`, no `deficit`, `savingsRate < 20` | `percent` |
| `categoryRise` | medium | mayor aumento con `deltaPercent ≥ 20` y `deltaMinor ≥ 50.000` | `category`, `percent`, `amount` |
| `pendingPayments` | medium | `pendingCount > 0` | `count`, `amount` |
| `unsettledTrips` | low | `unsettledTrips > 0` | `count` |
| `subscriptions` | low | `subscriptionMinor > 0` | `amount`, `percent` (puede ser nulo → sin porcentaje) |

Ordenar por severidad y luego por el orden de esta tabla; devolver las 4 primeras.

## Página (`apps/web/app/(app)/page.tsx`)

`searchParams: { period?: string | string[] }` → período efectivo según D1. Carga en paralelo: `summaryByPeriod` ×2, `incomes.totalByPeriod` ×2, `categoryTotalsByPeriod` ×2, `totalsByPeriodRange` (gastos e ingresos), `countPendingByPeriod`, `countByPeriod(mes anterior al actual)`, `debts.list`, `trips.list`.

Enlaces: aviso de captura → `/monthly-expenses?period=<mes>`; "Otras"/lista completa → `/monthly-expenses?period=<período>`; deudas → `/debts`; viajes → `/travels` y `/travels/<id>`.
