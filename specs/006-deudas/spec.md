# Spec 006: Deudas

## Objetivo
Registrar deudas a cuotas fijas mensuales (ej. seguro de la moto: 300 COP/mes, de ago-2026 a jun-2027 = 11 cuotas) y marcar con un toque los meses ya pagados.

## Decisiones
- **Pagar una cuota crea el gasto de ese mes**, con la categoría de la deuda y `debt_id` + `period`. Así los totales de Gastos mensuales y del dashboard la incluyen sin registrarla dos veces. No hay tabla de pagos aparte: una cuota pagada es un gasto con `debt_id` y `paid_on` no nulo.
- La deuda es la plantilla y el gasto es la ocurrencia (principio V). El mes final es derivado: `inicio + cuotas - 1`.
- Índice único parcial `(debt_id, period)`: una cuota por mes y deuda. Marcar es idempotente.
- Borrar la deuda conserva los gastos ya pagados (`debt_id` pasa a null). Borrar un gasto de cuota desde Gastos mensuales deja esa cuota como pendiente.
- Al editar no se permite un rango que deje cuotas pagadas fuera de él.
- Fecha de pago de una cuota: el día 1 de su mes, pero nunca posterior a hoy.
- Alta con "cuotas ya pagadas" N: marca las primeras N cuotas.
- Se ofrece "Mark all N due as paid" por deuda (pone al día hasta el mes actual) en vez de un menú por chip.

## Fuera de alcance
Intereses y amortización, préstamos a terceros, pagos parciales o adelantados, multimoneda, recordatorios, tarjeta de deudas en el dashboard.

## Verificación
- `pnpm --filter @finance-app/core test` y `pnpm --filter @finance-app/db test`.
- `pnpm --filter web test:e2e` (`apps/web/tests/e2e/debts.spec.ts`), con PostgreSQL accesible y la migración `0006_debts` aplicada.
