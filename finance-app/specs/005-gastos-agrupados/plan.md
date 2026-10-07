# Implementation Plan: Gastos Agrupados

**Branch**: `feature/005-gastos-agrupados` | **Spec**: [spec.md](./spec.md)

## Summary

Columna `parent_id` en `expenses` (auto-referencia), reglas de vinculación en el repositorio, totales
que cuentan solo gastos de nivel superior y una interfaz que anida los hijos bajo su padre.

## Technical Context

- **Datos**: `expenses.parent_id` uuid nulo, FK a `expenses.id` con `ON DELETE SET NULL`, índice `expenses_parent_id_idx`. Migración `0005_expenses_parent.sql`. No se agrega `CHECK (parent_id <> id)` porque `drizzle-kit` de esta versión no lo genera; esa regla vive en el repositorio.
- **Dominio** (`packages/core`): `ExpenseInput.parentId` y su validación (nulo/vacío = independiente, si no, uuid).
- **Repositorio** (`packages/db/src/expense-repository.ts`):
  - `assertValidParent`: el padre existe, es del usuario, es del mismo mes, no es hijo, no es el propio gasto; un gasto con hijos no puede ser hijo ni cambiar de mes. Falla con `InvalidExpenseParentError`.
  - `summaryByPeriod` y `totalByPeriod` filtran `parent_id is null` (el dashboard queda correcto sin cambios).
  - `unlink(userId, id)` suelta un gasto de su padre.
  - `copyToPeriod` genera los ids nuevos con `randomUUID()` y apunta `parentId` a la copia del padre solo si ambos se copian; un único `INSERT`.
- **Web** (`app/(app)/monthly-expenses/`): `actions.ts` (`unlinkExpense`, errores de padre), formulario con "Paid with", vista con hijos indentados y "Make independent", aviso al borrar un padre, jerarquía en el modal de copia.

## Constitution Check

- TypeScript estricto: sí.
- Dominio aislado en `core`: validación pura.
- Dinero como entero: sin cambios; los totales siguen siendo sumas de `bigint`.
- Multiusuario: toda consulta del padre se filtra por `user_id`; un padre ajeno se rechaza.
- Pruebas: Vitest en `core` y `db` (PGlite con migraciones reales); Playwright para los flujos.
- Código en inglés, documentación en español.
