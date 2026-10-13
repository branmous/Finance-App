# Data Model: Home dashboard del mes cerrado

**Cambios de esquema**: Ninguno. No hay migración.

## Fuentes (existentes)

| Dato | Tabla / API | Notas |
|------|-------------|-------|
| Gastos del período | `expenses` | solo `parent_id IS NULL` en totales |
| Gasto por categoría | `expenses` ⋈ `categories` | agrupado por categoría |
| Ingresos | `incomes` | suma por período |
| Deudas | `debts` + gastos con `debt_id` | `debtProgress` |
| Viajes | `trips`, `trip_participants`, `trip_expenses`, `trip_settlements` | solo vía `trips.list`; nunca en totales mensuales |

## Tipos nuevos (core, solo lectura, no se guardan)

```ts
type Comparison = { current: number; previous: number; delta: number; deltaPercent: number | null };

type CategoryTotal = {
  categoryId: string; name: string; type: string; color: string; icon: string; totalMinor: number;
};

type CategoryComparison = Omit<CategoryTotal, "totalMinor"> & {
  currentMinor: number; previousMinor: number; deltaMinor: number;
  deltaPercent: number | null; isNew: boolean;
};

type TrendPoint = { period: string; incomeMinor: number; spentMinor: number };

type DebtsOverview = {
  monthlyMinor: number; remainingInstallments: number; endPeriod: string | null; overdueInstallments: number;
};

type AlertSeverity = "high" | "medium" | "low";
type DashboardAlert = { code: AlertCode; severity: AlertSeverity; params: Record<string, string | number> };
```

## Reglas de cálculo

- `deltaPercent = null` cuando `previous = 0`; en otro caso `round((current - previous) / previous * 100, 1)`.
- `savingsRate = null` cuando `income <= 0`; en otro caso `round((income - spent) / income * 100, 1)` (puede ser negativo).
- `isNew = previousMinor = 0 && currentMinor > 0`.
- Compromiso = totales de categorías `fixed` y `subscription` del período; porcentaje sobre ingresos (`null` sin ingresos).
- Costo por persona = `round(totalMinor / participantCount)`; con 0 participantes, el total.
