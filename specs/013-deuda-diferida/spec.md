# Feature Specification: Deuda diferida (dos tipos de deuda)

**Feature Branch**: `013-deuda-diferida`

**Created**: 2026-10-21

**Status**: Draft

**Input**: User description: "Modificar el módulo de deudas para soportar dos tipos de deuda: (1) la deuda actual por cuota mensual, donde el sistema calcula el valor total adeudado a partir de la cuota; y (2) una deuda diferida, donde el usuario configura el valor total y el número de meses a los que se difiere ese valor, y el sistema calcula la cuota mensual."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar una deuda diferida (Priority: P1)

Una persona compró algo por 1.200.000 COP y lo difirió a 12 meses. Al registrar la deuda elige el tipo "Valor total diferido", escribe el valor total, el número de meses y el primer mes de pago. El sistema calcula y muestra la cuota mensual antes de guardar, y la deuda queda registrada con su calendario de cuotas.

**Why this priority**: Es la capacidad nueva que se pide; sin ella la feature no existe.

**Independent Test**: Crear una deuda diferida de 1.200.000 COP a 12 meses desde enero, y verificar que la cuota mostrada es 100.000 COP, que la deuda aparece con 12 cuotas y un pendiente de 1.200.000 COP.

**Acceptance Scenarios**:

1. **Given** el formulario de nueva deuda, **When** la persona elige "Valor total diferido" e ingresa total 1.200.000 y 12 meses, **Then** ve la cuota mensual calculada (100.000) y el mes final derivado del primer mes.
2. **Given** una deuda diferida válida, **When** la guarda, **Then** aparece en la lista con su avance, su cuota mensual, su total y su mes final, igual que una deuda por cuota.
3. **Given** el total no es divisible exacto entre los meses, **When** ve el resumen, **Then** el sistema indica que la última cuota ajusta la diferencia y el total pendiente sigue siendo exactamente el valor ingresado.

---

### User Story 2 - Seguir pagando cuotas de ambos tipos igual (Priority: P1)

Las deudas de ambos tipos se comportan igual en el día a día: marcar una cuota como pagada crea el gasto del mes con la categoría de la deuda, se puede pagar "todo lo vencido", y el avance y lo pendiente se actualizan.

**Why this priority**: Evita que el módulo se vuelva dos módulos; el valor está en que el seguimiento sea uniforme.

**Independent Test**: Con una deuda diferida de 1.000.000 COP a 3 meses (cuotas 333.333, 333.333, 333.334), marcar la primera y la última cuota y comprobar que los gastos creados y el pendiente coinciden con esos montos.

**Acceptance Scenarios**:

1. **Given** una deuda diferida con cuotas pendientes, **When** marca una cuota como pagada, **Then** se crea el gasto de ese mes por el monto de esa cuota y el pendiente baja en ese monto.
2. **Given** una deuda diferida con la última cuota ajustada, **When** se pagan todas las cuotas, **Then** la suma de lo pagado es exactamente el valor total y el estado pasa a "pagada".
3. **Given** una deuda por cuota mensual existente, **When** la persona la usa tras este cambio, **Then** todo funciona como antes, sin migración manual y con los mismos montos.

---

### User Story 3 - Editar y distinguir el tipo de deuda (Priority: P2)

En la lista se distingue qué deudas son por cuota y cuáles son diferidas. Al editar una deuda se muestran los campos de su tipo (cuota + fechas, o total + meses). Se mantienen las reglas actuales: no se puede editar dejando cuotas pagadas fuera del calendario.

**Why this priority**: Mejora la claridad y el mantenimiento, pero la feature ya entrega valor con las historias 1 y 2.

**Independent Test**: Editar el total de una deuda diferida sin pagos (se recalcula la cuota) y con pagos (se rechaza hasta desmarcarlos).

**Acceptance Scenarios**:

1. **Given** la lista de deudas, **When** hay deudas de ambos tipos, **Then** cada una muestra una etiqueta de su tipo.
2. **Given** una deuda diferida sin cuotas pagadas, **When** cambia total o meses, **Then** la cuota mensual se recalcula y se guarda.
3. **Given** una deuda diferida con alguna cuota pagada, **When** intenta cambiar el valor total o el número de meses, **Then** el sistema lo rechaza pidiendo desmarcar antes los pagos; nombre, categoría y nota siguen editables.
4. **Given** una deuda por cuota, **When** la edita, **Then** no se le ofrece cambiar de tipo [ver Assumptions].

---

### User Story 4 - Dashboard y totales coherentes (Priority: P3)

El home dashboard (compromisos y deudas) y los totales de gastos mensuales usan la cuota real de cada mes, de modo que una deuda diferida aporta la misma cuota que cualquier otra y la última cuota ajustada se refleja bien.

**Why this priority**: Es consistencia con módulos existentes; no cambia la experiencia principal.

**Independent Test**: Con una deuda diferida activa, verificar que el compromiso mensual y el pendiente en el dashboard coinciden con lo mostrado en el módulo de deudas.

**Acceptance Scenarios**:

1. **Given** una deuda diferida activa, **When** se abre el dashboard, **Then** su cuota del mes y su pendiente coinciden con los del módulo de deudas.

---

### Edge Cases

- Total menor que el número de meses (cuota menor a 1 peso): se rechaza, la cuota mínima es 1 COP.
- Total no divisible entre los meses: la cuota es el entero hacia abajo y la última cuota absorbe el resto; la suma siempre es el total exacto.
- Meses = 1: la deuda diferida es un solo pago por el total.
- Meses por encima del máximo actual (120): se rechaza con el mismo mensaje existente.
- Total, meses o cuota con ceros, negativos, decimales o texto: se rechaza con mensaje de validación.
- "Cuotas ya pagadas" mayor que los meses: se rechaza, igual que hoy.
- Borrar una deuda diferida: conserva los gastos ya pagados, igual que hoy.
- Idioma: todos los textos nuevos existen en español e inglés.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST ofrecer, al crear una deuda, dos tipos: "Cuota mensual" (el actual) y "Valor total diferido".
- **FR-002**: En el tipo "Cuota mensual", el sistema MUST conservar el comportamiento actual: la persona ingresa la cuota, el primer y el último mes, y el sistema calcula el total adeudado.
- **FR-003**: En el tipo "Valor total diferido", la persona MUST ingresar nombre, categoría, valor total, número de meses, primer mes de pago y, opcionalmente, cuotas ya pagadas y nota.
- **FR-004**: En el tipo diferido, el sistema MUST calcular la cuota mensual como el total dividido entre los meses, en pesos enteros, y mostrarla en vivo antes de guardar.
- **FR-005**: Cuando la división no es exacta, el sistema MUST cobrar la diferencia en la última cuota, de modo que la suma de las cuotas sea exactamente el valor total.
- **FR-006**: El sistema MUST derivar el mes final como primer mes + meses − 1 y mostrarlo.
- **FR-007**: El sistema MUST validar el tipo diferido: total entero positivo, meses entero entre 1 y 120, cuota calculada de al menos 1 COP, cuotas ya pagadas entre 0 y los meses.
- **FR-008**: Pagar una cuota de cualquier tipo MUST crear el gasto del mes por el monto de esa cuota (la última cuota diferida puede ser distinta de las demás), con la categoría de la deuda, una vez por mes y deuda.
- **FR-009**: El pendiente, el pagado y el porcentaje de una deuda MUST calcularse con los montos reales de cada cuota, de modo que una deuda diferida completamente pagada sume exactamente su total.
- **FR-010**: La lista de deudas MUST mostrar una etiqueta del tipo y, en las diferidas, el valor total diferido junto al avance.
- **FR-011**: Al editar una deuda, el sistema MUST mostrar los campos de su tipo y mantener las reglas existentes (en cuota mensual: no dejar cuotas pagadas fuera del calendario). En una deuda diferida con cuotas pagadas, el valor total y los meses quedan bloqueados hasta desmarcar los pagos, para que lo pagado siempre cuadre con el total.
- **FR-012**: Todas las deudas existentes MUST seguir funcionando como tipo "Cuota mensual" sin pérdida de datos ni acción de la persona.
- **FR-013**: El dashboard y los totales de gastos MUST usar el monto real de cada cuota para ambos tipos.
- **FR-014**: Todos los textos nuevos y mensajes de validación MUST existir en español e inglés.

### Key Entities

- **Deuda**: plantilla de un compromiso con nombre, categoría, nota, primer mes y número de cuotas. Ahora tiene un **tipo**: "cuota mensual" (se define por la cuota) o "total diferido" (se define por el valor total).
- **Cuota**: ocurrencia mensual de una deuda; al pagarse es un gasto del mes. Su monto es la cuota mensual, salvo la última de una deuda diferida, que absorbe el redondeo.
- **Valor total diferido**: monto total que la persona difiere en N meses; solo existe en deudas del tipo diferido y es la fuente de verdad de su cuota.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una persona registra una deuda diferida (total + meses) en menos de 1 minuto y ve la cuota calculada antes de guardar.
- **SC-002**: En el 100 % de las deudas diferidas, la suma de todas las cuotas es exactamente el valor total ingresado, sin importar la divisibilidad.
- **SC-003**: El 100 % de las deudas existentes conserva sus montos, cuotas pagadas y pendiente tras el cambio.
- **SC-004**: Los valores de cuota del mes y pendiente de una deuda coinciden entre el módulo de deudas y el dashboard en el 100 % de los casos.
- **SC-005**: Una persona distingue el tipo de cada deuda en la lista sin abrirla.

## Assumptions

- El tipo se elige al crear la deuda y no se puede cambiar después; para cambiar de tipo se crea una deuda nueva.
- Sin intereses: el valor total diferido se reparte en cuotas iguales, sin recargos ni amortización (intereses sigue fuera de alcance, como en la spec 006).
- Moneda única COP en pesos enteros, como el resto de la app.
- El primer mes de pago lo elige la persona (por defecto el mes actual), igual que en las deudas por cuota.
- Se conservan las reglas de la spec 006: máximo 120 cuotas, pago crea gasto con `debt_id` y periodo, borrar conserva gastos pagados, fecha de pago el día 1 del mes sin superar hoy, "marcar todo lo vencido".
- Fuera de alcance: intereses, pagos parciales o adelantados, cambiar de tipo, multimoneda, recordatorios.
