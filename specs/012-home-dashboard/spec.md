# Feature Specification: Home dashboard del mes cerrado

**Feature Branch**: `feature/012-home-dashboard`

**Created**: 2026-10-13

**Status**: Draft

**Input**: User description: "Rediseñar el home para analizar el último mes cerrado contra el anterior (los gastos se ingresan mes vencido), con métricas y tableros para tomar decisiones sobre el dinero: flujo del mes, dónde se fue por categoría, compromisos, deudas, tendencia, alertas y una franja de viajes aparte. Los gastos de los viajes NO se suman al gasto mensual."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver el flujo del mes cerrado contra el anterior (Priority: P1)

Como persona usuaria que ingresa sus gastos mes vencido quiero abrir el home y ver de inmediato cuánto ingresó, cuánto gastó, cuánto me quedó y mi tasa de ahorro del último mes cerrado, comparado con el mes anterior, para saber si voy mejor o peor.

**Why this priority**: Es la lectura mínima para decidir; sin ella el home no aporta sobre las pantallas de ingresos y gastos.

**Independent Test**: Con ingresos y gastos cargados en dos meses consecutivos, abrir el home y comprobar que muestra por defecto el mes anterior al actual, con ingresos, gastos, lo que queda, la tasa de ahorro y las variaciones contra el mes previo correctas.

**Acceptance Scenarios**:

1. **Given** hoy es octubre de 2026, **When** el usuario abre el home, **Then** el período mostrado es septiembre de 2026 y se compara contra agosto de 2026.
2. **Given** septiembre tiene ingresos 5.000.000 y gastos 4.000.000 y agosto tiene ingresos 5.000.000 y gastos 4.500.000, **When** se muestra el flujo, **Then** se ve lo que queda (1.000.000), la tasa de ahorro (20 %) y que los gastos bajaron 500.000 (11,1 %) frente a agosto.
3. **Given** el mes anterior no tiene datos, **When** se muestra el flujo, **Then** las cifras del mes principal se ven y la comparación se indica como no disponible, sin porcentajes engañosos ni errores.
4. **Given** el mes mostrado no tiene ingresos, **When** se muestra el flujo, **Then** la tasa de ahorro se indica como no disponible y se explica por qué.
5. **Given** el selector de período, **When** el usuario elige otro mes (hasta el mes actual), **Then** el home entero se recalcula para ese mes contra su anterior y la dirección conserva el mes elegido.
6. **Given** una dirección con un período inválido, **When** se abre el home, **Then** se usa el período por defecto.
7. **Given** un viaje con gastos en el mismo mes, **When** se muestra el flujo, **Then** los gastos del viaje no están incluidos en los gastos, el ahorro ni la tasa de ahorro.

---

### User Story 2 - Saber dónde se fue el dinero (Priority: P1)

Como persona usuaria quiero ver el gasto del mes por categoría contra el mes anterior, destacando lo que más subió o bajó en pesos, para identificar dónde ajustar.

**Why this priority**: Es la pregunta central de "tomar decisiones frente al dinero".

**Independent Test**: Con gastos en tres categorías en ambos meses, abrir el home y verificar que las categorías aparecen ordenadas por impacto con su monto actual, el anterior y la variación en pesos y porcentaje.

**Acceptance Scenarios**:

1. **Given** gastos por categoría en ambos meses, **When** se muestra el tablero, **Then** cada categoría lista monto actual, monto anterior y variación, ordenadas por el valor absoluto de la variación en pesos.
2. **Given** una categoría con gasto solo en el mes actual, **When** se muestra, **Then** figura como nueva (sin porcentaje) y su variación es el monto completo.
3. **Given** una categoría con gasto solo en el mes anterior, **When** se muestra, **Then** figura con gasto cero y variación negativa igual al monto anterior.
4. **Given** pagos hijos (`parentId`), **When** se calcula por categoría, **Then** no se cuentan por separado, porque ya están incluidos en el monto del pago padre.
5. **Given** muchas categorías, **When** se muestra, **Then** se ven las 6 principales y el resto se agrupa como "Otras", con enlace a la lista completa del mes.
6. **Given** un mes sin gastos, **When** se muestra el tablero, **Then** aparece un estado vacío con enlace a registrar gastos.

---

### User Story 3 - Medir compromisos fijos y deudas (Priority: P2)

Como persona usuaria quiero saber qué parte de mis ingresos ya está comprometida antes de gastar (gastos fijos y suscripciones) y cómo van mis deudas, para decidir cuánto margen real tengo.

**Why this priority**: Aporta la cifra que más condiciona decisiones, pero depende de que el flujo y las categorías ya existan.

**Independent Test**: Con categorías de tipo fijo y suscripción con gasto, y una deuda activa, abrir el home y comprobar el porcentaje de compromiso, y la carga mensual, cuotas restantes y fecha de fin de las deudas.

**Acceptance Scenarios**:

1. **Given** ingresos de 5.000.000 y gasto en categorías `fixed` y `subscription` de 2.000.000, **When** se muestra, **Then** el compromiso es 40 % de los ingresos con el desglose entre fijos y suscripciones.
2. **Given** un mes sin ingresos, **When** se muestra el compromiso, **Then** se muestran los montos y el porcentaje como no disponible.
3. **Given** deudas activas, **When** se muestra la tarjeta de deudas, **Then** se ve la suma de cuotas mensuales de las deudas activas en el mes, el total de cuotas restantes y el mes en que quedan saldadas todas.
4. **Given** cuotas vencidas sin pagar, **When** se muestra la tarjeta, **Then** se destaca el número de cuotas vencidas.
5. **Given** no hay deudas activas, **When** se muestra, **Then** la tarjeta indica que no hay deudas y enlaza a la pantalla de deudas.
6. **Given** una cuota pagada tiene categoría fija, **When** se muestran compromisos y deudas, **Then** los montos no se suman entre sí (la cuota ya está dentro del gasto por categoría).

---

### User Story 4 - Ver la tendencia de seis meses (Priority: P2)

Como persona usuaria quiero ver ingresos contra gastos de los últimos seis meses cerrados para saber si mi patrón es sostenible.

**Why this priority**: Da contexto más allá de dos meses, pero la decisión inmediata no depende de ella.

**Independent Test**: Con datos en cuatro de seis meses, abrir el home y verificar que el gráfico muestra seis barras por serie, con cero en los meses sin datos, y una descripción accesible con los valores.

**Acceptance Scenarios**:

1. **Given** el mes mostrado, **When** se muestra la tendencia, **Then** abarca ese mes y los cinco anteriores, en orden cronológico.
2. **Given** meses sin datos, **When** se grafican, **Then** se muestran con valor cero y no se omiten.
3. **Given** cualquier usuario, **When** se muestra el gráfico, **Then** ofrece una descripción textual (`aria-label`) con ingresos y gastos por mes y no depende solo del color para distinguir las series.
4. **Given** cualquier gráfico del home, **When** el usuario prefiere movimiento reducido, **Then** no hay animaciones.

---

### User Story 5 - Ver los viajes aparte (Priority: P2)

Como persona usuaria quiero ver mis viajes del año en una franja propia, con su costo total y por persona y los saldos sin liquidar, sin que se mezclen con mis gastos mensuales.

**Why this priority**: Es un pedido explícito, pero es independiente del análisis mensual.

**Independent Test**: Con un viaje en curso, uno próximo y uno terminado sin saldar, abrir el home y comprobar la línea de tiempo del año, el estado de cada viaje, el costo total y por persona, y la marca de sin saldar.

**Acceptance Scenarios**:

1. **Given** viajes con fechas en el año del período mostrado, **When** se muestra la franja, **Then** aparecen sobre una línea de tiempo de enero a diciembre en la posición de sus fechas.
2. **Given** un viaje, **When** se muestra su tarjeta, **Then** se ve el nombre, las fechas, el estado (próximo, en curso, terminado), el costo total y el costo por persona (total entre participantes).
3. **Given** un viaje terminado con saldos sin liquidar, **When** se muestra, **Then** se destaca como pendiente de saldar.
4. **Given** un viaje sin fechas, **When** se muestra la franja, **Then** aparece en la lista pero no en la línea de tiempo.
5. **Given** que no hay viajes, **When** se muestra la franja, **Then** aparece un estado vacío con enlace a crear un viaje.
6. **Given** cualquier viaje, **When** se calculan los totales mensuales, **Then** el gasto del viaje no se suma al gasto, al ahorro ni a las categorías del mes (FR-003).
7. **Given** una persona con zona horaria distinta del servidor, **When** se calcula el estado del viaje, **Then** se calcula con la fecha local del navegador.

---

### User Story 6 - Recibir alertas para decidir (Priority: P2)

Como persona usuaria quiero ver hasta cuatro alertas calculadas con mis datos (lo que subió, lo pendiente, lo vencido) para saber en qué enfocarme sin revisar todo.

**Why this priority**: Resume los otros tableros en acciones, pero se apoya en ellos.

**Independent Test**: Con una categoría que subió 40 %, gastos pendientes de pago y una cuota vencida, abrir el home y comprobar que aparecen esas alertas, ordenadas por severidad y con máximo cuatro visibles.

**Acceptance Scenarios**:

1. **Given** una categoría con variación ≥ 20 % y ≥ 50.000 pesos de aumento, **When** se evalúan las alertas, **Then** aparece "categoría X subió N %".
2. **Given** gastos del mes sin fecha de pago, **When** se evalúan, **Then** aparece la cantidad y el monto pendientes.
3. **Given** cuotas de deuda vencidas, **When** se evalúan, **Then** aparece la alerta con severidad alta.
4. **Given** gastos mayores que ingresos, o un margen menor a 20 %, **When** se evalúan, **Then** aparece la alerta de déficit (alta) o de margen estrecho (media).
5. **Given** gasto en categorías de suscripción, **When** se evalúan, **Then** aparece el total de suscripciones y su porcentaje de los ingresos.
6. **Given** viajes terminados con saldos sin liquidar, **When** se evalúan, **Then** aparece la alerta con la cantidad de viajes.
7. **Given** más de cuatro alertas, **When** se muestran, **Then** se ven las cuatro de mayor severidad (a igual severidad, por orden fijo de regla) sin duplicados.
8. **Given** que ninguna regla se cumple, **When** se muestra el panel, **Then** indica que no hay alertas.

---

### User Story 7 - Recordar cargar el mes que falta (Priority: P3)

Como persona usuaria que registra mes vencido quiero que el home me avise cuando el mes recién cerrado aún no tiene gastos y me lleve directo a cargarlo.

**Why this priority**: Mejora el hábito de captura, pero el home funciona sin ello.

**Independent Test**: Sin gastos en el mes anterior al actual, abrir el home y comprobar el aviso con enlaces a la lista del mes, a la carga masiva y a copiar el mes anterior.

**Acceptance Scenarios**:

1. **Given** el mes anterior al actual no tiene gastos, **When** se abre el home, **Then** aparece un aviso "Falta cargar {mes}" con enlaces al mes en la lista de gastos.
2. **Given** el mes anterior al actual ya tiene gastos, **When** se abre el home, **Then** el aviso no aparece.
3. **Given** el usuario mira un período distinto del mes anterior, **When** se abre el home, **Then** el aviso sigue refiriéndose al mes anterior al actual.

---

### Edge Cases

- Usuario nuevo sin datos: se ven estados vacíos útiles con enlaces para empezar, no gráficos vacíos ni errores.
- División por cero (ingresos 0, mes anterior 0): los porcentajes se muestran como no disponibles.
- Cambios de idioma: todos los textos, fechas y alertas cambian entre inglés y español; los montos mantienen el formato de pesos colombianos.
- Período futuro mayor al mes actual: no se permite; se usa el período por defecto.
- Categorías eliminadas: no aparecen en meses sin gasto; el gasto histórico mantiene su categoría porque no se pueden borrar categorías con gastos.
- Ancho móvil: las tarjetas se apilan en una columna, sin desplazamiento horizontal de la página.
- La sesión expira: se redirige al inicio de sesión como en el resto de la aplicación.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST mostrar en el home, por defecto, el último mes cerrado (mes actual menos uno) comparado con el mes anterior a ese.
- **FR-002**: El sistema MUST permitir elegir otro período mediante un selector que conserva el período en la dirección, con máximo el mes actual, y usar el valor por defecto si el período es inválido.
- **FR-003**: El sistema MUST NOT sumar los gastos de viajes a los gastos mensuales, al ahorro, a la tasa de ahorro, a las categorías ni a los compromisos; los viajes se muestran solo en su franja.
- **FR-004**: El sistema MUST mostrar ingresos, gastos, lo que queda y la tasa de ahorro del período, y la variación de cada cifra contra el período anterior, usando los totales de primer nivel (sin contar pagos hijos aparte).
- **FR-005**: El sistema MUST mostrar el gasto por categoría de ambos períodos con variación en pesos y porcentaje, ordenado por variación absoluta, con las 6 principales y el resto agrupado.
- **FR-006**: El sistema MUST mostrar el compromiso (categorías `fixed` y `subscription`) como monto y porcentaje de los ingresos del período.
- **FR-007**: El sistema MUST mostrar las deudas: cuota mensual de las deudas activas en el período, cuotas restantes, mes de fin y número de cuotas vencidas, sin sumarlas al compromiso.
- **FR-008**: El sistema MUST mostrar una tendencia de ingresos y gastos de seis meses terminando en el período, con ceros en meses sin datos.
- **FR-009**: El sistema MUST mostrar una franja de viajes con línea de tiempo del año del período, estado, costo total, costo por persona y marca de sin saldar; el estado se calcula con la fecha del navegador.
- **FR-010**: El sistema MUST mostrar hasta cuatro alertas calculadas según las reglas del spec y umbrales como constantes con nombre: aumento de categoría ≥ 20 % y ≥ 50.000 pesos, margen estrecho < 20 %, déficit (gasto > ingreso), gastos pendientes de pago, cuotas vencidas, suscripciones, viajes sin saldar.
- **FR-011**: El sistema MUST mostrar un aviso cuando el mes anterior al actual no tiene gastos, con enlaces a la lista de ese mes en gastos mensuales.
- **FR-012**: Toda la información MUST estar limitada al usuario autenticado.
- **FR-013**: Todos los textos, incluidas las alertas, MUST estar disponibles en inglés y español; los montos usan el formato de peso colombiano.
- **FR-014**: Los gráficos MUST ser accesibles: descripción textual con los valores, información no dependiente solo del color y sin animaciones con movimiento reducido.
- **FR-015**: El home MUST tener estados de carga (esqueleto) y estados vacíos para cada bloque.
- **FR-016**: La lógica de cálculo (variaciones, tasa de ahorro, unión de categorías, compromiso, alertas) MUST vivir en `packages/core` sin dependencias de Next ni del ORM, con pruebas unitarias.

### Key Entities *(include if feature involves data)*

- **Período del home**: mes `YYYY-MM` mostrado y su mes anterior de comparación.
- **Resumen de flujo**: ingresos, gastos, lo que queda, tasa de ahorro y variaciones. Se calcula, no se guarda.
- **Total por categoría**: categoría, tipo, color y monto del período; se calcula a partir de gastos de primer nivel.
- **Compromiso**: monto y porcentaje de gastos fijos y suscripciones sobre ingresos.
- **Alerta**: código, parámetros y severidad; el texto se resuelve en la interfaz según el idioma.
- **Viaje (existente)**: se muestra con su costo y estado; no participa en los totales mensuales.
- **Deuda (existente)**: se muestra su progreso; sus cuotas pagadas ya son gastos del mes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario ve el flujo del último mes cerrado contra el anterior al abrir el home, sin pasos adicionales.
- **SC-002**: El 100 % de los totales del home coincide con los de las pantallas de ingresos y gastos para el mismo mes, y ningún gasto de viaje altera esos totales.
- **SC-003**: Con 12 meses de datos y 100 categorías, el home muestra todo su contenido en menos de 1 segundo en el servidor de pruebas.
- **SC-004**: Cambiar el período recalcula el home completo en una sola navegación.
- **SC-005**: El 100 % de las cadenas nuevas existe en inglés y español (la prueba de paridad de catálogos pasa).
- **SC-006**: En un ancho de 360 px no hay desplazamiento horizontal de la página.
- **SC-007**: Cada alerta definida tiene una prueba unitaria de su umbral (justo debajo y justo en el límite).

## Assumptions

- La moneda es el peso colombiano con montos enteros.
- "Mes cerrado" significa el mes calendario anterior al actual; no existe un concepto de cierre explícito.
- La comparación es siempre contra el mes inmediatamente anterior al mostrado.
- No hay presupuestos ni metas por categoría; quedan para una fase futura.
- Los gastos de viaje siguen registrándose solo en la sección de viajes.
- No requiere cambios en el modelo de datos existente.
- Los gráficos son propios (SVG/CSS); no se incorpora una librería de gráficos.
- El home sigue requiriendo sesión iniciada.
