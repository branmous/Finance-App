# Tasks: Deuda diferida (dos tipos de deuda)

**Input**: Design documents from `/specs/013-deuda-diferida/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/debt-input.md](./contracts/debt-input.md)

**Tests**: obligatorias (Constitución IV): Vitest en core, PGlite en db, Playwright para el flujo.

**Convención**: `[P]` = paralelizable; `[USn]` = historia del spec. Código, nombres y comentarios en inglés; specs en español. Mensajes de commit en español, como el historial.

## Phase 1: Setup

- [x] T001 Confirmar que la rama es `feature/013-deuda-diferida` y que `.specify/feature.json` apunta a `specs/013-deuda-diferida`
- [x] T002 [P] Verificar línea base: `pnpm install` y que `pnpm --filter @finance-app/core test` y `pnpm --filter @finance-app/db test` pasan antes de cambiar nada

## Phase 2: Foundational (bloquea todas las historias)

Esquema, migración y funciones puras de reparto que usan todas las historias.

- [x] T003 [P] Pruebas en `packages/core/tests/debts/debt.test.ts` para `deferredInstallmentMinor`, `installmentAmount` y `debtTotalMinor`: total 1.200.000 / 12 → 100.000 en todas; 1.000.000 / 3 → 333.333, 333.333, 333.334; meses = 1 → una cuota por el total; `monthly` devuelve siempre `installmentMinor`; invariante: la suma de `installmentAmount` sobre todos los periodos = `debtTotalMinor`
- [x] T004 Implementar en `packages/core/src/debts/debt.ts` el tipo `DebtKind = "monthly" | "deferred"`, `deferredInstallmentMinor(totalMinor, months)` (`Math.floor`), `installmentAmount(debt, period)` (la última cuota diferida es `totalMinor − base × (n − 1)`) y `debtTotalMinor(debt)`; ampliar `DebtSchedule` con `kind` y `totalMinor` opcionales (ausente = `monthly`); exportarlos desde `packages/core/src/debts/index.ts`
- [x] T005 [P] Agregar a `packages/db/schema/debts.ts` la columna `kind` (`varchar("kind", { length: 10 }).notNull().default("monthly")`) y `totalMinor` (`bigint("total_minor", { mode: "number" })`, nullable), con checks: `kind IN ('monthly','deferred')`, `(kind = 'deferred') = (total_minor IS NOT NULL)` y `total_minor IS NULL OR total_minor >= total_installments`
- [x] T006 Generar la migración con `pnpm --filter @finance-app/db generate` (queda `packages/db/migrations/0010_*.sql` más snapshot y `_journal.json`); verificar que es aditiva (`ADD COLUMN ... DEFAULT 'monthly'`) y que las filas existentes quedan `monthly` con `total_minor` nulo
- [x] T007 Actualizar `debtProgress` en `packages/core/src/debts/debt.ts`: `paidMinor` y `remainingMinor` = suma de `installmentAmount` de los periodos pagados / pendientes (no `conteo × cuota`); pruebas en `packages/core/tests/debts/debt.test.ts`: `monthly` da los mismos resultados que antes (casos existentes sin cambio) y una diferida 1.000.000 / 3 con la primera y la última pagadas da `paidMinor` 666.667 y `remainingMinor` 333.333
- [x] T008 [P] Agregar a `apps/web/messages/es/validation.json` y `apps/web/messages/en/validation.json` los códigos `totalAmountPositive`, `invalidMonths`, `totalTooSmall` y `paidInstallmentsLocked` (ver [contracts/debt-input.md](./contracts/debt-input.md)); verificar que existe la prueba que compara claves es/en y que pasa

**Checkpoint**: `pnpm --filter @finance-app/core test` en verde y la migración `0010` aplica sobre una base con deudas existentes.

## Phase 3: User Story 1 — Registrar una deuda diferida (P1) 🎯 MVP

**Goal**: crear una deuda con valor total + meses, ver la cuota calculada antes de guardar, y verla en la lista.

**Independent Test**: crear una diferida de 1.200.000 COP a 12 meses desde enero: resumen muestra cuota 100.000, queda con 12 cuotas y pendiente 1.200.000.

- [x] T009 [P] [US1] Pruebas de `validateDebtInput` en `packages/core/tests/debts/debt.test.ts` para `kind: "deferred"`: válido; `totalMinor` 0, negativo, decimal o texto → `totalAmountPositive`; `months` 0, 121 o decimal → `invalidMonths` / `tooManyInstallments`; `totalMinor` < `months` → `totalTooSmall`; `alreadyPaid` > `months` → `paidExceedsTotal`; entrada sin `kind` se valida como `monthly` (casos existentes siguen pasando); el valor resultante trae `kind`, `totalMinor`, `installmentMinor = floor(total / months)` y `totalInstallments = months`
- [x] T010 [US1] Convertir `DebtInput` en unión discriminada por `kind` y extender `validateDebtInput` en `packages/core/src/debts/debt.ts` según la tabla de validación de [data-model.md](./data-model.md) ("`totalMinor` entero seguro > 0", "`months` entero 1..120, `floor(totalMinor / months) ≥ 1`", "`alreadyPaid` 0..months", `note` ≤ 140); agregar `kind`, `totalMinor` y `months` a `DebtInputErrors`
- [x] T011 [P] [US1] Pruebas PGlite en `packages/db/tests/debt-repository.test.ts`: `create` diferida persiste `kind`, `totalMinor`, `installmentMinor` (floor) y `totalInstallments`; con `alreadyPaid` = 2 crea los gastos de las dos primeras cuotas con su monto; `list` devuelve `kind` y `totalMinor`; una deuda `monthly` creada igual que antes se lista con `kind: "monthly"` y `totalMinor: null`
- [x] T012 [US1] Actualizar `packages/db/src/debt-repository.ts`: `DebtWithProgress` gana `kind` y `totalMinor`; `list` los selecciona; `create` guarda `kind`/`totalMinor`; `payPeriods` usa `installmentAmount(debt, period)` como `amountMinor` de cada gasto (en lugar de `debt.installmentMinor`); exportar los tipos en `packages/db/src/index.ts` si hace falta
- [x] T013 [US1] Actualizar `packages/db/src/seed-dashboard-cli.ts` a la nueva forma de `DebtInput` (añadir `kind: "monthly"` y `endPeriod` si el tipo lo exige) para que compile
- [x] T014 [US1] Pasar `kind` y `totalMinor` desde `apps/web/app/(app)/debts/page.tsx` a `DebtItem` y ampliar `DebtItem` en `apps/web/app/(app)/debts/debt-form-dialog.tsx` con `kind` y `totalMinor`
- [x] T015 [P] [US1] Agregar textos es/en en `apps/web/messages/es/debts.json` y `apps/web/messages/en/debts.json`: `kindLabel`, `kindMonthly`, `kindDeferred`, `totalAmount`, `monthsCount`, `summaryDeferred` (cuota, última cuota si difiere y mes final), `summaryDeferredHint`
- [x] T016 [US1] Reescribir el formulario en `apps/web/app/(app)/debts/debt-form-dialog.tsx` al crear: control segmentado de tipo (por defecto "Cuota mensual"); para `deferred` mostrar valor total, meses y primer mes (sin "último pago"), con resumen en vivo "N cuotas de X, la última de Y, termina en M" calculado con `deferredInstallmentMinor`/`installmentAmount` de core; enviar `kind`, `totalMinor`, `months`; mostrar errores por campo
- [x] T017 [US1] Actualizar `createDebt` en `apps/web/app/(app)/debts/actions.ts` si el nuevo `DebtInput` lo requiere (la validación ya corre en core) y confirmar que los errores de `totalMinor`/`months` llegan al formulario
- [x] T018 [US1] En `apps/web/app/(app)/debts/debts-view.tsx`: etiqueta de tipo en cada tarjeta y, en diferidas, línea "Total diferido" con `formatCop(totalMinor)`; la columna de cuota muestra la cuota base
- [x] T019 [US1] Prueba e2e en `apps/web/tests/e2e/debts.spec.ts`: crear diferida 1.200.000 / 12 meses, verificar cuota 100.000 en el resumen, etiqueta de tipo y que `debts-remaining` incluye 1.200.000

**Checkpoint**: se puede crear y ver una deuda diferida; las deudas por cuota se crean igual que antes.

## Phase 4: User Story 2 — Pagar cuotas de ambos tipos igual (P1)

**Goal**: marcar cuotas crea el gasto con el monto real; pendiente y estado cuadran con el total.

**Independent Test**: diferida 1.000.000 / 3: marcar primera y última → gastos 333.333 y 333.334; pagar todas → suma 1.000.000 y estado "pagada".

- [x] T020 [P] [US2] Pruebas PGlite en `packages/db/tests/debt-repository.test.ts`: `markPaid` de la última cuota diferida crea un gasto de 333.334; `markPaidUpTo` crea los tres con sus montos; la suma de gastos de la deuda = `totalMinor`; marcar dos veces no duplica; `unmarkPaid` elimina el gasto; una deuda `monthly` sigue creando gastos por `installmentMinor`
- [x] T021 [US2] Verificar en `packages/db/src/debt-repository.ts` que `markPaid` y `markPaidUpTo` pasan por `payPeriods` con el monto por cuota (T012) y que refrescar un gasto existente no cambia su `amountMinor`; ajustar solo si alguna prueba de T020 falla
- [x] T022 [US2] En `apps/web/app/(app)/debts/debts-view.tsx` calcular `monthlyTotal` con `installmentAmount(debt, nowPeriod)` para las deudas en curso cuyo calendario incluye el mes actual (en lugar de sumar `installmentMinor`); confirmar que `remainingTotal` ya usa `progress.remainingMinor`
- [x] T023 [US2] Prueba e2e en `apps/web/tests/e2e/debts.spec.ts`: diferida 1.000.000 / 3, marcar cuotas y comprobar que el pendiente baja por los montos reales y que la deuda pasa a "pagada" al completar; comprobar que una deuda por cuota existente conserva sus montos (FR-012)

**Checkpoint**: ambos tipos se pagan y se resumen con montos reales.

## Phase 5: User Story 3 — Editar y distinguir el tipo (P2)

**Goal**: editar con los campos de cada tipo; diferida con pagos queda bloqueada en total y meses.

**Independent Test**: editar el total de una diferida sin pagos recalcula la cuota; con una cuota pagada se rechaza hasta desmarcarla.

- [x] T024 [P] [US3] Pruebas PGlite en `packages/db/tests/debt-repository.test.ts`: `update` de diferida sin pagos recalcula `installmentMinor` y `totalMinor`; con ≥ 1 cuota pagada y cambio de `totalMinor` o `totalInstallments` lanza `DebtLockedError` (código `paidInstallmentsLocked`); con pagos, cambiar nombre, categoría o nota funciona; `update` no cambia `kind`; `monthly` mantiene `DebtRangeError`
- [x] T025 [US3] En `packages/db/src/debt-repository.ts` agregar `DebtLockedError` (`code = "paidInstallmentsLocked"`), exportarlo en `packages/db/src/index.ts`, e implementar en `update`: ignorar cualquier `kind` entrante y usar el de la fila; para `deferred` con gastos registrados rechazar cambios de `totalMinor`/`totalInstallments`; el rango del primer mes sigue validado con `DebtRangeError`
- [x] T026 [US3] En `apps/web/app/(app)/debts/actions.ts` mapear `DebtLockedError` a `{ errors: { totalMinor: validationError(error.code) } }` en `toActionError`; en `updateDebt` pasar el `kind` de la deuda existente (el cliente no puede cambiarlo)
- [x] T027 [US3] En `apps/web/app/(app)/debts/debt-form-dialog.tsx` al editar: ocultar el selector de tipo, mostrar los campos del tipo de la deuda precargados (`totalMinor`, meses = `totalInstallments`) y deshabilitar total y meses cuando la deuda tiene cuotas pagadas con una nota explicativa (texto es/en en `debts.json`)
- [x] T028 [US3] Prueba e2e en `apps/web/tests/e2e/debts.spec.ts`: editar diferida sin pagos (cuota recalculada), con un pago (campos bloqueados) y una deuda por cuota (sin selector de tipo, flujo actual)

**Checkpoint**: la edición respeta las reglas de cada tipo.

## Phase 6: User Story 4 — Dashboard coherente (P3)

**Goal**: el home usa los montos reales de cada cuota.

**Independent Test**: con una diferida activa, cuota del mes y pendiente coinciden entre Deudas y el dashboard.

- [x] T029 [P] [US4] Pruebas en `packages/core/tests/dashboard/debts.test.ts`: `debtsOverview` con una diferida 1.000.000 / 3 devuelve `monthlyMinor` 333.334 en el mes de la última cuota y 333.333 en las demás; las deudas `monthly` existentes dan lo mismo que antes
- [x] T030 [US4] En `packages/core/src/dashboard/debts.ts` ampliar `DashboardDebt` con `kind` y `totalMinor` opcionales y calcular `monthlyMinor` con `installmentAmount(debt, period)` cuando el periodo cae en el calendario
- [x] T031 [US4] Pasar `kind` y `totalMinor` desde la carga de deudas en `apps/web/app/(app)/_dashboard/load.ts` a `debtsOverview`; revisar `apps/web/app/(app)/_dashboard/debts-card.tsx` por cualquier cálculo `cuota × cantidad`
- [x] T032 [US4] Prueba e2e en `apps/web/tests/e2e/home-dashboard.spec.ts`: con una diferida activa, el compromiso del mes y el pendiente del dashboard coinciden con Deudas

**Checkpoint**: todas las historias funcionan de forma independiente.

## Phase 7: Polish & Cross-Cutting

- [x] T033 [P] Revisar que `apps/web/messages/es/*.json` y `en/*.json` tienen las mismas claves y que no hay textos sin traducir en las pantallas tocadas (FR-014)
- [x] T034 [P] Actualizar `specs/006-deudas/spec.md` con una nota que apunta a `specs/013-deuda-diferida/spec.md` (la spec 006 queda como historia del tipo cuota mensual)
- [x] T035 Ejecutar `pnpm --filter @finance-app/core test`, `pnpm --filter @finance-app/db test`, `pnpm --filter web test:e2e`, lint y typecheck del monorepo; todo en verde
- [ ] T036 Recorrer los escenarios manuales de [quickstart.md](./quickstart.md) en español e inglés

## Dependencies & Execution Order

- Setup (T001–T002) → Foundational (T003–T008) → historias.
- Foundational: T003→T004 y T005→T006 son pares independientes (paralelos entre sí); T007 depende de T004; T008 es independiente.
- US1 (T009–T019) es el MVP y bloquea a US2 y US3 en el código compartido de repositorio y formulario (T012, T016).
- US2 (T020–T023) y US3 (T024–T028) pueden hacerse en cualquier orden tras US1, pero tocan los mismos archivos (`debt-repository.ts`, `debts-view.tsx`, `debt-form-dialog.tsx`): no en paralelo entre sí.
- US4 (T029–T032) solo depende de Foundational (T004) y puede hacerse en paralelo con US1–US3.
- Polish al final.

## Parallel Opportunities

- Foundational: T003, T005 y T008 a la vez.
- US1: T009, T011 y T015 a la vez (archivos distintos).
- US4 completa en paralelo con cualquier otra historia.

## Implementation Strategy

- **MVP**: Phase 1–3 (US1) + la parte de pago de US2 que ya queda cubierta por T012; entrega crear y ver una diferida.
- **Incremental**: US2 (pagos y pendientes exactos) → US3 (edición) → US4 (dashboard) → Polish.
- Cada fase termina con sus pruebas en verde antes de pasar a la siguiente; commits por fase.
