# Quickstart: Categorías de Gastos

Comandos desde `finance-app/`.

1. Aplicar migraciones: `pnpm --filter @finance-app/db migrate` (requiere `DATABASE_URL`).
2. Crear un usuario si no existe: `pnpm --filter @finance-app/db seed-user --email a@ejemplo.com --username brand --password <mínimo 12 caracteres>`.
3. Iniciar la app: `pnpm --filter @finance-app/web dev` y abrir http://localhost:3000.
4. Iniciar sesión, abrir **Categories** en el menú, crear, editar y eliminar categorías.
5. Pruebas: `pnpm test` (core y db) y `pnpm --filter @finance-app/web test:e2e` (requiere `DATABASE_URL`).
