# Tasks: Login de Usuario con Contraseña

Rutas relativas a `finance-app/`. `[P]` = paralelizable, `[USn]` = historia de usuario.

## Phase 1: Dominio puro (packages/core)

- [ ] T001 [P] Add `bcryptjs` dependency and `@types/bcryptjs` to `packages/core/package.json`
- [ ] T002 [P] Write Vitest tests for `normalizeIdentifier` in `packages/core/tests/auth/identifier.test.ts`
- [ ] T003 [P] Implement `normalizeIdentifier` (trim; lowercase when containing `@`) in `packages/core/src/auth/identifier.ts`
- [ ] T004 [P] Write Vitest tests for the lockout policy in `packages/core/tests/auth/lockout.test.ts` (5 failures in 15 min locks; after window resets; success clears)
- [ ] T005 [P] Implement the lockout policy (`MAX_ATTEMPTS = 5`, `LOCK_WINDOW_MS = 15 * 60_000`, `isLocked`, `nextFailureState`) in `packages/core/src/auth/lockout.ts`
- [ ] T006 [P] Write Vitest tests for `hashPassword` / `verifyPassword` in `packages/core/tests/auth/password.test.ts` (hash != plaintext, verify true/false, unique salts)
- [ ] T007 Implement `hashPassword`, `verifyPassword`, and a timing-equalizing dummy hash in `packages/core/src/auth/password.ts`
- [ ] T008 Export the auth modules from `packages/core/src/index.ts`

## Phase 2: Base de datos (packages/db)

- [ ] T009 Add `@electric-sql/pglite` and `drizzle-orm/pglite` test setup to `packages/db/package.json`
- [ ] T010 Define the `users` table (shared columns minus `user_id`, plus `username`, `email`, `password_hash`, `failed_attempts`, `locked_until`; unique on `username` and `email`) in `packages/db/schema/users.ts`
- [ ] T011 Generate migration `0001_create_users.sql` with `drizzle-kit generate` in `packages/db/migrations/`
- [ ] T012 Write PGlite-backed tests for the migration in `packages/db/tests/migration.test.ts`
- [ ] T013 Implement the user repository (`findByIdentifier`, `createUser`, `recordFailure`, `resetFailures`) in `packages/db/src/user-repository.ts`
- [ ] T014 Write PGlite-backed tests for the repository in `packages/db/tests/user-repository.test.ts`
- [ ] T015 Implement the idempotent seed CLI (`--email --username --password`; fails without all args; refuses to overwrite an existing user) in `packages/db/src/seed-user.ts`
- [ ] T016 Add a `seed-user` script to `packages/db/package.json` and write PGlite-backed seed tests in `packages/db/tests/seed-user.test.ts`
- [ ] T017 Export the repository from `packages/db/src/index.ts`

## Phase 3: Autenticación en la web (US1 + US2)

- [ ] T018 [US1] Replace the Credentials `authorize` in `apps/web/lib/auth.ts` with identifier+password verification using core and the repository; generic failure; dummy hash when user missing
- [ ] T019 [US1] Remove the `AUTHORIZED_EMAIL` check from the `signIn` callback in `apps/web/lib/auth.ts`
- [ ] T020 [US1] Simplify `apps/web/middleware.ts` to require a valid session only (remove the email comparison and `/denied` redirect)
- [ ] T021 [US1] Delete `apps/web/app/(auth)/denied/page.tsx`
- [ ] T022 [US1] Rewrite the login page in `apps/web/app/(auth)/login/page.tsx` with identifier and password fields, `redirect: false`, and an inline generic error message

## Phase 4: Pruebas end-to-end y documentación

- [ ] T023 [US1] Update `apps/web/tests/e2e/login.spec.ts` for the new flow (seeded user by username, by email, wrong password, unknown identifier, redirect when logged out)
- [ ] T024 [US1] Update `apps/web/.env.example` (remove `AUTHORIZED_EMAIL`, document the seed command) and `apps/web/README.md`
- [ ] T025 Update `specs/002-login-usuario/quickstart.md` with the validation steps and what was verified in this environment

## Notas

- Las pruebas de `packages/db` usan PGlite; las de Playwright requieren una base de datos con
  el usuario seed. Sin Docker no se pueden correr las de Playwright en este entorno; se
  documenta en quickstart.md.
