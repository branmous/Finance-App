# Tasks: Gastos Mensuales

Rutas relativas a `finance-app/`.

## Phase 1: Dominio (core)
- [X] T001 [US1] Pruebas en `packages/core/tests/expenses/` (validación y periodos)
- [X] T002 [US1][US2] `packages/core/src/expenses/` (`validateExpenseInput`, helpers de periodo, `formatCop`), export en `src/index.ts` y subpath `./expenses`

## Phase 2: Datos (db)
- [X] T003 [US1][US2][US3][US4] Pruebas del repositorio en `packages/db/tests/expense-repository.test.ts`
- [X] T004 [US1] `packages/db/schema/expenses.ts` y migración `0003_create_expenses.sql`
- [X] T005 [US1][US2][US3] `packages/db/src/expense-repository.ts` y export en `src/index.ts`
- [X] T006 [US4] `CategoryInUseError` en `category-repository.remove`

## Phase 3: Web
- [X] T007 [US1][US3] Server Actions `app/(app)/monthly-expenses/actions.ts`
- [X] T008 [US1][US2] Página con selector de mes, total, lista y diálogo de crear/editar/eliminar
- [X] T009 [US2] Ítem de menú, iconos de navegación y widget del dashboard
- [X] T010 [US4] Mensaje de categoría en uso en `app/(app)/categories/actions.ts`

## Phase 4: Verificación
- [X] T011 Playwright `tests/e2e/monthly-expenses.spec.ts`
- [X] T012 Lint, tests, build y revisión manual
