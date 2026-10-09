# Plan: Cambio de idioma (inglés / español)

Implementa [spec.md](./spec.md). Solo existen `en` y `es`.

## Decisiones
- **Librería**: `next-intl` con App Router y **sin prefijo en la URL**; el idioma vive en la cookie `NEXT_LOCALE` (1 año). Las rutas y `middleware.ts` no cambian.
- **Resolución del idioma** (`apps/web/i18n/request.ts`): cookie → cabecera `Accept-Language` (primer idioma soportado) → `en`. Un valor inválido en la cookie se ignora. Funciona también en `/login`.
- **Catálogos** (`apps/web/messages/`): `en.json` / `es.json` para lo general (nombre de la app, navegación, login, común) y un archivo por área en `en/` y `es/` (`validation`, `categories`, `income`, `expenses`, `debts`, `travels`, `dashboard`). `messages/index.ts` los junta. El inglés es el respaldo: una clave que falte en español muestra el texto en inglés, nunca la clave.
- **Errores como códigos**: `packages/core` y `packages/db` ya no devuelven texto. Los `validate*Input` devuelven `{ code, params? }` (`ValidationError`, en `packages/core/src/validation.ts`) y los errores de los repositorios llevan un `code`. Las server actions devuelven esos códigos y la UI los traduce con `useValidationMessage()` (`apps/web/lib/use-validation-message.ts`). El texto vive en `messages/<idioma>/validation.json`.
- **Formatos**: las fechas usan `Intl` con el idioma activo (`apps/web/lib/format.ts`; `formatPeriod` de core recibe el idioma). Los montos siguen en COP con formato `es-CO` en ambos idiomas.
- **Selector**: `components/language-switcher.tsx` (English / Español) llama a la server action `setLocale` (`i18n/actions.ts`), que guarda la cookie y revalida el layout; no recarga ni pierde lo escrito. Está en el menú lateral/móvil y en el login.
- **Datos del usuario** (nombres de categorías, notas, nombres de personas) no se traducen. El nombre por defecto de "yo" en un viaje nuevo sí sigue el idioma (`Me` / `Yo`).

## Cómo agregar un texto
1. Agrega la clave en `messages/en/<área>.json` y en `messages/es/<área>.json`.
2. Úsala con `useTranslations("<área>")` (cliente) o `getTranslations` (servidor).
3. Para un error de validación nuevo, devuelve `validationError("miCodigo", { max })` desde core y agrega `miCodigo` en `validation.json` de ambos idiomas.
4. `pnpm --filter @finance-app/web test` falla si un idioma tiene una clave o un parámetro que el otro no tiene.

## Verificación
- `pnpm --filter @finance-app/core test`, `pnpm --filter @finance-app/db test`, `pnpm --filter @finance-app/web test` (paridad de catálogos y detección de idioma).
- `pnpm lint` y `tsc --noEmit` en `apps/web`.
- `pnpm --filter @finance-app/web test:e2e` (necesita PostgreSQL): los specs existentes corren en inglés (`locale: "en-US"` en `playwright.config.ts`) y `tests/e2e/i18n.spec.ts` cubre el cambio de idioma, la persistencia, el idioma del navegador, los errores traducidos y que los datos del usuario no cambian.
