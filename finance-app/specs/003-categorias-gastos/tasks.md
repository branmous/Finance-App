# Tasks: Categorías de Gastos y Shell Visual

Rutas relativas a `finance-app/`.

## Phase 1: Dominio (core)
- [X] T001 [US1] Pruebas de categorías en `packages/core/tests/categories/`
- [X] T002 [US1] `packages/core/src/categories/` (tipos, listas, `validateCategoryInput`) y export en `src/index.ts`

## Phase 2: Datos (db)
- [X] T003 [US1][US2] Pruebas del repositorio y migración en `packages/db/tests/`
- [X] T004 [US1] `packages/db/schema/categories.ts` y migración `0002_create_categories.sql`
- [X] T005 [US1][US2] `packages/db/src/category-repository.ts` y export en `src/index.ts`

## Phase 3: Sistema visual y layout (web)
- [X] T006 [US4] Tailwind, tokens, fuentes y `globals.css`
- [X] T007 [US3] Componentes `apps/web/components/ui/`
- [X] T008 [US4] Rediseño del login conservando su comportamiento
- [X] T009 [US3] Callback de sesión con `user.id`; layout `(app)` con sidebar y Log out
- [X] T010 [US3] Dashboard en `app/(app)/page.tsx`

## Phase 4: Página Categories (web)
- [X] T011 [US1][US2] Server Actions `app/(app)/categories/actions.ts`
- [X] T012 [US1] Página, lista agrupada, diálogo de crear/editar y confirmar borrado

## Phase 5: Verificación
- [X] T013 Playwright `tests/e2e/categories.spec.ts`
- [X] T014 Lint, tests, build y revisión manual (escritorio y móvil)
