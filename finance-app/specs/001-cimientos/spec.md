# Feature Specification: Cimientos del Proyecto

**Feature Branch**: `feature/001-cimientos`

**Created**: 2026-09-29

**Status**: Draft

**Input**: User description: "Cimientos del proyecto: crear el monorepo (apps/web, packages/core, packages/db) con pnpm workspaces + Turborepo, configurar TypeScript estricto, ESLint, Prettier y Vitest, crear la base de datos en PostgreSQL (Supabase o Neon) con la primera migración vía Drizzle, y desplegar una página "hola mundo" vacía en Vercel con login restringido a un correo autorizado. El criterio de listo es tener el repositorio desplegado y accesible solo para ese usuario, sin funcionalidad de negocio todavía."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Acceder a una app propia y vacía en producción (Priority: P1)

Como único usuario de la app de finanzas personales, quiero abrir una URL pública y encontrar
una página funcionando (aunque no haga nada de negocio todavía), protegida para que solo yo
pueda entrar, de modo que sepa que el proyecto tiene una base real desplegada sobre la cual
construir cada funcionalidad futura.

**Why this priority**: Sin un esqueleto desplegado y accesible, ningún spec posterior
(categorías, gastos fijos, reportes) tiene dónde vivir. Es el prerrequisito de todo el MVP.

**Independent Test**: Se puede probar por completo visitando la URL pública del proyecto:
si no hay sesión iniciada, se pide autenticación; tras autenticarse con el correo autorizado,
se ve una página de bienvenida. Ese flujo entrega valor por sí solo (confirma que "el
proyecto existe y es mío") sin depender de ninguna otra funcionalidad.

**Acceptance Scenarios**:

1. **Given** que visito la URL pública del proyecto sin sesión iniciada, **When** la página
   carga, **Then** se me pide autenticarme antes de ver cualquier contenido.
2. **Given** que me autentico con el correo autorizado del proyecto, **When** el login se
   completa, **Then** veo una página de bienvenida ("hola mundo") sin errores.
3. **Given** que alguien intenta autenticarse con un correo distinto al autorizado,
   **When** intenta iniciar sesión, **Then** el acceso es rechazado y no ve contenido de la
   aplicación.

---

### User Story 2 - Confiar en que el código compila y pasa pruebas antes de crecer (Priority: P2)

Como responsable único del proyecto, quiero que el repositorio tenga una estructura de
monorepo con typing estricto, linting, formateo y un framework de pruebas ya configurados y
verdes, de modo que cada spec siguiente (categorías, gastos fijos, etc.) empiece sobre una
base consistente en vez de tener que configurar herramientas básicas cada vez.

**Why this priority**: Es la base técnica que hace cumplible la constitución del proyecto
(TypeScript estricto, dominio en `packages/core` aislado, pruebas obligatorias). Sin esto,
los specs de negocio no tendrían dónde aplicar sus reglas ni cómo verificarse.

**Independent Test**: Se puede probar clonando el repositorio y ejecutando los comandos de
build, lint y test del monorepo: deben completarse sin errores aunque no exista lógica de
negocio todavía, confirmando que la base está lista para recibir código.

**Acceptance Scenarios**:

1. **Given** el repositorio recién clonado, **When** se instalan las dependencias del
   monorepo, **Then** la instalación termina sin errores.
2. **Given** las dependencias instaladas, **When** se ejecuta el comando de build de todo el
   monorepo, **Then** los tres paquetes (`apps/web`, `packages/core`, `packages/db`)
   compilan sin errores de tipos.
3. **Given** las dependencias instaladas, **When** se ejecuta el comando de pruebas, **Then**
   la suite de pruebas (aunque mínima) corre y pasa en verde.
4. **Given** un archivo con una violación deliberada de estilo, **When** se ejecuta el
   comando de lint, **Then** el linter reporta el error y falla el chequeo.

---

### User Story 3 - Tener una base de datos real con historial de cambios versionado (Priority: P3)

Como responsable único del proyecto, quiero que exista una base de datos PostgreSQL
accesible desde la app, con su primera migración aplicada y versionada en el repositorio,
de modo que los specs de negocio futuros puedan agregar sus propias tablas mediante nuevas
migraciones en lugar de crear el esquema a mano.

**Why this priority**: Habilita a los specs de negocio (categorías, cuentas, gastos fijos)
a modelar datos desde el día uno, pero no bloquea poder ver la página "hola mundo" en
producción, por eso queda después de P1 y P2.

**Independent Test**: Se puede probar aplicando la migración inicial contra una base de
datos vacía y verificando, mediante una consulta simple, que el esquema resultante existe;
esto entrega valor de forma independiente aunque la web todavía no lea ni escriba en esas
tablas.

**Acceptance Scenarios**:

1. **Given** una base de datos PostgreSQL vacía, **When** se aplica la migración inicial del
   proyecto, **Then** el esquema resultante queda creado sin errores.
2. **Given** que se aplica la misma migración inicial dos veces, **When** se corre el proceso
   de migración, **Then** el sistema no falla ni duplica cambios ya aplicados (es
   idempotente a nivel de historial de migraciones).
3. **Given** la app desplegada, **When** se revisa su configuración, **Then** la cadena de
   conexión apunta a la base de datos real del proyecto (no a una base de datos local o de
   ejemplo).

---

### Edge Cases

- ¿Qué pasa si alguien visita la URL pública mientras el despliegue está en curso o falló?
  Debe mostrarse un estado de error reconocible, no una página en blanco o un error genérico
  del servidor sin contexto.
- ¿Qué pasa si el correo autorizado cambia de mayúsculas/minúsculas o tiene espacios al
  autenticarse? El sistema debe normalizar el correo antes de compararlo con el autorizado.
- ¿Qué pasa si la conexión a la base de datos falla al iniciar la app? La app debe fallar de
  forma visible en el despliegue (no debe quedar "medio funcionando" sin persistencia).
- ¿Qué pasa si se ejecuta el build o las pruebas sin haber instalado las dependencias? El
  comando debe fallar con un mensaje claro, no con un error críptico.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El repositorio MUST estar organizado como un monorepo con al menos tres
  paquetes: uno de interfaz/servidor web, uno de lógica de dominio aislada, y uno de acceso
  a datos/migraciones, conforme a la arquitectura de monolito modular ya decidida para el
  proyecto.
- **FR-002**: Todo el código del monorepo MUST compilar bajo un modo de tipado estricto, sin
  errores de tipos y sin `any` implícito.
- **FR-003**: El monorepo MUST tener un comando único de "lint" que revise el estilo de todo
  el código y falle si encuentra violaciones.
- **FR-004**: El monorepo MUST tener un comando único de "test" que ejecute la suite de
  pruebas de la lógica de dominio y termine en verde antes de considerarse listo.
- **FR-005**: El paquete de lógica de dominio MUST poder compilarse y probarse de forma
  aislada, sin requerir el framework web ni una conexión real a base de datos para correr
  sus pruebas.
- **FR-006**: El sistema MUST tener una base de datos relacional real (no una base de datos
  local de un solo desarrollador sin respaldo) con al menos una migración inicial aplicada y
  versionada como archivo en el repositorio.
- **FR-007**: El proceso de aplicar migraciones MUST poder ejecutarse repetidamente sin
  duplicar ni corromper el esquema ya aplicado.
- **FR-008**: El sistema MUST estar desplegado en una URL pública accesible desde internet.
- **FR-009**: El sistema MUST exigir autenticación antes de mostrar cualquier contenido de
  la aplicación; no debe existir una vista de la app accesible sin sesión iniciada.
- **FR-010**: El sistema MUST restringir el acceso exclusivamente a un único correo
  autorizado, configurable sin cambiar código (por variable de entorno o configuración
  equivalente); cualquier otro correo MUST ser rechazado.
- **FR-011**: Tras autenticarse con el correo autorizado, el sistema MUST mostrar una página
  de bienvenida simple, sin funcionalidad de negocio (sin categorías, gastos, reportes ni
  ninguna otra funcionalidad de specs futuros).
- **FR-012**: El estado de "cimientos listo" MUST ser verificable de punta a punta: alguien
  externo al autor puede clonar el repositorio, instalarlo, correr build/lint/test en verde,
  y por separado visitar la URL desplegada y confirmar el flujo de login descrito en
  User Story 1.

### Key Entities

- **Usuario autorizado**: la única identidad permitida para entrar a la aplicación,
  identificada por su correo electrónico. No tiene otros atributos de negocio en este
  spec; los atributos de dominio (cuentas, categorías, etc.) se definen en specs futuros.
- **Migración de base de datos**: cambio versionado y ordenado sobre el esquema de la base
  de datos; este spec solo requiere que exista la migración inicial (esquema vacío o
  mínimo), sin tablas de negocio todavía.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una persona que no participó en la configuración puede clonar el repositorio y
  dejar el monorepo instalado, compilado, con lint y pruebas en verde en menos de 15 minutos
  siguiendo únicamente instrucciones escritas en el repositorio.
- **SC-002**: El 100% de los intentos de acceso con un correo distinto al autorizado son
  rechazados, verificado con al menos tres intentos de prueba con correos diferentes.
- **SC-003**: La página de bienvenida carga correctamente (sin errores visibles) en el 100%
  de las visitas realizadas tras un login exitoso durante la verificación manual de este
  spec.
- **SC-004**: La migración inicial de base de datos puede aplicarse dos veces seguidas sobre
  el mismo entorno sin producir errores ni cambios duplicados.
- **SC-005**: Ningún criterio de aceptación de este spec depende de que exista todavía una
  sola funcionalidad de negocio (categorías, cuentas, gastos, ingresos o reportes).

## Assumptions

- El correo autorizado es el del único usuario real del proyecto (brandonellocomu@gmail.com)
  y se configura como variable de entorno del despliegue, no hardcodeado en el código fuente.
- La base de datos PostgreSQL corre en un proveedor con plan gratuito (Supabase o Neon, según
  decisión ya tomada en la guía del proyecto); la elección final entre ambos no cambia
  ningún criterio de aceptación de este spec.
- El despliegue público se realiza en el proveedor ya decidido para el proyecto (Vercel);
  este spec no evalúa alternativas de hosting.
- "Página de bienvenida" significa una vista mínima sin necesidad de diseño visual definitivo;
  el pulido de UI queda fuera de alcance de este spec.
- No se requieren pruebas end-to-end automatizadas en este spec; la verificación del flujo de
  login se hace manualmente como parte del criterio de listo (se formalizarán con Playwright
  a partir del spec de checklist mensual, según la constitución del proyecto).
