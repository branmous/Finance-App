# Implementation Plan: Carga masiva de gastos por mes (CSV)

**Branch**: `feature/011-carga-masiva-gastos` | **Date**: 2026-10-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-carga-masiva-gastos/spec.md`

## Summary

Permitir cargar de una vez los gastos de un mes desde un CSV. Se descarga una plantilla con una fila por categoría del usuario, se sube el archivo, se valida **todo** el contenido (todo o nada), se muestra una vista previa (cantidad, total, aviso si el mes ya tiene gastos) y al confirmar se insertan los gastos en una sola sentencia. Los gastos creados son independientes (`parentId = null`). No hay cambios de esquema ni migración.

Enfoque técnico (ver [research.md](./research.md)):
- `packages/core`: parser CSV puro + validación de filas reutilizando `validateExpenseInput` + generador de plantilla. Solo códigos de error, sin texto.
- `packages/db`: `createMany` en `expense-repository.ts`, un único `INSERT` (atómico) tras verificar propiedad de categorías, y `countByPeriod`.
- `apps/web`: route handler `GET` para la plantilla, dos server actions (`previewBulkExpenses`, `importBulkExpenses`) que reciben `FormData` y revalidan el archivo, y un diálogo nuevo en `/monthly-expenses`.

## Technical Context

**Language/Version**: TypeScript strict (Node 20+), Next.js 14 App Router

**Primary Dependencies**: Drizzle ORM 0.33 + `postgres`, next-intl 3.26, next-auth 4. Sin librerías nuevas (parser CSV propio, ~80 líneas, para mantener `core` sin dependencias).

**Storage**: PostgreSQL, tabla `expenses` existente. Sin migración.

**Testing**: Vitest (core, web unit), PGlite (db), Playwright (e2e)

**Target Platform**: Web (Vercel); CI con Docker Compose

**Project Type**: Monorepo web (`apps/web`, `packages/core`, `packages/db`)

**Performance Goals**: validar y previsualizar 500 filas en < 5 s (SC-004); inserción en una sentencia

**Constraints**: archivo ≤ 1 MB y ≤ 500 filas; monto entero en pesos; todo o nada; solo datos del usuario autenticado

**Scale/Scope**: un usuario real, ≤ 100 categorías típicas, ≤ 500 filas por carga

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento |
|-----------|--------------|
| I. TypeScript estricto | Todo el código nuevo en TS strict, sin `any`. ✅ |
| II. Núcleo aislado | Parser, validación y plantilla en `packages/core`, sin Next/ORM; el repositorio recibe filas ya validadas. ✅ |
| III. Dinero como enteros | Montos normalizados a entero seguro > 0 (pesos), `currency` por defecto; sin floats ni decimales. ✅ |
| IV. Pruebas obligatorias | Vitest en core, PGlite en db, e2e Playwright del flujo (descarga, carga, error). ✅ |
| V. Plantilla vs ocurrencia | No aplica: se crean gastos ya ocurridos, sin tocar plantillas ni ocurrencias. ✅ |
| VI. Código en inglés | Identificadores, archivos y commits en inglés; specs en español. ✅ |
| Multiusuario | Sin tablas nuevas; todas las consultas filtradas por `userId`. ✅ |
| Rama `feature/NNN-nombre` | `feature/011-carga-masiva-gastos` = `specs/011-carga-masiva-gastos`. ✅ |
| Fuera del MVP: "importación de extractos" | Esto es carga de plantilla propia del usuario, no importación de extractos bancarios; se trata como spec nuevo con su propio alcance. ✅ (nota en Complexity Tracking) |

Re-evaluación tras el diseño: sin cambios; sin violaciones.

## Project Structure

### Documentation (this feature)

```text
specs/011-carga-masiva-gastos/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── csv-format.md
│   └── actions.md
├── checklists/requirements.md
└── tasks.md              # /speckit-tasks
```

### Source Code (repository root)

```text
packages/core/
├── src/expenses/
│   ├── csv.ts                      # parseCsv(text): delimiter detection, BOM, quotes
│   ├── bulk-import.ts              # buildTemplateCsv, validateBulkImport, limits, error codes
│   └── index.ts                    # re-export (patrón existente de subpath /expenses)
└── tests/expenses/
    ├── csv.test.ts
    └── bulk-import.test.ts

packages/db/
├── src/expense-repository.ts       # + createMany, countByPeriod
└── tests/expense-repository.test.ts # + casos de createMany/countByPeriod

apps/web/
├── app/(app)/monthly-expenses/
│   ├── template/route.ts           # GET → text/csv (plantilla)
│   ├── actions.ts                  # + previewBulkExpenses, importBulkExpenses
│   ├── bulk-import-dialog.tsx      # nuevo diálogo (patrón copy-expenses-dialog.tsx)
│   └── expenses-view.tsx           # + botón "Carga masiva"
├── messages/{en,es}/expenses.json  # textos del diálogo
├── messages/{en,es}/validation.json # códigos nuevos
└── tests/e2e/bulk-import.spec.ts
```

**Structure Decision**: se extiende el módulo de gastos existente (core → db → web) sin crear paquetes nuevos; el parser vive en `core/expenses` porque es lógica de dominio pura y testeable.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Ninguna | — | — |

Nota de gobernanza: la constitución excluye del MVP la "importación de extractos"; esta funcionalidad es distinta (plantilla propia, entrada manual en lote) y llega como spec nuevo, por lo que no requiere enmienda.
