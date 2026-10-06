# Feature Specification: Categorías de Gastos y Shell Visual

**Feature Branch**: `feature/003-categorias-gastos`

**Created**: 2026-10-06

**Status**: Implemented

**Input**: User description: "Módulo para guardar los gastos de los usuarios. Existen diferentes tipos de categorías (suscripciones mensuales, obligaciones del hogar, viajes, gastos fijos, gastos hormiga). Esta tarea crea un ABM de categorías administrado por cada usuario. Incluye un menú con Categories y Log out, un diseño de dashboard orientado a finanzas personales, y el diseño visual de login, menú y página de Categories."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administrar mis categorías de gastos (Priority: P1)

Como usuario, quiero crear, ver, editar y eliminar mis categorías de gasto, cada una con nombre,
tipo, color e ícono, de modo que pueda organizar mis gastos a mi manera.

**Why this priority**: Es el objetivo de la tarea y la base para registrar gastos en specs futuras.

**Independent Test**: Iniciar sesión, abrir Categories, crear una categoría, editarla y eliminarla.

**Acceptance Scenarios**:

1. **Given** que no tengo categorías, **When** abro Categories, **Then** veo un estado vacío con
   una acción para crear la primera.
2. **Given** el formulario de creación, **When** ingreso nombre, tipo, color e ícono válidos,
   **Then** la categoría aparece en la lista agrupada por su tipo.
3. **Given** una categoría existente, **When** cambio su nombre, tipo, color o ícono, **Then** la
   lista refleja los cambios.
4. **Given** una categoría existente, **When** la elimino y confirmo, **Then** desaparece de la
   lista.
5. **Given** una categoría llamada `Netflix`, **When** intento crear otra llamada `netflix`,
   **Then** se rechaza con un mensaje de nombre duplicado.
6. **Given** un nombre vacío o de más de 40 caracteres, **When** intento guardar, **Then** se
   rechaza con un mensaje de validación.

---

### User Story 2 - Mis categorías son solo mías (Priority: P1)

Como usuario, quiero que nadie más vea ni modifique mis categorías, de modo que mis datos
financieros sean privados.

**Why this priority**: Requisito de multiusuario de la constitución; sin esto no se puede
lanzar el módulo.

**Independent Test**: Dos usuarios crean categorías con el mismo nombre; cada uno solo ve las suyas
y no puede editar ni borrar las del otro.

**Acceptance Scenarios**:

1. **Given** dos usuarios con categorías, **When** uno lista sus categorías, **Then** solo ve las
   propias.
2. **Given** el identificador de una categoría ajena, **When** intento editarla o eliminarla,
   **Then** la operación no tiene efecto.
3. **Given** que no tengo sesión, **When** intento cualquier operación de categorías, **Then**
   se rechaza.

---

### User Story 3 - Navegar con menú y cerrar sesión (Priority: P2)

Como usuario, quiero un menú lateral con Categories y Log out, y una pantalla de inicio tipo
dashboard, de modo que pueda moverme por la app y salir de forma segura.

**Why this priority**: Da estructura a la app, pero el valor de negocio está en US1.

**Independent Test**: Iniciar sesión, ver el dashboard, ir a Categories desde el menú y cerrar sesión.

**Acceptance Scenarios**:

1. **Given** que inicié sesión, **When** llego a `/`, **Then** veo el dashboard con el menú y mi usuario.
2. **Given** el menú, **When** elijo Categories, **Then** llego a la página de categorías.
3. **Given** el menú, **When** elijo Log out, **Then** mi sesión termina y soy redirigido a login.
4. **Given** un teléfono móvil, **When** abro la app, **Then** el menú es accesible y el contenido
   no requiere scroll horizontal.

---

### User Story 4 - Diseño visual coherente del login (Priority: P3)

Como usuario, quiero que la pantalla de login tenga el mismo diseño que el resto de la app.

**Why this priority**: Coherencia visual; no cambia el comportamiento del login de la spec 002.

**Independent Test**: Las pruebas e2e de login de la spec 002 siguen pasando.

**Acceptance Scenarios**:

1. **Given** la pantalla de login, **When** la abro, **Then** se ve con el sistema visual de la app y
   conserva etiquetas, campos y mensaje de error de la spec 002.

### Edge Cases

- Nombre con espacios al inicio o final: se recorta antes de validar y guardar.
- Dos usuarios pueden tener una categoría con el mismo nombre.
- Tipo, color o ícono fuera de las opciones permitidas: se rechazan.
- Editar una categoría para que su nombre choque con otra propia: se rechaza.
- Sesión expirada durante una operación: se rechaza y se redirige a login.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir a un usuario autenticado crear, listar, editar y eliminar categorías propias.
- **FR-002**: Cada categoría MUST tener nombre (1–40 caracteres tras recortar), tipo, color e ícono.
- **FR-003**: El tipo MUST ser uno de: suscripción, hogar, viaje, gasto fijo, gasto hormiga, otro.
- **FR-004**: El color MUST ser uno de una paleta definida y el ícono uno de una lista cerrada.
- **FR-005**: El nombre MUST ser único por usuario sin distinguir mayúsculas y minúsculas.
- **FR-006**: Toda operación MUST estar limitada a las categorías del usuario de la sesión.
- **FR-007**: La tabla de categorías MUST incluir `id`, `user_id`, `created_at` y `updated_at`.
- **FR-008**: La app autenticada MUST tener un menú con Categories y Log out.
- **FR-009**: Log out MUST terminar la sesión y redirigir a login.
- **FR-010**: La página de inicio MUST mostrar un dashboard con datos reales de categorías y
  espacios de gasto claramente marcados como pendientes (sin datos inventados).
- **FR-011**: Login, menú, dashboard y Categories MUST compartir un mismo sistema visual y ser responsivos.
- **FR-012**: El comportamiento del login de la spec 002 MUST mantenerse sin cambios.

### Assumptions

- Las categorías no se comparten entre usuarios.
- No existe aún el módulo de gastos, por lo que eliminar una categoría es un borrado definitivo.
  Cuando existan gastos, se deberá restringir o reasignar (spec futura).
- No se crean categorías sugeridas automáticamente (posible mejora futura).
- Textos de la interfaz en inglés, como el login actual.

## Success Criteria *(mandatory)*

- **SC-001**: Un usuario crea, edita y elimina una categoría en menos de un minuto sin ayuda.
- **SC-002**: Ningún usuario puede leer ni modificar categorías de otro (verificado por pruebas).
- **SC-003**: Las pruebas existentes de login siguen pasando.
- **SC-004**: Las pantallas se usan sin scroll horizontal desde 360 px de ancho.
