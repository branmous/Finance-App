---

description: "Task list template for feature implementation"
---

# Tasks: Cimientos del Proyecto

**Input**: Design documents from `/specs/001-cimientos/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/auth.md](./contracts/auth.md), [quickstart.md](./quickstart.md)

**Tests**: Incluidas — la constitución exige pruebas obligatorias en el dominio (Principio IV,
no negociable) y el spec define escenarios de aceptación verificables (login, build/lint/test,
migración).

**Organization**: Las tareas están agrupadas por historia de usuario (spec.md) para poder
implementar y probar cada una de forma independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece la tarea (US1, US2, US3)
- Todas las rutas son relativas a `finance-app/` (raíz del monorepo)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicializar el monorepo y el andamiaje base de los tres paquetes.

- [X] T001 Initialize the pnpm monorepo root config (`package.json`, `pnpm-workspace.yaml`) at `finance-app/package.json` and `finance-app/pnpm-workspace.yaml`
- [X] T002 Configure the Turborepo pipeline (`build`, `lint`, `test` tasks) at `finance-app/turbo.json`
- [X] T003 [P] Create the shared strict TypeScript base config at `finance-app/tsconfig.base.json`
- [X] T004 [P] Configure the shared ESLint + Prettier config at `finance-app/.eslintrc.cjs` and `finance-app/.prettierrc`
- [X] T005 [P] Scaffold `packages/core` (`package.json`, `tsconfig.json` extending the base config, `vitest.config.ts`) at `finance-app/packages/core/`
- [X] T006 [P] Scaffold `packages/db` (`package.json`, `tsconfig.json` extending the base config) at `finance-app/packages/db/`
- [X] T007 [P] Scaffold `apps/web` as a Next.js App Router project (`package.json`, `tsconfig.json` extending the base config, `next.config.mjs`) at `finance-app/apps/web/` — `next.config.ts` is not supported by Next.js 14, used `.mjs` instead
- [X] T008 Create `docker-compose.yml` with a `postgres` service for local development and CI at `finance-app/docker-compose.yml` (plus `Dockerfile.ci` for the `app` service referenced by it)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura que las tres historias de usuario necesitan antes de empezar.

**⚠️ CRITICAL**: Ninguna historia de usuario puede comenzar hasta completar esta fase.

- [X] T009 Wire the `turbo.json` pipeline so `pnpm turbo run build|lint|test` executes successfully across `apps/web`, `packages/core`, and `packages/db` (depends on T002, T005, T006, T007) in `finance-app/turbo.json` — verified green: `pnpm turbo run build lint test` → 9/9 tasks successful
- [X] T010 Create the shared columns schema helper per data-model.md — `id` (`uuid`, primary key, default `gen_random_uuid()`), `user_id` (`uuid`, not null), `created_at` (`timestamptz`, not null, default `now()`), `updated_at` (`timestamptz`, not null, default `now()`) — at `finance-app/packages/db/schema/shared-columns.ts`
- [X] T011 [P] Create `.env.example` documenting `DATABASE_URL` and `AUTHORIZED_EMAIL` at `finance-app/apps/web/.env.example` (also documents `NEXTAUTH_URL` and `NEXTAUTH_SECRET`, required by the Auth.js setup from US1)

**Checkpoint**: Fundación lista — las historias de usuario pueden empezar (en paralelo si hay más de un desarrollador).

---

## Phase 3: User Story 1 - Acceder a una app propia y vacía en producción (Priority: P1) 🎯 MVP

**Goal**: Solo el correo autorizado puede autenticarse y ver una página de bienvenida
desplegada públicamente; cualquier otro correo o sesión ausente queda bloqueado (FR-008 a
FR-011, contrato en `contracts/auth.md`).

**Independent Test**: Visitar la URL pública sin sesión (redirige a `/login`), autenticarse con
un correo distinto al autorizado (acceso denegado) y autenticarse con el correo autorizado (se
ve la página de bienvenida) — los tres casos se verifican sin depender de US2 ni US3.

### Tests for User Story 1 ⚠️

> **NOTE: Escribir esta prueba primero y confirmar que falla antes de implementar.**

- [X] T012 [P] [US1] Write a Playwright e2e test covering the three auth contract cases from `contracts/auth.md` (no session → `/login`; wrong email → denied page; authorized email → welcome page) in `finance-app/apps/web/tests/e2e/login.spec.ts`

### Implementation for User Story 1

- [X] T013 [US1] Configure the Auth.js provider and session setup in `finance-app/apps/web/lib/auth.ts` — credentials-based email provider (single user, no password; see research.md for the OAuth alternative)
- [X] T014 [US1] Implement the `signIn` callback that normalizes the authenticated email (lowercase, trimmed) and rejects any email that does not exactly match `AUTHORIZED_EMAIL` (depends on T013) in `finance-app/apps/web/lib/auth.ts`
- [X] T015 [US1] Implement `middleware.ts` that redirects to `/login` when there is no valid session, and to the denied page when the session's email is not `AUTHORIZED_EMAIL`, for every route except `/login` (depends on T014) in `finance-app/apps/web/middleware.ts`
- [X] T016 [P] [US1] Create the `/login` page in `finance-app/apps/web/app/(auth)/login/page.tsx`
- [X] T017 [P] [US1] Create the access-denied page shown when the authenticated email is not authorized in `finance-app/apps/web/app/(auth)/denied/page.tsx`
- [X] T018 [US1] Create the protected welcome page that shows the authenticated user's email and no business content (categories, accounts, expenses, reports), per FR-011 (depends on T015) in `finance-app/apps/web/app/page.tsx`
- [X] T019 [US1] Document the Vercel deployment steps and required environment variables (`AUTHORIZED_EMAIL`, `DATABASE_URL`, auth secrets) in `finance-app/apps/web/README.md`

**Verified**: T012's Playwright suite passes 3/3 against a production build (`next build && next start`) — see the note under T028 about why dev mode is not used for this test.

**Checkpoint**: User Story 1 completamente funcional y probable de forma independiente (MVP desplegable).

---

## Phase 4: User Story 2 - Confiar en que el código compila y pasa pruebas antes de crecer (Priority: P2)

**Goal**: El monorepo instala, compila, lintea y prueba en verde desde un checkout limpio, sin
lógica de negocio todavía (FR-001 a FR-005).

**Independent Test**: Clonar el repo, instalar dependencias, y correr build/lint/test del
monorepo — deben pasar en verde sin depender de que US1 o US3 estén implementadas.

### Tests for User Story 2 ⚠️

- [X] T020 [P] [US2] Write a Vitest unit test for a minimal example function in `finance-app/packages/core/tests/index.test.ts`

### Implementation for User Story 2

- [X] T021 [P] [US2] Implement the minimal framework-agnostic example unit under test — no imports from Next.js, Drizzle, or any database client, per Constitution Principle II — in `finance-app/packages/core/src/index.ts`
- [X] T022 [US2] Document the install/build/lint/test commands for contributors in `finance-app/README.md`

**Checkpoint**: User Stories 1 y 2 funcionan de forma independiente.

---

## Phase 5: User Story 3 - Tener una base de datos real con historial de cambios versionado (Priority: P3)

**Goal**: Existe una base de datos PostgreSQL real con la migración inicial aplicada y
versionada, aplicable repetidamente sin duplicar cambios (FR-006, FR-007).

**Independent Test**: Aplicar la migración inicial contra una base de datos vacía y verificar
que el esquema queda creado; aplicarla una segunda vez y confirmar que no falla ni duplica
cambios — verificable sin depender de US1 ni US2.

### Implementation for User Story 3

- [X] T023 [US3] Configure Drizzle Kit pointing at the schema in `packages/db/schema` (depends on T010) in `finance-app/packages/db/drizzle.config.ts`
- [X] T024 [US3] Generate the initial migration with no business tables via Drizzle Kit (depends on T023) at `finance-app/packages/db/migrations/0000_init.sql` — generated with `drizzle-kit generate --custom` (0 business tables in `schema/`, as intended) plus proper `meta/_journal.json`/`meta/0000_snapshot.json`, and edited to add `CREATE EXTENSION IF NOT EXISTS pgcrypto;`
- [X] T025 [US3] Add a `migrate` script that applies pending migrations idempotently, per FR-007 (depends on T024) in `finance-app/packages/db/package.json` — implemented in `packages/db/src/migrate.ts`
- [X] T026 [US3] Implement the database client `apps/web` uses to read `DATABASE_URL` and connect through `packages/db` (depends on T024) in `finance-app/apps/web/lib/db.ts`

**⚠️ Not verified against a live database**: this environment has no running Docker daemon
(only the Docker CLI is installed), so `pnpm --filter @finance-app/db migrate` was never run
against a real PostgreSQL instance. `drizzle-kit generate` was run for real and produced valid
migration files; running `docker compose up -d postgres && pnpm --filter @finance-app/db migrate`
(twice, to confirm idempotency per FR-007) is a follow-up the user needs to run locally with
Docker Desktop actually started.

**Checkpoint**: Las tres historias de usuario funcionan de forma independiente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Amarrar CI reproducible y validar el spec de punta a punta.

- [X] T027 [P] Create the GitHub Actions workflow that runs the Docker Compose based lint/test pipeline (per the CI/CD constitution rule) before any deploy step at `.github/workflows/ci.yml` (repo root, not `finance-app/.github/...` — GitHub Actions requires workflows at the git repository root, and `finance-app/` is a subfolder of the actual repo root) — **not yet exercised by a real GitHub Actions run** (would require pushing the branch)
- [X] T028 [P] Configure Playwright (depends on T012) in `finance-app/apps/web/playwright.config.ts` — configured to build+start a production server rather than `next dev`, because Auth.js's CSRF cookie proved unreliable under Next.js dev-mode Fast Refresh during testing (see quickstart.md notes)
- [X] T029 Run the `quickstart.md` validation for the parts reachable in this environment and record the results in `finance-app/specs/001-cimientos/quickstart.md` — see the "Validation results" section added there for exactly what was and wasn't verified

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede empezar de inmediato.
- **Foundational (Phase 2)**: depende de que Setup termine — BLOQUEA las tres historias.
- **User Stories (Phase 3-5)**: todas dependen de que Foundational termine; pueden avanzar en
  paralelo o en orden de prioridad (P1 → P2 → P3).
- **Polish (Phase 6)**: depende de que las historias que se quieran entregar estén completas
  (T027 no depende de ninguna historia; T028 depende de T012/US1; T029 depende de las tres).

### User Story Dependencies

- **User Story 1 (P1)**: puede empezar tras Foundational — sin dependencia de US2 ni US3.
- **User Story 2 (P2)**: puede empezar tras Foundational — sin dependencia de US1 ni US3.
- **User Story 3 (P3)**: puede empezar tras Foundational — sin dependencia de US1 ni US2 (usa
  el helper de columnas compartidas creado en Foundational, T010).

### Within Each User Story

- Las pruebas (cuando existen) se escriben y deben fallar antes de implementar.
- Dentro de US1: auth config → callback → middleware → páginas → documentación de despliegue.
- Dentro de US3: config de Drizzle Kit → migración → script de migrate → cliente de DB.

### Parallel Opportunities

- Todas las tareas [P] de Setup (T003-T007) pueden correr en paralelo.
- T011 (Foundational) puede correr en paralelo con T010, no con T009.
- Tras completar Foundational, US1, US2 y US3 pueden trabajarse en paralelo si hay más de un
  desarrollador.
- T012 (test) y T016/T017 (páginas) de US1 pueden correr en paralelo entre sí.
- T020 y T021 de US2 pueden correr en paralelo.
- T027 y T028 de Polish pueden correr en paralelo entre sí.

---

## Parallel Example: User Story 1

```bash
# Lanzar en paralelo la prueba y las páginas estáticas de US1:
Task: "Write Playwright e2e test covering the three auth contract cases in finance-app/apps/web/tests/e2e/login.spec.ts"
Task: "Create the /login page in finance-app/apps/web/app/(auth)/login/page.tsx"
Task: "Create the access-denied page in finance-app/apps/web/app/(auth)/denied/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (crítico — bloquea las tres historias)
3. Completar Phase 3: User Story 1
4. **PARAR y VALIDAR**: probar User Story 1 de forma independiente (los tres casos del
   contrato de auth)
5. Desplegar/demostrar si está listo — ya es un MVP desplegable y protegido

### Incremental Delivery

1. Setup + Foundational → base lista
2. Agregar User Story 1 → probar de forma independiente → desplegar (MVP)
3. Agregar User Story 2 → probar de forma independiente → confirma que el monorepo es
   confiable para specs futuros
4. Agregar User Story 3 → probar de forma independiente → confirma que hay base de datos real
   lista para specs de negocio
5. Cerrar con Phase 6 (CI en Docker + validación completa de quickstart.md)

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes.
- La etiqueta de historia mapea cada tarea a su historia de usuario para trazabilidad.
- Cada historia debe quedar completable y probable de forma independiente.
- Confirmar que las pruebas fallan antes de implementar (T012, T020).
- Hacer commit tras cada tarea o grupo lógico de tareas, siempre en la rama
  `feature/001-cimientos` (regla de branching de la constitución).
- Evitar: tareas vagas, conflictos de archivo entre tareas paralelas, dependencias cruzadas
  entre historias que rompan su independencia.
