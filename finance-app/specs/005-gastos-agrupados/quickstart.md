# Quickstart: Gastos Agrupados

Comandos desde `finance-app/`.

1. Aplicar migraciones: `pnpm --filter @finance-app/db migrate` (requiere `DATABASE_URL`). Con Docker, `docker compose up --build web` las aplica al arrancar.
2. Crear dos categorías (por ejemplo, Credit card y Netflix) y abrir **Monthly expenses**.
3. Registrar la tarjeta (200.000) y luego Netflix (38.000) eligiendo **Paid with** = la tarjeta. El total del mes sigue en 200.000.
4. Pulsar **Make independent** en Netflix: el total pasa a 238.000.
5. En otro mes, registrar Netflix sin elegir padre.
6. Pruebas: `pnpm test` (core y db) y `pnpm --filter @finance-app/web test:e2e` (requiere `DATABASE_URL`).
