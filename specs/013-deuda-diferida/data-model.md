# Data Model: Deuda diferida

## `debts` (cambios)

| Columna | Tipo | Notas |
|---------|------|-------|
| `kind` | varchar(10) NOT NULL DEFAULT `'monthly'` | `monthly` \| `deferred`. No cambia tras crear. |
| `total_minor` | bigint NULL | Valor total diferido en pesos enteros. Solo `deferred`. |
| `installment_minor` | bigint NOT NULL (existente) | `monthly`: cuota ingresada. `deferred`: `floor(total_minor / total_installments)`. |
| `total_installments` | integer NOT NULL (existente) | `monthly`: derivado de primer/último mes. `deferred`: meses ingresados. |

Checks:
- `kind IN ('monthly', 'deferred')`
- `(kind = 'deferred') = (total_minor IS NOT NULL)`
- `total_minor IS NULL OR total_minor >= total_installments` (cuota ≥ 1)

Filas existentes: `kind = 'monthly'`, `total_minor = NULL`; sin backfill.

`expenses` no cambia: una cuota pagada sigue siendo un gasto con `debt_id` + `period` e índice único parcial; su `amount_minor` es el monto de esa cuota.

## Reglas de cálculo (core)

Para una deuda con `n = totalInstallments`:

- `monthly`: monto de toda cuota = `installmentMinor`; total = `installmentMinor × n`.
- `deferred`: `base = installmentMinor`; cuota `i` (0-based) = `base` si `i < n − 1`, y `totalMinor − base × (n − 1)` si `i = n − 1`. Invariante: suma de cuotas = `totalMinor`.
- Mes final = `startPeriod + n − 1` (igual que hoy).
- Progreso: `paidMinor` / `remainingMinor` = suma de montos de cuotas pagadas / pendientes.

## Validación (entrada)

| Campo | `monthly` | `deferred` |
|-------|-----------|------------|
| `name` | 1..60 | 1..60 |
| `categoryId` | uuid | uuid |
| `installmentMinor` | entero > 0 | (calculado) |
| `totalMinor` | — | entero seguro > 0 |
| `startPeriod` | YYYY-MM | YYYY-MM |
| `endPeriod` | YYYY-MM ≥ inicio | — |
| `months` | (derivado) | entero 1..120, `floor(totalMinor / months) ≥ 1` |
| `alreadyPaid` | 0..total cuotas | 0..months |
| `note` | ≤ 140 | ≤ 140 |

Máximo 120 cuotas en ambos.

## Transiciones y reglas de edición

- Crear: calcula cuota base; con `alreadyPaid = N`, crea los gastos de las primeras N cuotas (la última cuota solo si N = n, con su monto ajustado).
- Editar `monthly`: igual que hoy (no dejar pagadas fuera del rango).
- Editar `deferred`: con ≥ 1 cuota pagada, `totalMinor` y `months` bloqueados (`paidInstallmentsLocked`); sin pagos, se recalcula la cuota. Primer mes sujeto a la regla de rango.
- Borrar: `debt_id` de gastos pagados pasa a null (sin cambio).
