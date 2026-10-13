# Tasks: Home dashboard del mes cerrado

**Input**: Design documents from `/specs/012-home-dashboard/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: obligatorias (Constitución IV): Vitest en core, PGlite en db, Playwright para el flujo.

**Convención**: `[P]` = paralelizable; `[USn]` = historia del spec. Código, nombres y commits en inglés (el historial usa español en commits; se mantiene).

## Phase 1: Setup

- [ ] T001 Confirmar rama `feature/012-home-dashboard` desde `main` y que `.specify/feature.json` apunta a `specs/012-home-dashboard`
- [ ] T002 [P] Verificar entorno: `pnpm install`, PostgreSQL local y que las pruebas de core, db y web pasan antes de empezar

## Phase 2: Foundational (bloquea todas las historias)

- [ ] T003 [P] Pruebas de `compareAmounts` y `savingsRate` en `packages/core/tests/dashboard/compare.test.ts` (previo 0, ingresos 0, negativos, redondeo a un decimal)
- [ ] T004 Implementar `packages/core/src/dashboard/compare.ts`
- [ ] T005 [P] Pruebas de `mergeCategoryTotals`, `topWithRest` y `commitment` en `packages/core/tests/dashboard/categories.test.ts` (nueva, desaparecida, orden y desempates, resto agrupado, sin ingresos)
- [ ] T006 Implementar `packages/core/src/dashboard/categories.ts`
- [ ] T007 Crear `packages/core/src/dashboard/index.ts` y añadir la exportación `"./dashboard"` en `packages/core/package.json`
- [ ] T008 [P] Pruebas PGlite de `categoryTotalsByPeriod`, `totalsByPeriodRange` y `countPendingByPeriod` en `packages/db/tests/expense-repository.test.ts` (ignora hijos, aislamiento entre usuarios, rango inclusivo, solo períodos con datos)
- [ ] T009 Implementar los tres métodos en `packages/db/src/expense-repository.ts` y exportar tipos en `packages/db/src/index.ts`
- [ ] T010 [P] Prueba y método `totalsByPeriodRange` en `packages/db/tests/income-repository.test.ts` y `packages/db/src/income-repository.ts`

**Checkpoint**: `pnpm --filter @finance-app/core test` y `pnpm --filter @finance-app/db test` en verde.

## Phase 3: User Story 1 — Flujo del mes (P1) 🎯 MVP

**Independent Test**: el home muestra septiembre contra agosto con ingresos, gastos, queda, tasa de ahorro y variaciones.

- [ ] T011 [US1] Reescribir `apps/web/messages/{es,en}/dashboard.json` con las claves de flujo, selector y estados vacíos (quitar `pending.*`)
- [ ] T012 [US1] Crear `apps/web/app/(app)/_dashboard/period-selector.tsx` (enlaces a `/?period=`, anterior/siguiente, tope en mes actual)
- [ ] T013 [US1] Crear `apps/web/app/(app)/_dashboard/flow-summary.tsx` (ingresos, gastos, queda, tasa de ahorro, deltas, estados no disponibles; reutiliza `computeBalance`)
- [ ] T014 [US1] Reescribir `apps/web/app/(app)/page.tsx`: parsear `searchParams.period` (por defecto mes anterior, tope mes actual, inválido → defecto), carga en paralelo y composición del hero con `Guilloche`
- [ ] T015 [US1] Actualizar `apps/web/app/(app)/loading.tsx` a la nueva forma

**Checkpoint**: el home muestra el flujo correcto; viajes no influyen.

## Phase 4: User Story 2 — Dónde se fue el dinero (P1)

- [ ] T016 [US2] Crear `apps/web/app/(app)/_dashboard/category-compare.tsx` (barras CSS con color de categoría, monto actual/anterior, variación, "Otras", enlace a la lista, estado vacío, `aria-label`)
- [ ] T017 [US2] Añadir las claves de categorías a `dashboard.json` (es/en) e integrarlo en `page.tsx`

## Phase 5: User Story 3 — Compromisos y deudas (P2)

- [ ] T018 [P] [US3] Pruebas de `debtsOverview` en `packages/core/tests/dashboard/debts.test.ts` (activas en el período, saldadas, vencidas, fin máximo, sin deudas)
- [ ] T019 [US3] Implementar `packages/core/src/dashboard/debts.ts`
- [ ] T020 [US3] Crear `_dashboard/commitments.tsx` y `_dashboard/debts-card.tsx`; claves es/en; integrar en `page.tsx`

## Phase 6: User Story 4 — Tendencia de seis meses (P2)

- [ ] T021 [P] [US4] Pruebas de `trendPeriods` y `buildTrend` en `packages/core/tests/dashboard/trend.test.ts` (cruce de año, ceros en meses sin datos)
- [ ] T022 [US4] Implementar `packages/core/src/dashboard/trend.ts`
- [ ] T023 [US4] Crear `_dashboard/trend-chart.tsx` (SVG, `role="img"`, `aria-label` con valores, doble codificación no solo color, sin animación con movimiento reducido); claves es/en; integrar

## Phase 7: User Story 5 — Viajes aparte (P2)

- [ ] T024 [P] [US5] Pruebas de `perPersonMinor` y `tripYearSpan` en `packages/core/tests/dashboard/trips.test.ts` (cero participantes, viaje que cruza el año, sin fechas)
- [ ] T025 [US5] Implementar `packages/core/src/dashboard/trips.ts`
- [ ] T026 [US5] Crear `_dashboard/trips-strip.tsx` (cliente: `useToday`, `computeTripSchedule`, `TripPhaseBadge`; línea de tiempo del año, costo total y por persona, marca sin saldar, estado vacío); claves es/en; integrar
- [ ] T027 [US5] Verificar que ninguna consulta ni suma del home incluye gastos de viaje (revisión de `page.tsx` + e2e)

## Phase 8: User Story 6 — Alertas (P2)

- [ ] T028 [P] [US6] Pruebas de `buildAlerts` en `packages/core/tests/dashboard/alerts.test.ts`: cada umbral justo debajo y justo en el límite, orden por severidad, tope de 4, sin alertas
- [ ] T029 [US6] Implementar `packages/core/src/dashboard/alerts.ts`
- [ ] T030 [US6] Crear `_dashboard/alerts-panel.tsx`; claves `dashboard.alerts.<code>` es/en con los mismos placeholders; integrar

## Phase 9: User Story 7 — Aviso de mes sin cargar (P3)

- [ ] T031 [US7] Crear `_dashboard/capture-banner.tsx` (visible si el mes anterior al actual no tiene gastos; enlaza a `/monthly-expenses?period=`); claves es/en; integrar

## Phase 10: E2E y pulido

- [ ] T032 Crear `apps/web/tests/e2e/home-dashboard.spec.ts` (patrón de `bulk-import.spec.ts`): datos de dos meses con `?period=`, flujo y deltas, viaje que no suma, selector, período inválido, estado vacío, aviso de captura, cambio de idioma
- [ ] T033 [P] Revisar accesibilidad (`aria-label`, contraste, foco del selector) y responsive en 360 px
- [ ] T034 Correr `pnpm lint`, `pnpm build`, todas las pruebas y el escenario de [quickstart.md](./quickstart.md)
- [ ] T035 Preparar la integración (commit en la rama; el PR solo si la persona usuaria lo pide)

## Dependencies & Execution Order

- Phase 2 bloquea todo. US1 y US2 (P1) primero; US3–US6 pueden ir en paralelo tras ellas; US7 al final; Phase 10 cierra.
- Dentro de cada historia: pruebas antes de implementación (TDD).

## Implementation Strategy

MVP = Phases 1–4 (flujo + categorías). Cada historia agrega una tarjeta al home sin romper las anteriores; el home siempre queda desplegable.
