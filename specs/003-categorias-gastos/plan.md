# Implementation Plan: Categorías de Gastos y Shell Visual

**Branch**: `feature/003-categorias-gastos` | **Spec**: [spec.md](./spec.md)

## Summary

Agregar Tailwind y componentes propios a `apps/web`, un layout autenticado con sidebar
(Categories, Log out), un dashboard inicial y el ABM de categorías. El dominio
(validación) vive en `packages/core`, la persistencia en `packages/db` y la interfaz con
Server Actions en `apps/web`.

## Technical Context

- **Stack existente**: Next.js 14 (App Router), NextAuth v4 (JWT), Drizzle ORM + PostgreSQL, Vitest (+ pglite), Playwright.
- **Nuevo**: Tailwind CSS 3 + PostCSS + autoprefixer, `next/font`.
- **Datos**: tabla `categories` (`id`, `user_id` FK `users`, `name`, `type`, `color`, `icon`, timestamps), índice único `(user_id, lower(name))`, migración `0002_create_categories.sql`.
- **Dominio**: `packages/core/src/categories/` con tipos, listas cerradas y `validateCategoryInput`.
- **Repositorio**: `packages/db/src/category-repository.ts`; todas las operaciones reciben `userId`.
- **Web**: route group `(app)` con layout autenticado; `/` dashboard; `/categories`; Server Actions que leen el `userId` de la sesión.
- **Sesión**: callback de NextAuth para exponer `user.id` (el `sub` del JWT).

## Constitution Check

- TypeScript estricto: sí.
- Dominio aislado en `core`: validación pura en `core`, sin dependencias de web ni db.
- Modelo multiusuario: `user_id` en la tabla y filtrado en el repositorio.
- Pruebas: Vitest en `core` y `db`, Playwright para el flujo principal.
- Código en inglés, documentación en español.
