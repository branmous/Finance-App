# Phase 0 Research: Cimientos del Proyecto

No hay marcadores `NEEDS CLARIFICATION` pendientes en el Technical Context del plan: todas las
decisiones ya estaban fijadas en `guia-app-finance.md` y en `.specify/memory/constitution.md`.
Este documento deja constancia de esas decisiones y de las alternativas descartadas, para que
`/speckit-tasks` no tenga que volver a investigarlas.

## Monorepo: pnpm workspaces + Turborepo

- **Decision**: Usar pnpm workspaces para la gestión de dependencias y Turborepo para
  orquestar build/lint/test entre `apps/web`, `packages/core` y `packages/db`.
- **Rationale**: Permite compartir `packages/core` entre la web y un futuro cliente móvil
  (Expo/React Native) sin publicar paquetes a un registro; Turborepo cachea tareas repetidas
  (build, test) entre paquetes, lo cual importa incluso con un solo desarrollador porque acelera
  el pipeline de CI en Docker.
- **Alternatives considered**: npm/yarn workspaces sin Turborepo (rechazado: sin caché de tareas,
  cada `docker compose run` en CI recompilaría todo desde cero); Nx (rechazado: más features de
  las necesarias para un monorepo de 3 paquetes, mayor curva de configuración).

## Framework web: Next.js App Router

- **Decision**: `apps/web` en Next.js (App Router), con Server Actions como puerta de entrada a
  los casos de uso de `packages/core` en specs futuros.
- **Rationale**: Un mismo proyecto sirve frontend y backend (API routes/Server Actions), decisión
  ya tomada en la guía del proyecto; el middleware de Next.js es suficiente para bloquear rutas
  sin sesión (FR-009).
- **Alternatives considered**: Separar frontend (Next.js) y backend (Express/Nest) en dos
  proyectos (rechazado por la constitución: "monolito modular", no microservicios, para reducir
  complejidad operativa de un proyecto de un solo usuario).

## Autenticación restringida a un correo

- **Decision**: Auth.js (NextAuth) con un provider de email/OAuth simple, cuyo callback de
  `signIn` compara el correo autenticado (normalizado a minúsculas y sin espacios) contra una
  variable de entorno `AUTHORIZED_EMAIL`; cualquier otro correo es rechazado antes de crear
  sesión.
- **Rationale**: Cumple FR-010 (restricción configurable sin cambiar código) y el edge case de
  normalización de mayúsculas/espacios identificado en el spec, sin construir un sistema de
  roles/permisos que la constitución explícitamente no pide para el MVP.
- **Alternatives considered**: Supabase Auth (alternativa igualmente válida mencionada en la
  guía; se deja documentada pero se elige Auth.js para no acoplar el login al proveedor de base
  de datos, en caso de migrar de Supabase a Neon más adelante); construir un login propio con
  usuario/contraseña (rechazado: más superficie de seguridad para un único usuario, sin beneficio
  claro).

## Base de datos y migraciones: PostgreSQL + Drizzle

- **Decision**: PostgreSQL gestionado (Supabase o Neon, plan gratuito) como base de datos real
  desde el día uno; Drizzle ORM y Drizzle Kit para generar y versionar la migración inicial
  (`packages/db/migrations/0000_init.sql`), sin tablas de negocio todavía.
- **Rationale**: Ya decidido en la constitución (Modelo de Datos y Multiusuario); Drizzle expresa
  el esquema en TypeScript (cumple Principio I) y sus migraciones son archivos SQL versionables,
  lo que satisface FR-006/FR-007 (migración aplicable repetidamente sin duplicar cambios, gracias
  a la tabla de historial de migraciones que Drizzle Kit gestiona).
- **Alternatives considered**: Prisma (rechazado: motor propio en Rust añade una dependencia
  binaria extra dentro de contenedores Docker, sin beneficio claro sobre Drizzle para este
  proyecto); escribir SQL a mano sin herramienta de migraciones (rechazado: sin historial
  versionado, alto riesgo de aplicar cambios duplicados).

## CI/CD reproducible con Docker

- **Decision**: `docker-compose.yml` en la raíz del repo con un servicio `postgres` para
  desarrollo/pruebas; un workflow de GitHub Actions que ejecuta `docker compose up -d postgres`
  seguido de `docker compose run` (o equivalente) para lint, Vitest y Playwright dentro de un
  contenedor con Node.js, antes de cualquier paso de despliegue.
- **Rationale**: Exigido explícitamente por la constitución (CI/CD y Entornos Reproducibles);
  garantiza que el entorno de CI sea idéntico al de desarrollo local.
- **Alternatives considered**: Instalar PostgreSQL como "service container" nativo de GitHub
  Actions sin Docker Compose (rechazado: la constitución pide Docker Compose explícitamente para
  que el mismo archivo sirva en CI y en local); usar una base de datos de test in-memory tipo
  SQLite (rechazado: PostgreSQL tiene comportamiento distinto en tipos/constraints, y el
  principio de la constitución pide reproducibilidad real, no un sustituto).

## Despliegue: Vercel

- **Decision**: Desplegar `apps/web` en Vercel, con la variable `AUTHORIZED_EMAIL` y la cadena de
  conexión a PostgreSQL configuradas como variables de entorno del proyecto en Vercel (no en el
  código fuente).
- **Rationale**: Ya decidido en la guía del proyecto; plan gratuito suficiente para un solo
  usuario; el despliegue es independiente del pipeline de Docker usado en CI (según la
  constitución, Docker es solo para CI/desarrollo local).
- **Alternatives considered**: Self-hosting en un VPS (rechazado: complejidad operativa
  innecesaria para un proyecto de un solo usuario, contradice la guía de "hosting gratuito para
  un usuario").
