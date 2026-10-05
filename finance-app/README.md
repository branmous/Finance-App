# Finance App

Personal finance app: monolito modular (Next.js + PostgreSQL) desarrollado con Spec-Driven
Development. Ver [`guia-app-finance.md`](../guia-app-finance.md) y
[`.specify/memory/constitution.md`](.specify/memory/constitution.md) para el contexto completo,
y [`specs/`](specs/) para cada funcionalidad.

## Estructura

```text
apps/web/       # Next.js App Router: UI, Server Actions, auth
packages/core/   # Lógica de dominio, sin dependencias de Next.js ni de la base de datos
packages/db/     # Esquema y migraciones (Drizzle ORM)
```

## Requisitos

- Node.js 20+
- pnpm (`corepack enable pnpm` o `npm i -g pnpm`)
- Docker + Docker Compose (para Postgres local y para correr el pipeline de CI igual que en
  GitHub Actions)

## Comandos

```sh
pnpm install              # instala dependencias de todo el monorepo
pnpm build                # build de apps/web, packages/core y packages/db (Turborepo)
pnpm lint                 # lint de todo el monorepo
pnpm test                 # pruebas de todo el monorepo (Vitest en packages/core)
pnpm --filter @finance-app/web dev   # levanta apps/web en modo desarrollo
```

Para correr el mismo pipeline que usa CI, dentro de Docker:

```sh
docker compose up -d postgres
docker compose run --rm app
```

## Base de datos

```sh
docker compose up -d postgres
pnpm --filter @finance-app/db migrate
```

Ver [`packages/db`](packages/db) para el esquema y las migraciones, y
[`specs/001-cimientos/data-model.md`](specs/001-cimientos/data-model.md) para las columnas
compartidas que toda tabla de dominio debe incluir.

## Desarrollo guiado por specs (SDD)

Cada funcionalidad vive en `specs/NNN-nombre/` y se trabaja en su propia rama
`feature/NNN-nombre` (ver Governance en `.specify/memory/constitution.md`). El flujo es:
`/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`.
