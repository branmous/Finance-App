# Implementation Plan: Gastos Mensuales

**Branch**: `feature/004-gastos-mensuales` | **Spec**: [spec.md](./spec.md)

## Summary

Nueva tabla `expenses` enlazada a `categories`, dominio de validación y de periodos en
`packages/core`, repositorio en `packages/db` y una página `/monthly-expenses` con Server
Actions en `apps/web`, siguiendo el patrón del módulo de categorías.

## Technical Context

- **Datos**: tabla `expenses` (`id`, `user_id` FK `users` cascade, `category_id` FK `categories` **restrict**, `amount_minor` bigint, `currency` varchar(3) default `COP`, `period` varchar(7), `paid_on` date, `note` varchar(140), timestamps). Índices `(user_id, period)` y `(category_id)`. Migración `0003_create_expenses.sql`.
- **Dominio** (`packages/core/src/expenses/`): `validateExpenseInput`, helpers de periodo (`currentPeriod`, `shiftPeriod`, `formatPeriod`, `isValidPeriod`) y `formatCop`. Subpath `@finance-app/core/expenses` para componentes cliente, sin arrastrar bcrypt al navegador.
- **Repositorio**: `packages/db/src/expense-repository.ts` (`listByPeriod`, `totalByPeriod`, `create`, `update`, `remove`). `create` y `update` verifican que la categoría sea del usuario (la FK sola no lo garantiza). `category-repository.remove` lanza `CategoryInUseError` ante la violación de FK.
- **Web**: `app/(app)/monthly-expenses/` (`page.tsx` lee `?period=YYYY-MM`, `actions.ts`, `expenses-view.tsx`, `expense-form-dialog.tsx`); ítem "Monthly expenses" en el menú; widget "Spent in <mes>" en el dashboard.

## Constitution Check

- TypeScript estricto: sí.
- Dominio aislado en `core`: validación y periodos puros, sin dependencias de web ni db.
- Dinero como entero en unidad mínima: `amount_minor` bigint, sin float/decimal.
- Modelo multiusuario: `user_id` en la tabla y filtrado en el repositorio; propiedad de la categoría verificada.
- Pruebas: Vitest en `core` y `db` (PGlite con migraciones reales), Playwright para los flujos.
- Código en inglés, documentación en español.
