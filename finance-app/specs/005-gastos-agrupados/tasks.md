# Tasks: Gastos Agrupados

Rutas relativas a `finance-app/`.

## Phase 1: Dominio (core)
- [X] T001 [US1] Pruebas de `parentId` en `packages/core/tests/expenses/expense.test.ts`
- [X] T002 [US1] `parentId` en `ExpenseInput` y su validación en `packages/core/src/expenses/expense.ts`

## Phase 2: Datos (db)
- [X] T003 [US1][US2][US3][US4] Pruebas en `packages/db/tests/expense-repository.test.ts`
- [X] T004 [US1] `parentId` en `packages/db/schema/expenses.ts` y migración `0005_expenses_parent.sql`
- [X] T005 [US1][US4] `assertValidParent` e `InvalidExpenseParentError` en `expense-repository.ts`
- [X] T006 [US1] Totales de nivel superior en `summaryByPeriod` y `totalByPeriod`
- [X] T007 [US2] `unlink` en el repositorio
- [X] T008 [US3] `copyToPeriod` conserva la relación cuando se copian ambos

## Phase 3: Web
- [X] T009 [US1][US2] `actions.ts`: errores de padre y `unlinkExpense`
- [X] T010 [US1] Select "Paid with" en `expense-form-dialog.tsx`
- [X] T011 [US1][US2] Hijos anidados, "Make independent" y aviso al borrar un padre en `expenses-view.tsx`
- [X] T012 [US3] Jerarquía en `copy-expenses-dialog.tsx`

## Phase 4: Verificación
- [X] T013 Playwright en `tests/e2e/monthly-expenses.spec.ts`
- [X] T014 Lint, tests, build y revisión manual
