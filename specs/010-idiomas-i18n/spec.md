# Feature Specification: Cambio de idioma (inglés / español)

**Feature Branch**: `feature/010-idiomas-i18n`

**Created**: 2026-10-09

**Status**: Draft

**Input**: User description: "Agregar la opción de cambiar el idioma de la aplicación usando i18n para todos los textos de la interfaz (páginas, formularios, mensajes de validación y de error). Solo deben existir dos idiomas: inglés y español."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cambiar el idioma desde la interfaz (Priority: P1)

Como persona usuaria quiero elegir entre inglés y español con un control visible en la aplicación, y que al hacerlo todos los textos de la pantalla cambien de inmediato al idioma elegido.

**Why this priority**: Es el núcleo de la funcionalidad. Sin el selector y el cambio efectivo de textos no hay valor entregado; con solo esto ya hay un MVP usable.

**Independent Test**: Abrir la aplicación, usar el selector de idioma y comprobar que los textos de la pantalla actual (títulos, botones, etiquetas, mensajes vacíos) pasan al idioma elegido sin perder la sesión ni los datos.

**Acceptance Scenarios**:

1. **Given** la aplicación está en inglés, **When** la persona elige "Español" en el selector, **Then** todos los textos de la pantalla actual se muestran en español.
2. **Given** la aplicación está en español, **When** la persona elige "English", **Then** todos los textos de la pantalla actual se muestran en inglés.
3. **Given** la persona navega a otra sección después de cambiar el idioma, **When** carga la nueva pantalla, **Then** esta también aparece en el idioma elegido.
4. **Given** el selector de idioma, **When** se despliega, **Then** ofrece únicamente dos opciones: inglés y español, cada una nombrada en su propio idioma.

---

### User Story 2 - Que la elección se recuerde (Priority: P2)

Como persona usuaria quiero que la aplicación recuerde mi idioma, para no tener que elegirlo cada vez que entro o recargo la página.

**Why this priority**: Evita repetir la acción en cada visita; mejora mucho la experiencia pero la funcionalidad base ya sirve sin ello.

**Independent Test**: Elegir un idioma, recargar la página, cerrar sesión y volver a entrar, y comprobar que se mantiene el idioma elegido.

**Acceptance Scenarios**:

1. **Given** la persona eligió español, **When** recarga la página o cierra y vuelve a abrir el navegador, **Then** la aplicación sigue en español.
2. **Given** una persona que nunca eligió idioma, **When** abre la aplicación por primera vez, **Then** se muestra en el idioma de su navegador si es inglés o español, y en inglés en cualquier otro caso.
3. **Given** la persona está en la pantalla de inicio de sesión, **When** cambia el idioma, **Then** la pantalla se traduce y el idioma se conserva después de iniciar sesión.

---

### User Story 3 - Validaciones y errores también traducidos (Priority: P2)

Como persona usuaria quiero que los mensajes de validación (campo requerido, longitud máxima, valores inválidos) y los errores (nombre duplicado, categoría en uso, credenciales incorrectas, fallos generales) aparezcan en el idioma que elegí.

**Why this priority**: Un mensaje de error en otro idioma rompe la experiencia y dificulta corregir el problema; es parte de "todos los textos".

**Independent Test**: Con la app en cada idioma, provocar un error de validación y un error de servidor (por ejemplo, crear una categoría sin nombre y otra con nombre repetido) y comprobar que ambos mensajes están en el idioma activo.

**Acceptance Scenarios**:

1. **Given** la app en español, **When** se envía un formulario con un campo requerido vacío, **Then** el mensaje de error está en español.
2. **Given** la app en inglés, **When** se intenta crear una categoría con un nombre ya existente, **Then** el mensaje de error está en inglés.
3. **Given** la persona cambia de idioma con un mensaje de error visible, **When** el idioma cambia, **Then** el mensaje se muestra en el nuevo idioma o desaparece sin quedar mezclado.

---

### User Story 4 - Cobertura completa y sin mezclas (Priority: P3)

Como persona usuaria quiero que no queden textos sueltos en el otro idioma en ninguna parte de la aplicación (menús, tablas, diálogos de confirmación, estados vacíos, etiquetas de accesibilidad, títulos de pestaña).

**Why this priority**: Es el pulido que garantiza la promesa de "todos los textos"; se puede entregar por módulos una vez existe la base.

**Independent Test**: Recorrer cada pantalla en ambos idiomas y verificar que no aparece ningún texto de interfaz en el idioma equivocado ni una clave técnica sin traducir.

**Acceptance Scenarios**:

1. **Given** la app en español, **When** se recorren todas las pantallas (inicio, categorías, gastos mensuales, deudas, ingresos, balance, viajes, inicio de sesión), **Then** ningún texto fijo de la interfaz aparece en inglés.
2. **Given** la app en inglés, **When** se recorren las mismas pantallas, **Then** ningún texto fijo aparece en español.

---

### Edge Cases

- Una traducción falta en el idioma elegido: se muestra el texto en inglés en lugar de una clave técnica o un espacio vacío.
- El idioma guardado no es uno de los dos soportados (valor alterado): se ignora y se aplica la regla por defecto.
- Los datos escritos por la persona (nombres de categorías, descripciones, notas, nombres de personas de un viaje) NO se traducen; se muestran tal como se escribieron.
- Los nombres de los tipos fijos del sistema (por ejemplo tipos de categoría o estados) sí se traducen, pero los datos guardados no cambian.
- Formatos de fecha, número y moneda siguen el idioma elegido; los montos siguen siendo pesos colombianos (COP) en ambos casos.
- Cambiar de idioma con un formulario a medio llenar no borra lo que la persona ya escribió.
- Mensajes de error generados en el servidor (acciones fallidas) también respetan el idioma activo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE soportar exactamente dos idiomas de interfaz: inglés y español; no DEBE ofrecer ningún otro.
- **FR-002**: El sistema DEBE ofrecer un selector de idioma visible y accesible desde cualquier pantalla, incluida la de inicio de sesión.
- **FR-003**: Al elegir un idioma, el sistema DEBE mostrar todos los textos de la interfaz en ese idioma sin cerrar la sesión ni perder datos no guardados.
- **FR-004**: El sistema DEBE traducir todos los textos fijos de la interfaz: títulos, menús, botones, etiquetas, marcadores de posición, estados vacíos, diálogos de confirmación, textos de accesibilidad y títulos de página.
- **FR-005**: El sistema DEBE traducir todos los mensajes de validación y de error, tanto los generados en pantalla como los devueltos por el servidor.
- **FR-006**: El sistema DEBE recordar el idioma elegido entre visitas y entre sesiones en el mismo navegador.
- **FR-007**: Cuando no exista una elección previa, el sistema DEBE usar el idioma del navegador si es inglés o español, y el inglés en cualquier otro caso.
- **FR-008**: Si falta una traducción, el sistema DEBE mostrar el texto en inglés en lugar de una clave técnica.
- **FR-009**: El sistema NO DEBE traducir ni modificar los datos introducidos por la persona usuaria.
- **FR-010**: El sistema DEBE dar formato a fechas y números según el idioma activo, manteniendo la moneda COP.
- **FR-011**: Todo texto nuevo que se agregue a la interfaz DEBE existir en ambos idiomas; el proyecto DEBE tener una comprobación automática que detecte claves presentes en un idioma y ausentes en el otro.
- **FR-012**: Los identificadores, claves y comentarios del código siguen en inglés (constitución, principio VI); solo el contenido de las traducciones depende del idioma.

### Key Entities *(include if feature involves data)*

- **Idioma**: uno de los dos valores permitidos (inglés, español); identifica el idioma de la interfaz activo.
- **Preferencia de idioma**: la elección de la persona (o ausencia de ella) que determina el idioma al abrir la aplicación.
- **Catálogo de traducciones**: conjunto de textos de interfaz y mensajes, con una entrada equivalente por cada idioma.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una persona puede cambiar de idioma en 2 clics o menos desde cualquier pantalla.
- **SC-002**: El 100 % de los textos fijos de la interfaz y de los mensajes de validación/error existen en ambos idiomas.
- **SC-003**: Al recorrer todas las pantallas en cada idioma, se encuentran 0 textos de interfaz en el idioma equivocado y 0 claves técnicas visibles.
- **SC-004**: El idioma elegido se conserva en el 100 % de las recargas y reinicios de sesión en el mismo navegador.
- **SC-005**: El cambio de idioma se refleja en pantalla en menos de 1 segundo percibido, sin perder datos escritos en formularios.

## Assumptions

- La preferencia se guarda por navegador (no en la cuenta de la persona) en esta primera versión; sincronizarla entre dispositivos queda fuera de alcance.
- El idioma por defecto cuando no hay señal del navegador es el inglés.
- Los textos de la interfaz actuales están en inglés y ese contenido es la base de la traducción al español.
- El selector se presenta sin recargar el sitio completo y está disponible también antes de iniciar sesión.
- La moneda sigue siendo COP únicamente; este cambio no introduce multimoneda.
- Las traducciones al español las redacta el equipo del proyecto y se revisan antes de publicarse; no se usa traducción automática en tiempo de ejecución.
- Correos u otras notificaciones externas no existen hoy en la aplicación y quedan fuera de alcance.
- Fuera de alcance: más de dos idiomas, escritura de derecha a izquierda, traducción de datos escritos por la persona.
