# Spec 008: Ingresos vs gastos

## Objetivo
En Gastos mensuales, comparar lo que se ingresó con lo que se gasta en el mes mostrado: cuánto queda aproximadamente y si hay desfase.

## Decisiones
- Solo lectura: sin tablas ni migraciones. Usa el total de ingresos del mes (007) y el resumen de gastos (004/005).
- **Gastado** = pagado + pendiente (los gastos "paid with" no se cuentan doble, como ya hace el total del mes).
- **Left after pending** = ingresos − gastado. **Left right now** = ingresos − pagado.
- Estado por % gastado sobre ingresos: `ok` (≤80 %), `tight` (>80 %), `over` (gastado > ingresos, se muestra "Over budget by $X"). Sin ingresos: aviso con enlace para agregarlos.
- Cálculo como función pura en core (`computeBalance`), con tests.
- Crear/editar/borrar un ingreso revalida también `/monthly-expenses`.
- La UI sigue en inglés.

## Fuera de alcance
Presupuestos por categoría, metas de ahorro, arrastre del saldo de un mes al siguiente, tarjeta en el dashboard.

## Verificación
- `pnpm --filter @finance-app/core test`.
- `pnpm --filter @finance-app/web test:e2e` (`apps/web/tests/e2e/income-vs-expenses.spec.ts`).
