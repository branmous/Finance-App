# Implementation Plan: Deuda diferida (dos tipos de deuda)

**Branch**: `feature/013-deuda-diferida` | **Date**: 2026-10-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-deuda-diferida/spec.md`

## Summary

El módulo de deudas hoy solo conoce la deuda por cuota mensual. Se agrega un segundo tipo, "total diferido": la persona ingresa valor total y número de meses, y el sistema deriva la cuota (`floor(total / meses)`) con la última cuota absorbiendo el resto, de modo que la suma sea exactamente el total. Ambos tipos comparten calendario, pago de cuotas, avance y dashboard.

Enfoque técnico (ver [research.md](./research.md)):
- `packages/core/debts`: `kind` ("monthly" | "deferred"), validación por tipo, y una función `installmentAmount(debt, period)` que es la única fuente del monto de una cuota. `debtProgress` y `debtsOverview` dejan de multiplicar `cuota × cantidad` y suman montos reales.
- `packages/db`: migración `0010` que agrega `kind` (default `monthly`) y `total_minor` (nullable) a `debts`; las filas existentes quedan como `monthly` sin tocar datos. El repositorio crea el gasto de cada cuota con su monto real.
- `apps/web`: el formulario crea con un selector de tipo; la lista muestra etiqueta de tipo y total diferido; textos es/en.

## Technical Context

**Language/Version**: TypeScript strict (Node 20+), Next.js 14 App Router

**Primary Dependencies**: Drizzle ORM + `postgres`, next-intl 3, next-auth 4. Sin librerías nuevas.

**Storage**: PostgreSQL; tabla `debts` con dos columnas nuevas. `expenses` sin cambios.

**Testing**: Vitest (core), PGlite (db), Playwright (e2e `debts.spec.ts` ampliado)

**Target Platform**: Web (Vercel); CI con Docker Compose

**Project Type**: Monorepo web (`apps/web`, `packages/core`, `packages/db`)

**Performance Goals**: sin impacto; el cálculo por cuota es O(cuotas ≤ 120)

**Constraints**: dinero en enteros COP; los datos existentes no cambian de valor; es/en; solo datos del usuario autenticado

**Scale/Scope**: un usuario real, decenas de deudas, ≤ 120 cuotas por deuda

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento |
|-----------|--------------|
| I. TypeScript estricto | Unión discriminada por `kind`, sin `any`. ✅ |
| II. Núcleo aislado | Reglas de reparto y validación en `packages/core/debts`; db y web solo las consumen. ✅ |
| III. Dinero como enteros | Total, cuota y resto son enteros; la división usa `Math.floor` y el resto va a la última cuota, nunca decimales. ✅ |
| IV. Pruebas obligatorias | Vitest para reparto, validación, progreso y dashboard; PGlite para repositorio y migración; e2e del flujo diferido. ✅ |
| V. Plantilla vs ocurrencia | La deuda sigue siendo plantilla y la cuota pagada un gasto con `debt_id` + `period`; el gasto toma el monto de esa cuota. Editar una plantilla con pagos registrados no reescribe el historial (total y meses se bloquean). ✅ |
| VI. Código en inglés | Identificadores en inglés (`kind`, `totalMinor`, `installmentAmount`); specs en español. ✅ |
| Multiusuario | Sin tablas nuevas; `debts` ya tiene `user_id`. ✅ |
| Rama `feature/NNN-nombre` | `feature/013-deuda-diferida` = `specs/013-deuda-diferida`. ✅ |
| Fuera del MVP | Sin intereses ni amortización. ✅ |

Re-evaluación tras el diseño: sin cambios; sin violaciones.

## Project Structure

### Documentation (this feature)

```text
specs/013-deuda-diferida/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── debt-input.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks (no lo crea este comando)
```

### Source Code (repository root)

```text
packages/core/
├── src/debts/debt.ts            # kind, validación por tipo, installmentAmount, debtProgress
├── src/dashboard/debts.ts       # monthlyMinor con monto real de la cuota
└── tests/{debts,dashboard}/     # casos de reparto, validación, progreso

packages/db/
├── schema/debts.ts              # + kind, total_minor, checks
├── migrations/0010_*.sql        # generada con drizzle-kit
├── src/debt-repository.ts       # monto por cuota, bloqueo de edición, tipo en list/create
├── src/seed-dashboard-cli.ts    # ajustar a la nueva forma de DebtInput
└── tests/debt-repository.test.ts

apps/web/
├── app/(app)/debts/{page,debts-view,debt-form-dialog,actions}.ts(x)
├── app/(app)/_dashboard/load.ts # pasar kind/totalMinor a debtsOverview
├── messages/{es,en}/{debts,validation}.json
└── tests/e2e/debts.spec.ts
```

**Structure Decision**: se extiende el módulo `debts` existente en sus tres paquetes; no se crean módulos nuevos.

## Complexity Tracking

Sin violaciones que justificar.
