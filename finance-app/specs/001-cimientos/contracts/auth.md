# Contract: Route Protection & Authorization

Este spec no expone una API pública para terceros; su único "contrato" observable es el
comportamiento de autenticación/autorización que toda ruta de `apps/web` debe cumplir, del cual
dependerán todos los specs de negocio futuros.

## Contrato: acceso a cualquier ruta de la aplicación

**Aplica a**: todas las rutas bajo `apps/web/app/**`, excepto las de autenticación misma
(`/login` y las rutas internas del provider de Auth.js).

**Precondición**: request entrante sin distinción de método (GET/POST/etc.).

**Comportamiento requerido**:

1. Si no hay sesión válida → responder con un redirect a `/login` (nunca renderizar contenido de
   la aplicación). Cumple FR-009.
2. Si hay sesión válida pero el correo asociado (normalizado a minúsculas, sin espacios al
   inicio/fin) no coincide exactamente con `AUTHORIZED_EMAIL` → invalidar la sesión y redirigir a
   una página de acceso denegado (no a la página de bienvenida). Cumple FR-010 y el edge case de
   normalización del correo.
3. Si hay sesión válida y el correo coincide con `AUTHORIZED_EMAIL` → permitir el acceso a la
   ruta solicitada.

**Postcondición observable**: ningún contenido de `apps/web/app/page.tsx` (u otra ruta protegida)
llega al cliente en las respuestas HTTP de los casos 1 y 2; solo en el caso 3.

## Contrato: página de bienvenida (`/`)

**Precondición**: sesión válida y autorizada (ver contrato anterior).

**Comportamiento requerido**: renderizar una página simple, sin llamadas a `packages/core` ni a
`packages/db` más allá de lo estrictamente necesario para mostrar la sesión activa (p. ej. el
correo del usuario). No debe incluir navegación ni datos de categorías, cuentas, gastos ni
reportes (fuera de alcance de este spec, FR-011).

## Contrato: verificación end-to-end (para Playwright)

Un test Playwright DEBE poder ejercitar los tres casos del primer contrato contra el
despliegue/entorno de pruebas:

1. Visitar `/` sin sesión → terminar en `/login`.
2. Autenticarse con un correo distinto a `AUTHORIZED_EMAIL` → terminar en la página de acceso
   denegado, nunca en `/`.
3. Autenticarse con `AUTHORIZED_EMAIL` → terminar en `/` viendo la página de bienvenida.

Este es el contrato que valida las Acceptance Scenarios 1–3 de la User Story 1 del spec.
