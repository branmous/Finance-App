# Tasks: Carga masiva de gastos por mes (CSV)

**Input**: Design documents from `/specs/011-carga-masiva-gastos/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: obligatorias (Constitución IV): Vitest en core, PGlite en db, Playwright para el flujo.

**Convención**: `[P]` = paralelizable (archivos distintos, sin dependencias pendientes); `[USn]` = historia del spec. Código, nombres y commits en inglés.

## Phase 1: Setup

- [x] T001 Confirmar que se trabaja en la rama `feature/011-carga-masiva-gastos` creada desde `main` y que `.specify/feature.json` apunta a `specs/011-carga-masiva-gastos`
- [x] T002 [P] Verificar el entorno: `pnpm install`, PostgreSQL local arriba (`docker compose up -d db`) y que `pnpm --filter @finance-app/core test` y `pnpm --filter @finance-app/db test` pasan antes de empezar

---

## Phase 2: Foundational (bloquea todas las historias)

**Purpose**: parser CSV, tipos y códigos de error compartidos.

- [x] T003 [P] Escribir pruebas de `parseCsv` en `packages/core/tests/expenses/csv.test.ts`: BOM, `\r\n`, separador `,` y `;` detectado por la línea de encabezados, campos entre comillas con comas/saltos/`""`, filas vacías ignoradas, comillas sin cerrar y filas con distinto número de campos → `csvBadFormat`
- [x] T004 Implementar `parseCsv(text)` en `packages/core/src/expenses/csv.ts` devolviendo filas con número de línea (1 = encabezados) para que las pruebas de T003 pasen (sin dependencias externas)
- [x] T005 [P] Definir en `packages/core/src/expenses/bulk-import.ts` los tipos `BulkImportColumn`, `BulkImportRow`, `BulkImportError`, `BulkImportResult` y las constantes `BULK_IMPORT_MAX_ROWS = 500`, `BULK_IMPORT_MAX_BYTES = 1_048_576`, `BULK_IMPORT_COLUMNS = ["category","amount","paidOn","note"]` (ver [data-model.md](./data-model.md))
- [x] T006 [P] Agregar los códigos `csvEmpty`, `csvMissingColumn` (`{column}`), `csvUnknownColumn` (`{column}`), `csvUnknownCategory` (`{name}`), `csvNoRows`, `csvTooManyRows` (`{max}`), `csvTooLarge` (`{maxMb}`), `csvBadFormat` en `apps/web/messages/en/validation.json` y `apps/web/messages/es/validation.json` con los mismos placeholders
- [x] T007 Exportar el módulo nuevo desde el subpath `@finance-app/core/expenses` (`packages/core/src/expenses/index.ts` y/o `packages/core/package.json` si hace falta)

**Checkpoint**: `pnpm --filter @finance-app/core test` y `pnpm --filter web test` (paridad de catálogos) en verde.

---

## Phase 3: User Story 1 — Descargar la plantilla con mis categorías (P1)

**Goal**: el usuario descarga un CSV con una fila por categoría propia.

**Independent Test**: con varias categorías, `GET /monthly-expenses/template` devuelve el CSV esperado y solo con categorías propias.

- [x] T008 [P] [US1] Pruebas de `buildTemplateCsv(categories)` en `packages/core/tests/expenses/bulk-import.test.ts`: encabezados exactos, una fila por categoría, nombre con coma/comillas/acentos escapado, sin categorías → solo encabezados, BOM al inicio
- [x] T009 [US1] Implementar `buildTemplateCsv` en `packages/core/src/expenses/bulk-import.ts` (separador `,`, BOM UTF-8, escape RFC 4180)
- [x] T010 [US1] Crear el route handler `GET` en `apps/web/app/(app)/monthly-expenses/template/route.ts`: `getSessionUser()` (401 sin sesión), `categoryRepository.list(userId)` de `packages/db/src/category-repository.ts`, respuesta `text/csv; charset=utf-8` y `Content-Disposition: attachment; filename="expenses-template.csv"`
- [x] T011 [US1] Agregar a `apps/web/messages/{en,es}/expenses.json` los textos del botón/enlace "Descargar plantilla" y del título del diálogo de carga masiva

**Checkpoint**: la plantilla se descarga manualmente y abre bien en Excel.

---

## Phase 4: User Story 2 — Cargar los gastos de un mes (P1) 🎯 MVP

**Goal**: subir un CSV válido, ver la vista previa y confirmar para crear los gastos independientes del mes elegido.

**Independent Test**: plantilla llena con 3 categorías → vista previa con cantidad y total → confirmar → 3 gastos en el mes, sin `parentId`.

- [x] T012 [P] [US2] Pruebas de `validateBulkImport` camino feliz en `packages/core/tests/expenses/bulk-import.test.ts`: monto `1500000`, `1.500.000`, `1,500,000`, `$1.500.000` → 1500000; fila con monto vacío ignorada (`ignored`); varias filas de la misma categoría; `paidOn` con fecha vs vacío (null); nombre de categoría sin distinguir mayúsculas; `parentId` siempre `null`; total correcto; orden de columnas libre
- [x] T013 [US2] Implementar `validateBulkImport({ text, period, categories })` en `packages/core/src/expenses/bulk-import.ts`: valida encabezados, normaliza `amount` a entero seguro > 0 (los decimales se rechazan con `amountPositive`), resuelve categoría por `lower(trim(name))`, delega cada fila en `validateExpenseInput` de `packages/core/src/expenses/expense.ts` con `parentId: null`, devuelve `{ ok: true, rows, total, ignored }`
- [x] T014 [P] [US2] Pruebas de repositorio en `packages/db/tests/expense-repository.test.ts` (PGlite, usuarios alice/bob): `createMany` inserta N filas en el mes con `parentId` null y `currency` COP; devuelve el conteo; categoría de otro usuario → `ExpenseCategoryNotFoundError` y 0 filas insertadas; lista vacía → 0; `countByPeriod` cuenta solo al usuario y mes
- [x] T015 [US2] Implementar `createMany(userId, period, rows)` y `countByPeriod(userId, period)` en `packages/db/src/expense-repository.ts`: verificar con un solo `select ... inArray(categories.id, ids) and userId` que todas las categorías son propias, luego un único `insert(expenses).values([...])` (atómico, como `copyToPeriod`)
- [x] T016 [US2] Agregar `previewBulkExpenses(formData)` e `importBulkExpenses(formData)` en `apps/web/app/(app)/monthly-expenses/actions.ts` según [contracts/actions.md](./contracts/actions.md): sesión (`SESSION_EXPIRED`), validar `period` con `isValidPeriod`, `file.size` ≤ `BULK_IMPORT_MAX_BYTES`, leer texto, categorías del usuario, `validateBulkImport`; `preview` añade `countByPeriod`; `import` revalida, llama `createMany` y `revalidatePath("/monthly-expenses")` y `("/")`
- [x] T017 [US2] Crear `apps/web/app/(app)/monthly-expenses/bulk-import-dialog.tsx` (patrón `copy-expenses-dialog.tsx` y `useTransition`): selector de mes (inicial = período de la página), enlace a la plantilla, input `.csv`, vista previa (cantidad, total con `formatCop`, aviso de mes con gastos), botón "Confirmar carga" y mensaje de éxito con la cantidad creada
- [x] T018 [US2] Añadir el botón "Carga masiva" que abre el diálogo en `apps/web/app/(app)/monthly-expenses/expenses-view.tsx` y pasar `period` desde `page.tsx`
- [x] T019 [P] [US2] Completar textos del diálogo (vista previa, aviso de mes con gastos, éxito, estados de carga) en `apps/web/messages/en/expenses.json` y `apps/web/messages/es/expenses.json`
- [x] T020 [US2] Prueba e2e del camino feliz en `apps/web/tests/e2e/bulk-import.spec.ts` (mes futuro aislado, sufijo `runId` en nombres, patrón de `monthly-expenses.spec.ts`): descarga plantilla, sube archivo generado en el test, ve la vista previa, confirma y verifica los gastos, pagados/pendientes y que ninguno quedó vinculado; segunda carga muestra el aviso de mes con gastos

**Checkpoint**: MVP funcional de punta a punta.

---

## Phase 5: User Story 3 — Corregir un archivo con errores (P2)

**Goal**: ante cualquier fila inválida no se guarda nada y se reporta línea, columna y motivo.

**Independent Test**: archivo con categoría inexistente y monto no numérico → ambos errores listados y el mes sin cambios.

- [x] T021 [P] [US3] Pruebas de errores en `packages/core/tests/expenses/bulk-import.test.ts`: categoría desconocida (`csvUnknownCategory`), monto `abc`/`0`/`-5`/`15,50`, fecha `2026-02-30`, nota > 140, columna `parent`/`parentId`/otra (`csvUnknownColumn`), falta columna (`csvMissingColumn`), archivo vacío, sin filas con monto, > 500 filas, acumulación de todos los errores con su línea y columna, límite de bytes
- [x] T022 [US3] Completar `validateBulkImport` en `packages/core/src/expenses/bulk-import.ts` para acumular todos los errores (`{ line, column, error }`) y aplicar los límites de filas/bytes, sin lanzar excepciones
- [x] T023 [P] [US3] Pruebas db: atomicidad de `createMany` (si una categoría no es propia, no queda ninguna fila) en `packages/db/tests/expense-repository.test.ts` (si no quedó cubierta en T014)
- [x] T024 [US3] Mostrar el reporte de errores en `bulk-import-dialog.tsx` con `useValidationMessage` (`apps/web/lib/use-validation-message.ts`): lista "Línea N · columna · motivo", deshabilitar "Confirmar" cuando hay errores, permitir subir otro archivo
- [x] T025 [P] [US3] Textos de la sección de errores en `apps/web/messages/{en,es}/expenses.json`
- [x] T026 [US3] Ampliar `apps/web/tests/e2e/bulk-import.spec.ts`: archivo con errores (reporte visible, mes sin cambios), columna `parent` rechazada, archivo sin encabezados

**Checkpoint**: las tres historias funcionan de forma independiente.

---

## Phase 6: Polish

- [x] T027 [P] Verificar paridad de catálogos y que no haya textos sin traducir: `pnpm --filter web test` (`tests/unit/messages.test.ts`) y revisión manual en inglés y español
- [x] T028 [P] Revisar accesibilidad del diálogo (foco, etiquetas del input de archivo, `aria-live` en el resultado) y el estado de carga (`Spinner`)
- [ ] T029 Ejecutar `pnpm lint`, typecheck y todas las pruebas (`core`, `db`, `web`, Playwright `bulk-import`) y el escenario manual de [quickstart.md](./quickstart.md); medir SC-004 (500 filas < 5 s)
- [ ] T030 Documentar el cierre: marcar tareas completadas, y abrir el PR desde `feature/011-carga-masiva-gastos` hacia `main` con referencia al spec

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → historias. Phase 2 bloquea todo.
- US1 (plantilla) es independiente de US2/US3 una vez hecha la Phase 2.
- US2 depende de Phase 2 (parser, tipos, códigos); US3 extiende `validateBulkImport` y el diálogo de US2, por lo que va después de T013/T017.
- Dentro de cada historia: pruebas ([P]) antes de la implementación correspondiente (TDD).

### Parallel opportunities

- Phase 2: T003, T005 y T006 en paralelo; T004 tras T003.
- US1: T008 en paralelo con T011.
- US2: T012 y T014 en paralelo (core y db); T019 en paralelo con T017/T018.
- US3: T021, T023 y T025 en paralelo.
- Polish: T027 y T028 en paralelo.

## Implementation Strategy

1. **MVP**: Phase 1 + 2 + US2 con US1 (plantilla, necesaria para obtener el archivo) → ya se pueden cargar meses completos.
2. Añadir US3 para el reporte detallado de errores y las pruebas de borde.
3. Cerrar con Polish y PR.
