# Quickstart: Cimientos del Proyecto

Guía de validación manual/automatizada para confirmar que este spec está "listo", según los
criterios de éxito (`spec.md` → Success Criteria) y los contratos (`contracts/auth.md`).

## Prerrequisitos

- Node.js LTS y pnpm instalados (o, si se prueba vía Docker, solo Docker + Docker Compose).
- Una instancia de PostgreSQL disponible (local vía `docker compose up -d postgres`, o el
  proyecto real en Supabase/Neon para la validación en producción).
- Variables de entorno configuradas: `DATABASE_URL` y `AUTHORIZED_EMAIL` (ver `.env.example`
  en `apps/web`, a crear como parte de las tareas de implementación).

## 1. Levantar el entorno local reproducible

```sh
docker compose up -d postgres
pnpm install
pnpm --filter @finance-app/db migrate   # aplica migrations/0000_init.sql
```

**Resultado esperado**: la migración se aplica sin errores. Volver a correr el mismo comando no
debe fallar ni duplicar cambios (SC-004).

## 2. Verificar build, lint y test del monorepo

```sh
pnpm turbo run build
pnpm turbo run lint
pnpm turbo run test
```

**Resultado esperado**: los tres paquetes (`apps/web`, `packages/core`, `packages/db`) compilan,
el lint no reporta errores, y la suite de Vitest de `packages/core` pasa en verde (Acceptance
Scenarios de User Story 2).

## 3. Correr el mismo pipeline vía Docker (como en CI)

```sh
docker compose run --rm app pnpm turbo run lint test
```

**Resultado esperado**: mismo resultado que el paso 2, confirmando que CI y entorno local usan el
mismo contenedor (regla de la constitución sobre CI/CD reproducible).

## 4. Validar el flujo de login (manual o Playwright)

```sh
pnpm --filter apps/web dev
# o, para el flujo automatizado:
pnpm --filter apps/web test:e2e
```

Casos a verificar (ver `contracts/auth.md`):

1. Visitar `/` sin sesión → se redirige a `/login`.
2. Autenticarse con un correo distinto a `AUTHORIZED_EMAIL` → acceso denegado, nunca se ve `/`.
3. Autenticarse con `AUTHORIZED_EMAIL` → se ve la página de bienvenida sin errores.

**Resultado esperado**: los tres casos se cumplen (SC-002, SC-003).

## 5. Validar en producción (Vercel)

1. Desplegar `apps/web` a Vercel con `DATABASE_URL` y `AUTHORIZED_EMAIL` configuradas como
   variables de entorno del proyecto (no en el código).
2. Repetir los tres casos del paso 4 contra la URL pública del despliegue.

**Resultado esperado**: mismo comportamiento que en local, confirmando FR-008 y FR-012 (el
"cimientos listo" es verificable de punta a punta por alguien externo al autor).
