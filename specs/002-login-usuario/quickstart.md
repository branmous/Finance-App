# Quickstart: Login de Usuario con Contraseña

## 1. Pruebas de dominio y base de datos (sin servicios externos)

```sh
pnpm --filter @finance-app/core test    # hash, normalización y política de bloqueo
pnpm --filter @finance-app/db test      # migración, repositorio y seed sobre PGlite (Postgres real en proceso)
```

**Resultado esperado**: 13 pruebas en core y 14 en db pasan.

## 2. Crear el usuario inicial en la base de datos

Requiere PostgreSQL accesible en `DATABASE_URL` (por ejemplo `docker compose up -d postgres`).

```sh
pnpm --filter @finance-app/db migrate
pnpm --filter @finance-app/db seed-user -- --email tu@correo.com --username tu-usuario --password "una-contraseña-larga"
```

Ejecutar el seed dos veces con el mismo correo no debe crear duplicados ni cambiar la contraseña.

## 3. Flujo de login end-to-end

Requiere PostgreSQL con la migración aplicada y el usuario creado en el paso 2.

```sh
DATABASE_URL=postgres://finance_app:finance_app@localhost:5432/finance_app \
  pnpm --filter @finance-app/web test:e2e
```

Las pruebas siembran sus propios usuarios (`e2e-user` y `lockout-user`) con el mismo comando de
seed. Cubren: redirección sin sesión, login con correo, login con usuario, contraseña incorrecta,
identificador inexistente y bloqueo tras 5 intentos.

## Resultados de validación (2026-10-05)

| Paso | Resultado |
| --- | --- |
| 1. Core y DB sobre PGlite | ✅ 13 + 14 pruebas en verde. |
| Build, lint y test del monorepo | ✅ `pnpm turbo run build lint test --force` → 9/9 tareas. |
| 2. Migración y seed contra PostgreSQL real | ⚠️ No ejecutado en este entorno: no hay daemon de Docker ni PostgreSQL local. El seed sí se ejecutó y falló con el mensaje esperado al no encontrar `DATABASE_URL`. |
| 3. Flujo e2e (Playwright) | ⚠️ No ejecutado contra base de datos. Las pruebas de sembrado fallan sin `DATABASE_URL`, como se espera. La redirección sin sesión no depende de la base de datos. |

**Pendiente**: con Docker Desktop activo, correr los pasos 2 y 3 en tu máquina.
