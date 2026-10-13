# Feature Specification: Carga masiva de gastos por mes (CSV)

**Feature Branch**: `feature/011-carga-masiva-gastos`

**Created**: 2026-10-09

**Status**: Draft

**Input**: User description: "Carga masiva de gastos por mes desde un archivo CSV. Elegir un mes (p. ej. junio o julio de este año), descargar una plantilla con una fila por cada categoría actual, llenarla y subirla para registrar los gastos de ese mes y tener trazabilidad anual. Los pagos cargados son independientes: el archivo no puede asociarlos a un pago padre."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Descargar la plantilla con mis categorías (Priority: P1)

Como persona usuaria quiero descargar un archivo CSV que ya traiga una fila por cada una de mis categorías actuales, para solo tener que escribir los montos de un mes pasado sin tipear nombres de categoría.

**Why this priority**: Sin una plantilla correcta el usuario no puede preparar el archivo; es la entrada de todo el flujo.

**Independent Test**: Con varias categorías creadas, descargar la plantilla y comprobar que abre en una hoja de cálculo con los encabezados esperados y exactamente una fila por categoría propia (con acentos y comas bien conservados).

**Acceptance Scenarios**:

1. **Given** el usuario tiene categorías, **When** pulsa "Descargar plantilla", **Then** recibe un archivo CSV con los encabezados `category, amount, paidOn, note` y una fila por cada una de sus categorías, con el monto, la fecha y la nota vacíos.
2. **Given** el usuario agregó o renombró una categoría, **When** descarga la plantilla de nuevo, **Then** el archivo refleja las categorías actuales.
3. **Given** otro usuario tiene categorías propias, **When** el primero descarga la plantilla, **Then** no aparece ninguna categoría ajena.
4. **Given** el usuario no tiene categorías, **When** descarga la plantilla, **Then** recibe el archivo solo con encabezados.

---

### User Story 2 - Cargar los gastos de un mes (Priority: P1)

Como persona usuaria quiero elegir un mes (por ejemplo junio o julio de este año), subir el CSV lleno y, tras ver una vista previa, confirmar para que los gastos queden registrados en ese mes.

**Why this priority**: Es el objetivo central: tener el histórico del año con trazabilidad.

**Independent Test**: Llenar la plantilla con montos para tres categorías, elegir el mes 2026-06, subir, revisar la vista previa y confirmar; los tres gastos aparecen en la lista de ese mes y sus totales cuentan en el resumen del mes.

**Acceptance Scenarios**:

1. **Given** un CSV válido y el mes elegido, **When** sube el archivo, **Then** se muestra una vista previa con la cantidad de gastos y el total, sin haber guardado nada aún.
2. **Given** la vista previa, **When** confirma, **Then** todos los gastos se crean en el mes elegido, quedan visibles en esa lista mensual y se informa cuántos se crearon.
3. **Given** filas con el monto vacío, **When** se procesa el archivo, **Then** esas filas se ignoran sin error y no se crean gastos para ellas.
4. **Given** varias filas de la misma categoría, **When** se confirma, **Then** se crea un gasto por cada fila.
5. **Given** una fila con fecha de pago, **When** se confirma, **Then** el gasto queda como pagado en esa fecha; **Given** una fila sin fecha, **Then** queda pendiente.
6. **Given** el mes elegido ya tiene gastos, **When** sube el archivo, **Then** la vista previa muestra un aviso de que el mes ya contiene gastos y que los nuevos se agregarán sin reemplazar ni borrar los existentes.
7. **Given** cualquier carga, **When** se confirma, **Then** todos los gastos creados son independientes (no están vinculados a ningún pago padre).

---

### User Story 3 - Corregir un archivo con errores (Priority: P2)

Como persona usuaria quiero que, si mi archivo tiene filas inválidas, no se guarde nada y se me indique exactamente qué corregir, para no terminar con una carga a medias.

**Why this priority**: Evita datos parciales y duplicados al reintentar; el flujo feliz funciona sin esto pero sería frágil.

**Independent Test**: Subir un archivo con una categoría inexistente y un monto no numérico; verificar que se listan ambos errores con línea y columna y que el mes no cambió.

**Acceptance Scenarios**:

1. **Given** una fila con una categoría que no existe entre las del usuario, **When** sube el archivo, **Then** aparece un reporte con la línea, la columna y el motivo, y no se guarda ningún gasto.
2. **Given** un monto no numérico, cero o negativo, una fecha inválida o una nota de más de 140 caracteres, **When** sube el archivo, **Then** cada problema se reporta con su línea y columna.
3. **Given** un archivo con una columna `parent`, `parentId` o cualquier columna desconocida, **When** sube el archivo, **Then** se rechaza indicando la columna no permitida y no se guarda nada, de modo que el archivo no puede asociar pagos a un pago padre.
4. **Given** un archivo sin los encabezados requeridos, vacío, sin filas con monto, de más de 500 filas o de más de 1 MB, **When** sube el archivo, **Then** se rechaza con un mensaje claro y no se guarda nada.
5. **Given** un reporte de errores, **When** el usuario corrige el archivo y lo vuelve a subir, **Then** el proceso continúa normalmente hasta la vista previa.

---

### Edge Cases

- Archivos guardados desde Excel con separador `;`, con BOM UTF-8 o con saltos de línea de Windows se interpretan correctamente.
- Nombres de categoría con acentos, comas o comillas se leen bien; el nombre se compara sin distinguir mayúsculas.
- Montos escritos como `1500000`, `1.500.000`, `1,500,000` o `$1.500.000` se aceptan como el mismo valor; decimales no se admiten (los montos son en pesos enteros).
- Una fecha de pago puede caer en un mes distinto al mes elegido (igual que al crear un gasto manualmente).
- Si el usuario confirma dos veces la misma carga, se duplican los gastos; la vista previa avisa cuando el mes ya tiene gastos.
- Si la sesión expira durante la carga, se informa y no se guarda nada.
- Si falla el guardado, no queda ningún gasto parcial del archivo.
- Meses sin formato válido no se aceptan.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir al usuario elegir el mes de destino de la carga, con valor inicial el mes que está viendo.
- **FR-002**: El sistema MUST ofrecer la descarga de una plantilla CSV con los encabezados `category, amount, paidOn, note` y una fila por cada categoría actual del propio usuario.
- **FR-003**: El sistema MUST aceptar un archivo CSV con separador coma o punto y coma, codificación UTF-8 con o sin BOM y campos entre comillas.
- **FR-004**: El sistema MUST identificar cada categoría por su nombre (sin distinguir mayúsculas) entre las categorías del propio usuario, y rechazar nombres desconocidos.
- **FR-005**: El sistema MUST aplicar a cada fila las mismas reglas de un gasto manual: monto entero positivo, fecha de pago opcional y válida, nota de máximo 140 caracteres.
- **FR-006**: El sistema MUST ignorar las filas con monto vacío y permitir varias filas por categoría.
- **FR-007**: El sistema MUST rechazar cualquier columna distinta de las cuatro permitidas, en particular cualquier referencia a un pago padre, y MUST crear todos los gastos cargados como independientes.
- **FR-008**: El sistema MUST validar el archivo completo antes de guardar y, si hay algún error, MUST NOT guardar ningún gasto, mostrando todos los errores con línea, columna y motivo.
- **FR-009**: El sistema MUST rechazar archivos vacíos, sin los encabezados requeridos, sin filas con monto, con más de 500 filas o con más de 1 MB.
- **FR-010**: El sistema MUST mostrar, antes de confirmar, una vista previa con la cantidad de gastos a crear, el total y un aviso si el mes destino ya tiene gastos.
- **FR-011**: El sistema MUST guardar todos los gastos del archivo como una sola operación atómica (todo o nada) al confirmar, y MUST volver a validar el archivo en ese momento.
- **FR-012**: La carga MUST solo agregar gastos; MUST NOT modificar, reemplazar ni borrar gastos existentes.
- **FR-013**: Tras la carga, los gastos MUST aparecer en la lista del mes elegido y MUST reflejarse en los totales y resúmenes que ya existen.
- **FR-014**: Toda la información y operaciones MUST estar limitadas al usuario autenticado; no se pueden usar categorías ni ver datos de otros usuarios.
- **FR-015**: Todos los textos, incluidos los motivos de error, MUST estar disponibles en inglés y español según el idioma elegido; los encabezados del CSV son fijos y no se traducen.

### Key Entities *(include if feature involves data)*

- **Archivo de carga**: CSV enviado por el usuario para un mes; contiene filas con categoría, monto, fecha de pago opcional y nota opcional. No se conserva tras la carga.
- **Fila de carga**: una línea del archivo que, si tiene monto, origina un gasto; tiene número de línea para el reporte de errores.
- **Gasto (existente)**: pago de un mes asociado a una categoría; los cargados quedan sin pago padre.
- **Categoría (existente)**: clasificación del usuario; define las filas de la plantilla.
- **Reporte de errores**: lista de problemas con línea, columna y motivo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede registrar los gastos de un mes completo (hasta 100 categorías) en menos de 5 minutos, desde descargar la plantilla hasta ver los gastos en la lista.
- **SC-002**: El 100 % de las cargas con errores termina sin ningún gasto guardado y con todos los errores del archivo indicados con línea y columna.
- **SC-003**: El 100 % de los gastos cargados quedan sin pago padre.
- **SC-004**: Un archivo de 500 filas válidas se valida y muestra su vista previa en menos de 5 segundos.
- **SC-005**: En una prueba de uso, el 90 % de los usuarios completa una carga correcta al primer intento usando solo la plantilla.
- **SC-006**: Tras cargar los 12 meses del año, los totales anuales coinciden exactamente con la suma de los archivos cargados.

## Assumptions

- La moneda es el peso colombiano con montos enteros, como en el resto de la aplicación.
- El mes destino se elige en pantalla; el archivo no contiene columna de mes.
- Solo se carga gastos; ingresos, deudas y viajes quedan fuera de alcance.
- No se ofrece reemplazar ni deshacer una carga; el usuario puede borrar gastos manualmente como hoy.
- No se detectan duplicados contra gastos ya existentes; solo se avisa si el mes ya tiene gastos.
- La descarga de la plantilla y la carga requieren sesión iniciada.
- No se guarda historial de archivos cargados.
- No requiere cambios en el modelo de datos existente.
