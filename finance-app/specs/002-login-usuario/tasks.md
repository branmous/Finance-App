# Tasks: Login de Usuario con Contraseña

Rutas relativas a `finance-app/`. `[P]` = paralelizable, `[USn]` = historia de usuario.

## Phase 1: Dominio puro (packages/core)

- [X] T001 [P] Add `bcryptjs` dependency and `@types/bcryptjs` to `packages/core/package.json`
- [X] T002 [P] Write Vitest tests for `normalizeIdentifier` in `packages/core/tests/auth/identifier.test.ts`
- [X] T003 [P] Implement `normalizeIdentifier` (trim + lowercase for emails and usernames) in `packages/core/src/auth/identifier.ts`
- [X] T004 [P] Write Vitest tests for the lockout policy in `packages/core/tests/auth/lockout.test.ts`
- [X] T005 [P] Implement the lockout policy (`MAX_ATTEMPTS = 5`, `LOCK_WINDOW_MS = 15 min`, `isLocked`, `nextFailureState`) in `packages/core/src/auth/lockout.ts`
- [X] T006 [P] Write Vitest tests for `hashPassword` / `verifyPassword` in `packages/core/tests/auth/password.test.ts`
- [X] T007 Implement `hashPassword`, `verifyPassword`, and `verifyAgainstDummyHash` in `packages/core/src/auth/password.ts`
- [X] T008 Export the auth modules from `packages/core/src/index.ts`

## Phase 2: Base de datos (packages/db)

- [X] T009 Add `@electric-sql/pglite` (tests) and `vitest` to `packages/db/package.json`
- [X] T010 Define the `users` table in `packages/db/schema/users.ts` (no `user_id`: it is the identity table; unique `username` and `email`)
- [X] T011 Generate migration `0001_create_users.sql` with `drizzle-kit generate` in `packages/db/migrations/`
- [X] T012 Write PGlite-backed tests for the migration in `packages/db/tests/migration.test.ts`
- [X] T013 Implement the user repository (`findByIdentifier`, `createUser`, `saveLockoutState`) in `packages/db/src/user-repository.ts`
- [X] T014 Write PGlite-backed tests for the repository in `packages/db/tests/user-repository.test.ts`
- [X] T015 Implement the idempotent seed (`seedUser`, `parseSeedArgs`) in `packages/db/src/seed-user.ts` and the CLI entry in `packages/db/src/seed-user-cli.ts`
- [X] T016 Add the `seed-user` script and write seed tests in `packages/db/tests/seed-user.test.ts`
- [X] T017 Export the repository and seed from `packages/db/src/index.ts`

## Phase 3: Autenticación en la web (US1 + US2)

- [X] T018 [US1] Replace the Credentials `authorize` in `apps/web/lib/auth.ts` with identifier + password verification (core + repository, generic failure, dummy hash when the user is missing, lockout)
- [X] T019 [US1] Remove the `AUTHORIZED_EMAIL` check from `apps/web/lib/auth.ts` (identity is now the database)
- [X] T020 [US1] Simplify `apps/web/middleware.ts` to require a valid session only
- [X] T021 [US1] Delete `apps/web/app/(auth)/denied/page.tsx`
- [X] T022 [US1] Rewrite `apps/web/app/(auth)/login/page.tsx` with identifier and password fields, `redirect: false`, and an inline generic error

## Phase 4: Pruebas end-to-end y documentación

- [X] T023 [US1] Update `apps/web/tests/e2e/login.spec.ts` (seeds two users via the CLI; covers email, username, wrong password, unknown identifier, lockout)
- [X] T024 [US1] Update `apps/web/.env.example`, `apps/web/README.md` (remove `AUTHORIZED_EMAIL`, document the seed command)
- [X] T025 Update `specs/002-login-usuario/quickstart.md` with validation steps and what was verified here

## Notas de implementación

- `saveLockoutState` reemplaza `recordFailure` y `resetFailures` por un único método que recibe el
  estado calculado por la política pura de `core`.
- `0000_init.sql` dejó de crear la extensión `pgcrypto`: `gen_random_uuid()` es nativo desde
  PostgreSQL 13 y PGlite no provee `pgcrypto` como módulo JS utilizable.
- La validación de contraseña en el seed exige al menos 12 caracteres; el spec no lo fijaba y
  queda como decisión documentada.
