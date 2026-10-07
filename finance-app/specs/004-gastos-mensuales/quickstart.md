# Quickstart: Gastos Mensuales

Comandos desde `finance-app/`.

1. Aplicar migraciones: `pnpm --filter @finance-app/db migrate` (requiere `DATABASE_URL`). Con Docker, `docker compose up --build web` las aplica al arrancar.
2. Crear un usuario si no existe: `pnpm --filter @finance-app/db seed-user --email a@ejemplo.com --username brand --password <mínimo 12 caracteres>`.
3. Iniciar la app y abrir http://localhost:3000.
4. Crear una categoría (por ejemplo, Rent) y abrir **Monthly expenses**.
5. Registrar un gasto: categoría, monto, fecha de pago y mes al que corresponde. Usar las flechas para ver el mes pasado y su total.
6. Pruebas: `pnpm test` (core y db) y `pnpm --filter @finance-app/web test:e2e` (requiere `DATABASE_URL`).
