# Implementation Plan: Cimientos del Proyecto

**Branch**: `feature/001-cimientos` | **Date**: 2026-09-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-cimientos/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Levantar el esqueleto técnico del proyecto: un monorepo con `apps/web` (Next.js), `packages/core`
(dominio aislado) y `packages/db` (esquema y migraciones), con TypeScript estricto, lint, tests y
CI reproducible vía Docker, más una base de datos PostgreSQL con la migración inicial aplicada y
un despliegue público en Vercel protegido por login restringido a un único correo. No se
implementa ninguna funcionalidad de negocio (categorías, gastos, reportes); el resultado es una
página de bienvenida autenticada sobre una base verificable de punta a punta.

## Technical Context

**Language/Version**: TypeScript 5.x en modo `strict`, en todo el stack (Node.js LTS para
`apps/web` y `packages/*`).

**Primary Dependencies**: Next.js (App Router) + React para `apps/web`; Tailwind CSS + shadcn/ui
para estilos; Drizzle ORM para `packages/db`; Zod para validación; Auth.js (o Supabase Auth) para
el login restringido a un correo; pnpm workspaces + Turborepo para orquestar el monorepo.

**Storage**: PostgreSQL (Supabase o Neon, plan gratuito), accedido únicamente a través de
`packages/db` mediante Drizzle ORM y sus migraciones versionadas.

**Testing**: Vitest para pruebas unitarias de `packages/core`; Playwright para la prueba
end-to-end del flujo de login descrito en la User Story 1 del spec.

**Target Platform**: Aplicación web desplegada en Vercel, accesible desde cualquier navegador
moderno (sin requisito de soporte offline en este spec).

**Project Type**: Monorepo web (pnpm workspaces + Turborepo) con un solo proyecto web y paquetes
de librería compartidos — no aplica "mobile" ni "multi-backend" en este spec.

**Performance Goals**: No hay metas de performance específicas en este spec (no hay lógica de
negocio); basta con que la página de bienvenida cargue de forma normal para una app Next.js en
Vercel.

**Constraints**: El acceso completo DEBE quedar bloqueado detrás de autenticación restringida a
un único correo (FR-009, FR-010); el pipeline de CI DEBE poder ejecutarse vía Docker/Docker
Compose según la constitución.

**Scale/Scope**: Un único usuario real; sin necesidad de soportar múltiples tenants activos en
este spec (aunque el modelo de datos ya incluye `user_id` por principio de la constitución).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio / Regla | Aplica a este spec | Cumplimiento planeado |
|---|---|---|
| I. TypeScript Estricto en Todo el Stack | Sí | `tsconfig.json` base con `strict: true` compartido por `apps/web`, `packages/core`, `packages/db`; CI falla si hay errores de tipos. |
| II. Núcleo de Dominio Aislado (`packages/core`) | Parcial (sin dominio de negocio aún) | `packages/core` se crea vacío salvo un ejemplo mínimo probado (p. ej. una función pura), sin importar Next.js ni Drizzle, dejando el límite arquitectónico listo para specs futuros. |
| III. Dinero como Enteros | No aplica todavía | No hay montos en este spec; se deja como regla para specs de negocio futuros (categorías, gastos). |
| IV. Pruebas Obligatorias en el Dominio | Sí | `packages/core` incluye al menos una prueba Vitest desde el día uno; el flujo de login (User Story 1) se cubre con una prueba Playwright. |
| V. Separación Plantilla/Ocurrencia | No aplica todavía | Se introduce en el spec de gastos fijos; no hay plantillas ni ocurrencias en cimientos. |
| VI. Código en Inglés | Sí | Todo identificador, archivo, tabla/columna y mensaje de commit del código de este spec se escribe en inglés; los documentos de `specs/` permanecen en español. |
| Modelo de Datos y Multiusuario | Sí | La migración inicial de `packages/db` no crea tablas de negocio, pero el helper de esquema compartido ya incluye las columnas comunes (`id`, `user_id`, `created_at`, `updated_at`) listas para reutilizarse en specs futuros; login restringido a un correo autorizado por variable de entorno. |
| Flujo SDD (branching `feature/NNN-nombre`) | Sí | Este plan se ejecuta en `feature/001-cimientos`, ya creada desde `main`. |
| CI/CD y Entornos Reproducibles (Docker/Compose) | Sí | Se añade `docker-compose.yml` con el servicio de PostgreSQL de desarrollo/pruebas y un workflow de GitHub Actions que usa `docker compose` para correr lint, Vitest y Playwright antes de cualquier despliegue. |

No se identifican violaciones que requieran justificación en `Complexity Tracking`.

## Project Structure

### Documentation (this feature)

```text
specs/001-cimientos/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
finance-app/
├── apps/
│   └── web/                     # Next.js (App Router): login, layout, welcome page
│       ├── app/
│       │   ├── (auth)/
│       │   │   └── login/
│       │   └── page.tsx         # welcome page (post-login)
│       ├── middleware.ts        # enforces auth on every route
│       └── tests/
│           └── e2e/
│               └── login.spec.ts
├── packages/
│   ├── core/                    # domain logic, framework-agnostic
│   │   ├── src/
│   │   │   └── index.ts         # minimal example unit, no business rules yet
│   │   └── tests/
│   │       └── index.test.ts
│   └── db/                      # schema + Drizzle migrations
│       ├── schema/
│       │   └── shared-columns.ts  # id, user_id, created_at, updated_at helpers
│       ├── migrations/
│       │   └── 0000_init.sql
│       └── drizzle.config.ts
├── docker-compose.yml            # local + CI Postgres service
├── .github/
│   └── workflows/
│       └── ci.yml                # docker compose based lint/test pipeline
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
└── .specify/, specs/             # already present (Spec Kit + this spec)
```

**Structure Decision**: Monorepo con pnpm workspaces + Turborepo, tres paquetes
(`apps/web`, `packages/core`, `packages/db`) tal como exige la constitución del proyecto
(monolito modular). No se usa el layout genérico `src/`/`backend`/`frontend` del template: se
sigue el layout específico ya decidido en `guia-app-finance.md`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Ninguna violación detectada; tabla omitida.
