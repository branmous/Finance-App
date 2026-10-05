# Phase 1 Data Model: Cimientos del Proyecto

Este spec no introduce tablas de negocio (categorías, cuentas, gastos, etc.); esas llegan en
specs futuros. Lo único que se modela aquí es la convención de columnas compartidas que la
constitución exige para toda tabla de dominio, y el registro de migraciones que Drizzle Kit
gestiona automáticamente.

## Shared Columns (helper, no es una tabla en sí)

Definido en `packages/db/schema/shared-columns.ts`, para que specs futuros lo reutilicen en cada
tabla nueva en vez de repetir las columnas a mano.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid`, primary key, default `gen_random_uuid()` | Identificador de cada fila. |
| `user_id` | `uuid`, not null | Referencia al único usuario autorizado hoy; requerido por la constitución (Modelo de Datos y Multiusuario) aunque no exista todavía una tabla `users` con múltiples filas. |
| `created_at` | `timestamptz`, not null, default `now()` | Fecha de creación de la fila. |
| `updated_at` | `timestamptz`, not null, default `now()` | Fecha de última modificación; se actualiza en cada `UPDATE`. |

**Validation rules**: ninguna regla de negocio en este spec — `user_id` no tiene todavía una
tabla `users` a la cual referenciar con una foreign key, porque no hay múltiples usuarios reales;
specs futuros pueden agregar esa foreign key sin romper esta convención.

**State transitions**: no aplica (no hay entidades con estados en este spec).

## Migración inicial (`0000_init.sql`)

- **Decision**: la migración inicial generada por Drizzle Kit queda vacía de tablas de negocio;
  su único propósito es confirmar que la conexión, las credenciales y el historial de migraciones
  (`drizzle.__drizzle_migrations` o equivalente) funcionan de punta a punta (FR-006, FR-007).
- Cualquier tabla de dominio (categorías, cuentas, etc.) se añade como una migración nueva en el
  spec correspondiente, nunca modificando `0000_init.sql` retroactivamente.
