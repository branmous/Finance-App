# Feature Specification: Gastos Agrupados (pagados con otro gasto)

**Feature Branch**: `feature/005-gastos-agrupados`

**Created**: 2026-10-07

**Status**: Implemented

**Input**: User description: "Poder organizar los gastos dentro de otros gastos. Ejemplo: un gasto principal Tarjeta de crédito de 200.000 y un gasto Netflix de 38.000 que se pagó con esa tarjeta; el usuario registra Netflix y lo asocia a la tarjeta. Otro mes Netflix puede pagarse de forma independiente. Un gasto se asocia a un gasto padre, pero puede ser independiente cuando el usuario lo decida."

## Decisiones

- **El hijo ya está incluido en el padre**: el total del mes (y Pagado/Pendiente) cuenta solo los gastos de nivel superior. Netflix ($38.000) dentro de la tarjeta ($200.000) suma $200.000, no $238.000. Si Netflix pasa a ser independiente, cuenta por su cuenta.
- **Reglas**: cualquier gasto puede ser padre; un solo nivel (un hijo no puede ser padre ni un padre con hijos puede pasar a ser hijo); padre e hijo deben ser del mismo mes (`period`) y del mismo usuario.
- **Hijo sin fecha de pago propia**: se paga junto con su padre. Se guarda sin `paid_on`. Al volverse independiente queda pendiente, y el usuario le pone fecha si ya lo pagó.
- **Borrar un padre**: sus hijos pasan a independientes (`ON DELETE SET NULL`), con aviso previo.
- **Copiar del mes anterior**: la relación se conserva solo si se copian padre e hijo juntos; un hijo copiado solo llega independiente.
- La UI sigue en inglés, como el resto de la app.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar un gasto pagado con otro (Priority: P1)

Como usuario, quiero indicar que un gasto (Netflix) se pagó con otro (Tarjeta de crédito), de modo que
quede agrupado bajo él y no se cuente dos veces.

**Independent Test**: Crear Tarjeta ($200.000) y Netflix ($38.000) con "Paid with" = Tarjeta; el total del mes es $200.000.

**Acceptance Scenarios**:

1. **Given** gastos en un mes, **When** creo un gasto y elijo "Paid with" otro gasto del mismo mes, **Then** aparece indentado bajo el padre como "Paid with <padre>".
2. **Given** un padre con hijos, **When** veo el mes, **Then** el padre muestra "Includes $X in N linked" y el total del mes no suma a los hijos.
3. **Given** un gasto ya creado, **When** lo edito y elijo un padre, **Then** pasa a estar agrupado.
4. **Given** un gasto cuyo mes es distinto del que estoy viendo, **When** abro el formulario, **Then** "Paid with" está deshabilitado con una explicación.
5. **Given** un padre que ya tiene hijos, **When** lo edito, **Then** "Paid with" está deshabilitado (un solo nivel).
6. **Given** que los hijos suman más que el padre, **When** veo el mes, **Then** se resalta "more than this amount" (no se bloquea).

---

### User Story 2 - Hacer un gasto independiente cuando yo decida (Priority: P1)

Como usuario, quiero poder soltar un gasto de su padre, de modo que un mes se pague con la tarjeta y otro por su cuenta.

**Independent Test**: Con Netflix bajo la tarjeta, pulsar "Make independent": el total sube a $238.000.

**Acceptance Scenarios**:

1. **Given** un gasto agrupado, **When** pulso "Make independent", **Then** sale de debajo del padre, queda pendiente y cuenta en el total.
2. **Given** otro mes, **When** registro Netflix sin elegir padre, **Then** es independiente desde el inicio.
3. **Given** un padre con hijos, **When** lo elimino, **Then** se me avisa que N gastos pasarán a independientes y, al confirmar, quedan sueltos y cuentan en el total.

---

### User Story 3 - Copiar conservando la relación (Priority: P2)

**Acceptance Scenarios**:

1. **Given** el modal "Copy from last month", **When** veo los gastos, **Then** los hijos aparecen indentados bajo su padre.
2. **Given** que selecciono padre e hijo, **When** confirmo, **Then** en el mes actual el hijo queda bajo la copia del padre.
3. **Given** que selecciono solo el hijo, **When** confirmo, **Then** llega como gasto independiente.

---

### User Story 4 - Aislamiento y reglas (Priority: P1)

**Acceptance Scenarios**:

1. **Given** el gasto de otro usuario, **When** intento usarlo como padre, **Then** se rechaza.
2. **Given** un padre de otro mes, o un gasto que ya es hijo, **When** intento usarlo como padre, **Then** se rechaza con un mensaje.
3. **Given** un gasto, **When** intento hacerlo su propio padre, **Then** se rechaza.
4. **Given** un gasto agrupado o con hijos, **When** intento cambiar su mes, **Then** se rechaza hasta soltar la relación.

## Requirements

- **FR-001**: Un gasto puede tener un `parent_id` opcional hacia otro gasto del mismo usuario.
- **FR-002**: El total del mes, lo pagado y lo pendiente suman solo gastos sin padre.
- **FR-003**: Las reglas de vinculación (mismo usuario, mismo mes, un nivel, no ser su propio padre) se validan en el repositorio, no solo en la interfaz.
- **FR-004**: Se puede soltar un gasto de su padre en cualquier momento.
- **FR-005**: Borrar un padre no borra a los hijos: quedan independientes.
- **FR-006**: Copiar conserva la relación solo cuando se copian ambos extremos.
