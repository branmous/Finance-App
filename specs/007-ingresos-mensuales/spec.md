# Spec 007: Ingresos mensuales

## Objetivo
Registrar los ingresos de cada mes (nómina u otros pagos mensuales) con su monto y el mes al que corresponden, con ABM completo.

## Decisiones
- Un ingreso tiene: tipo, monto (COP enteros), mes `YYYY-MM` y nota opcional (≤140). Sin categorías ni fecha de recepción.
- Tipos en lista cerrada validada en core: `payroll`, `freelance`, `rent`, `other`; se guardan como `varchar`.
- Pantalla `/monthly-income` con navegación por mes, total del mes y lista con editar/borrar (con confirmación).
- El dashboard muestra la tarjeta "Income in <mes>" con el total del mes actual.
- Todas las consultas se filtran por `user_id`: un usuario nunca ve ni modifica ingresos ajenos.
- La UI sigue en inglés, como el resto de la app.

## Fuera de alcance
Copiar ingresos del mes anterior, ingresos recurrentes automáticos, balance ingresos − gastos, multimoneda.

## Verificación
- `pnpm --filter @finance-app/core test` y `pnpm --filter @finance-app/db test`.
- `pnpm --filter @finance-app/web test:e2e` (`apps/web/tests/e2e/monthly-income.spec.ts`), con PostgreSQL accesible y la migración `0007_incomes` aplicada.
