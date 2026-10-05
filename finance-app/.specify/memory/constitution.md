<!--
Sync Impact Report
- Version change: 1.2.0 → 1.3.0 (MINOR: new core principle added)
- Modified principles: none
- Added sections:
  - Core Principles: VI. Código en Inglés — todo identificador, nombre de archivo, tabla,
    columna, mensaje de commit y comentario de código DEBE escribirse en inglés; los
    documentos de producto (specs, planes, constitución) pueden permanecer en español
- Removed sections: none
- Templates requiring updates:
  - .specify/templates/plan-template.md ⚠ pending manual check (not reviewed in this run)
  - .specify/templates/tasks-template.md ⚠ pending manual check (not reviewed in this run)
- Follow-up TODOs: none
-->

# Finance App Constitution
<!-- App de finanzas personales: monolito modular en Next.js + PostgreSQL -->

## Core Principles

### I. TypeScript Estricto en Todo el Stack
Todo el código del proyecto — web, servidor, lógica de negocio y, en el futuro, móvil —
DEBE escribirse en TypeScript con `strict` habilitado. No se permite `any` implícito ni
deshabilitar el chequeo de tipos para evitar errores de compilación. Un solo lenguaje en
todo el stack reduce el costo de compartir código entre `apps/web` y un futuro cliente
móvil en Expo/React Native.

### II. Núcleo de Dominio Aislado (packages/core)
La lógica financiera (casos de uso, reglas de negocio, cálculos) DEBE vivir en
`packages/core` y NO DEBE depender de Next.js, de un ORM concreto ni de la base de datos.
El acceso a datos se realiza a través de repositorios con interfaces definidas en `core`;
las implementaciones concretas (Drizzle, PostgreSQL) viven fuera de `core` e implementan
esas interfaces. Las dependencias solo fluyen hacia abajo: la interfaz llama a los casos de
uso, y estos a los repositorios — nunca al revés. Esto mantiene la app como un monolito
modular fácil de mantener para un solo usuario, con límites claros para poder crecer
(agregar ahorro, préstamos, etc.) sin reescribir lo existente.

### III. Dinero como Enteros
Todo monto monetario DEBE almacenarse y operarse como un entero en la unidad mínima de la
moneda (p. ej. centavos o pesos sin decimales), acompañado siempre de su campo `currency`
(COP por defecto). Está prohibido usar `float`/`decimal` de punto flotante para cálculos
financieros. Esta regla evita errores de redondeo que son inaceptables en una app de
finanzas personales.

### IV. Pruebas Obligatorias en el Dominio (NON-NEGOTIABLE)
Toda lógica en `packages/core` (cálculos, generación de ocurrencias, reglas de negocio)
DEBE tener pruebas unitarias con Vitest antes de considerarse completa. Cada criterio de
aceptación de un spec se traduce en al menos una prueba automatizada. Los flujos clave de
usuario (registrar gasto, marcar pago, ver reporte) DEBEN estar cubiertos por pruebas
end-to-end con Playwright. Un PR que añade o modifica lógica de dominio sin pruebas no se
considera terminado.

### V. Separación entre Plantilla y Ocurrencia
El diseño central de gastos fijos separa la **plantilla** (definición recurrente: nombre,
monto estimado, día de pago, frecuencia) de su **ocurrencia** mensual (instancia concreta
con estado pendiente/pagado/omitido). Las reglas derivadas de este principio son
innegociables:
- Marcar una ocurrencia como pagada crea su transacción asociada; desmarcarla la elimina.
  El checklist y los reportes nunca deben contradecirse entre sí.
- La generación de ocurrencias del mes DEBE ser idempotente: ejecutarla dos veces no
  duplica registros.
- Cambiar el monto o los datos de una plantilla solo afecta ocurrencias futuras; el
  historial ya generado no se reescribe.
- Los reportes se calculan desde `transactions` (lo real ya ejecutado) y desde
  `bill_occurrences` (lo pendiente), nunca desde la plantilla directamente.

### VI. Código en Inglés
Todo artefacto de código — nombres de variables, funciones, métodos, clases, tipos,
interfaces, archivos, tablas y columnas de base de datos, mensajes de commit y comentarios
en el código — DEBE escribirse en inglés, incluso aunque el dominio del negocio (gastos,
ingresos, cuentas) sea en español. Los documentos de producto (esta constitución, los specs,
planes y tareas en `specs/`, y la guía del proyecto) SÍ pueden permanecer en español, porque
están dirigidos al único usuario/dueño del proyecto. Esta separación evita mezclar dos
idiomas dentro del mismo código fuente (p. ej. `montoEstimado` junto a `dueDate`), lo cual
dificulta la lectura y el mantenimiento, y mantiene el código consistente con el ecosistema
de librerías (TypeScript, Next.js, Drizzle) con el que convive.

## Modelo de Datos y Multiusuario

- La base de datos es PostgreSQL, elegida por ser relacional y adecuada para reportes y
  agregaciones por mes y categoría.
- Aunque el sistema tiene un único usuario real hoy, toda tabla de dominio DEBE incluir
  `user_id`, además de `id`, `created_at` y `updated_at`. Esto evita una reescritura si en
  el futuro la app se comparte con más personas, a cambio de cero complejidad adicional
  ahora (no se implementan roles, permisos ni invitaciones en el MVP).
- El acceso a la aplicación se restringe a un correo autorizado (autenticación vía Auth.js
  o Supabase Auth); no se construye un flujo de registro abierto.

## Flujo de Desarrollo Guiado por Specs (SDD)

- Toda funcionalidad nueva DEBE empezar como un spec en `specs/NNN-nombre/spec.md` antes de
  escribir código. El spec es la fuente de verdad: si el comportamiento cambia, el spec
  cambia primero.
- El flujo por funcionalidad es: Constitución (este documento, una sola vez) → Spec (qué y
  por qué, sin tecnología) → Plan (cómo: módulos de `core`, tablas, migraciones, pantallas)
  → Tareas (pasos pequeños, cada uno con su prueba) → Implementación tarea por tarea →
  Verificación del PR contra el spec.
- El Plan de cada spec DEBE demostrar cumplimiento de esta constitución antes de pasar a
  Tareas; cualquier desviación (p. ej. lógica de negocio fuera de `core`, montos en
  decimal) DEBE justificarse explícitamente o rechazarse.
- Fuera del MVP (fases 0-2: cimientos, categorías y cuentas, gastos fijos y checklist,
  gastos variables e ingresos, reporte mensual) no se construyen presupuestos, metas,
  gráficos avanzados, notificaciones, importación de extractos ni app móvil nativa hasta
  que les llegue su turno como specs nuevos.
- Cada spec DEBE desarrollarse en su propia rama de git, nombrada `feature/NNN-nombre`
  usando el mismo número y sufijo del directorio `specs/NNN-nombre/` (p. ej. el spec
  `specs/001-cimientos/` se trabaja en la rama `feature/001-cimientos`). La rama se crea
  desde `main` antes de generar el spec (o inmediatamente después, si se generó primero) y
  concentra el spec, el plan, las tareas y la implementación de esa funcionalidad hasta que
  se fusiona a `main` vía Pull Request. No se mezclan cambios de dos specs distintos en la
  misma rama.

## CI/CD y Entornos Reproducibles

- El pipeline de CI (GitHub Actions) DEBE ejecutar lint, pruebas de `packages/core`
  (Vitest) y pruebas end-to-end (Playwright) dentro de contenedores Docker, usando Docker
  Compose para levantar los servicios necesarios (p. ej. PostgreSQL) tanto en CI como en
  desarrollo local. Esto garantiza que el entorno donde corre CI sea el mismo que usa
  cualquier desarrollador localmente, evitando el clásico "en mi máquina sí funciona".
- El repositorio DEBE incluir un `docker-compose.yml` (u override para CI) que levante como
  mínimo la base de datos de desarrollo/pruebas; el workflow de GitHub Actions DEBE
  invocar `docker compose` para construir y ejecutar los mismos contenedores antes de correr
  lint y pruebas, en lugar de instalar dependencias de sistema directamente en el runner.
- El despliegue a producción (Vercel) es independiente de este pipeline de verificación:
  Docker/Docker Compose se usan para CI y desarrollo local, no para el hosting de la app
  desplegada.

## Governance

- Esta constitución tiene prioridad sobre cualquier otra práctica, plantilla o preferencia
  individual de implementación. Ante un conflicto, la constitución gana.
- Cualquier Plan (`plan.md`) o Pull Request DEBE verificar cumplimiento de los Core
  Principles antes de fusionarse. Una violación DEBE quedar documentada y justificada en el
  Plan correspondiente, o el diseño DEBE ajustarse para cumplir la constitución.
- Enmiendas: se proponen editando este archivo, indicando el principio o sección afectada y
  el motivo. El tipo de versión sigue semver:
  - MAJOR: eliminación o redefinición incompatible de un principio existente.
  - MINOR: adición de un nuevo principio o sección, o expansión material de una guía
    existente.
  - PATCH: aclaraciones, redacción, correcciones sin cambio de significado.
- La complejidad no justificada (nuevas dependencias, capas o abstracciones que no sirven
  al MVP) DEBE cuestionarse en la revisión del Plan antes de implementarse.

**Version**: 1.3.0 | **Ratified**: 2026-09-28 | **Last Amended**: 2026-09-29
