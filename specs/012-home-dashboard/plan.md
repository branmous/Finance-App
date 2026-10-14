# Implementation Plan: Home dashboard del mes cerrado

**Branch**: `feature/012-home-dashboard` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-home-dashboard/spec.md`

## Summary

Reemplazar el home actual por un tablero de una sola página que compara el último mes cerrado contra el anterior: flujo (ingresos, gastos, queda, tasa de ahorro), gasto por categoría con variaciones, compromisos, deudas, tendencia de 6 meses, franja de viajes aparte, alertas y aviso de mes sin cargar. Los gastos de viaje **nunca** se suman a los totales mensuales. No hay cambios de esquema ni migración.

Enfoque técnico (ver [research.md](./research.md)):
- `packages/core`: módulo nuevo `dashboard/` con funciones puras (comparaciones, tasa de ahorro, unión de categorías, compromiso, tendencia, deudas, viajes, alertas). Las alertas devuelven códigos y parámetros, nunca texto.
- `packages/db`: tres consultas agregadas nuevas (`categoryTotalsByPeriod`, `totalsByPeriodRange` en gastos e ingresos) y `countPendingByPeriod`. Todas con `userId` y solo gastos de primer nivel.
- `apps/web`: `page.tsx` de servidor que lee `?period=`, hace una carga paralela y compone componentes de `_dashboard/`; gráficos propios en SVG/CSS; solo la franja de viajes es componente cliente (fases dependen de la fecha del navegador).

## Technical Context

**Language/Version**: TypeScript strict (Node 20+), Next.js 14 App Router

**Primary Dependencies**: Drizzle ORM + `postgres`, next-intl 3, next-auth 4. Sin librerías nuevas.

**Storage**: PostgreSQL; tablas existentes `expenses`, `incomes`, `categories`, `debts`, `trips*`. Sin migración.

**Testing**: Vitest (core, web unit), PGlite (db), Playwright (e2e)

**Target Platform**: Web (Vercel); CI con Docker Compose

**Project Type**: Monorepo web (`apps/web`, `packages/core`, `packages/db`)

**Performance Goals**: home completo < 1 s en servidor con 12 meses y 100 categorías (SC-003); 5 consultas agregadas + listas de deudas y viajes en paralelo

**Constraints**: dinero en enteros COP; solo datos del usuario autenticado; es/en; accesibilidad de gráficos; viajes fuera de totales mensuales

**Scale/Scope**: un usuario real, ≤ 100 categorías, ≤ 24 meses de datos relevantes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento |
|-----------|--------------|
| I. TypeScript estricto | Todo el código nuevo en TS strict, sin `any`. ✅ |
| II. Núcleo aislado | Cálculos y reglas de alertas en `packages/core/dashboard`, sin Next ni ORM; los repositorios solo agregan datos. ✅ |
| III. Dinero como enteros | Todo en `amountMinor` enteros; los porcentajes son derivados de solo lectura y se redondean a un decimal al presentar. ✅ |
| IV. Pruebas obligatorias | Vitest en core (incluye umbrales de cada alerta), PGlite en db, e2e Playwright del home. ✅ |
| V. Plantilla vs ocurrencia | Los reportes salen de gastos ejecutados (`expenses`) y no de plantillas; las cuotas de deuda se leen de su progreso y ya son gastos. ✅ |
| VI. Código en inglés | Identificadores y archivos en inglés; specs en español. ✅ |
| Multiusuario | Sin tablas nuevas; toda consulta nueva filtra por `userId`. ✅ |
| Rama `feature/NNN-nombre` | `feature/012-home-dashboard` = `specs/012-home-dashboard`. ✅ |
| Fuera del MVP: "gráficos avanzados" | Se usan barras y una serie temporal simples dibujadas con SVG/CSS, sin librería ni interacción compleja; se trata como visualización básica del resumen y se deja constancia aquí. ✅ |
| Fuera del MVP: presupuestos/metas | No se introducen; las alertas usan variaciones y márgenes calculados, no metas. ✅ |

Re-evaluación tras el diseño: sin cambios; sin violaciones.

## Project Structure

### Documentation (this feature)

```text
specs/012-home-dashboard/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── dashboard.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/core/
├── src/dashboard/
│   ├── compare.ts        # compareAmounts, savingsRate
│   ├── categories.ts     # mergeCategoryTotals, topWithRest, commitment
│   ├── trend.ts          # trendPeriods, buildTrend
│   ├── debts.ts          # debtsOverview
│   ├── trips.ts          # perPersonMinor, tripYearSpan
│   ├── alerts.ts         # buildAlerts + thresholds
│   └── index.ts          # subpath "@finance-app/core/dashboard"
├── package.json          # + "./dashboard" export
└── tests/dashboard/*.test.ts

packages/db/
├── src/expense-repository.ts  # + categoryTotalsByPeriod, totalsByPeriodRange, countPendingByPeriod
├── src/income-repository.ts   # + totalsByPeriodRange
├── src/index.ts               # export new types
└── tests/expense-repository.test.ts, income-repository.test.ts

apps/web/
├── app/(app)/page.tsx            # new dashboard
├── app/(app)/loading.tsx         # new skeleton
├── app/(app)/_dashboard/         # period-selector, flow-summary, category-compare,
│                                 # commitments, debts-card, trend-chart, trips-strip,
│                                 # alerts-panel, capture-banner
├── messages/{en,es}/dashboard.json
└── tests/e2e/home-dashboard.spec.ts
```

**Structure Decision**: se extiende core → db → web sin paquetes nuevos. Los componentes de presentación son de servidor salvo `trips-strip`, que necesita la fecha del navegador.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Ninguna | — | — |
