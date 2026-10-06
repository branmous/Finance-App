# Feature Specification: Gastos Mensuales

**Feature Branch**: `feature/004-gastos-mensuales`

**Created**: 2026-10-06

**Status**: Implemented

**Input**: User description: "Módulo de gastos mensuales para guardar los gastos relacionados a una categoría (por ejemplo, arriendo: 2.000.000), registrando el día en que se pagó y el mes al que corresponde (por ejemplo, septiembre). El usuario puede registrar gastos de meses anteriores, ver el gasto total de un mes y revisar los gastos del mes pasado."

## Decisiones

- **Mes y fecha de pago son independientes**: cada gasto guarda `period` (mes al que corresponde, `YYYY-MM`) y `paid_on` (día de pago). Un arriendo de septiembre pagado el 3 de octubre cuenta en septiembre.
- **Una categoría con gastos no se puede eliminar** (`ON DELETE RESTRICT`): se conserva el historial y los totales de meses pasados no cambian.
- **Dinero**: entero en `amount_minor` (pesos enteros, COP no usa centavos en la práctica), nunca float ni decimal (constitución, principio III). Moneda guardada en `currency` (por defecto `COP`).
- La UI sigue en inglés, como el resto de la app.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar un gasto de una categoría (Priority: P1)

Como usuario, quiero registrar cuánto pagué en una categoría, el día que lo pagué y el mes al
que corresponde, de modo que mis gastos queden guardados.

**Independent Test**: Abrir Monthly expenses, crear el gasto "Rent, 2.000.000, pagado 3 de octubre, mes septiembre" y verlo en septiembre.

**Acceptance Scenarios**:

1. **Given** que tengo categorías, **When** completo categoría, monto, fecha de pago y mes, **Then** el gasto aparece en la lista de ese mes.
2. **Given** un gasto pagado en octubre que corresponde a septiembre, **When** reviso octubre, **Then** no aparece; en septiembre sí.
3. **Given** un mes anterior, **When** registro un gasto en él, **Then** se guarda igual que en el mes actual.
4. **Given** un monto vacío, cero, negativo o decimal, una fecha inválida o una categoría inexistente, **When** guardo, **Then** se rechaza con un mensaje de validación.
5. **Given** que no tengo categorías, **When** abro Monthly expenses, **Then** veo un aviso para crear una categoría primero.
6. **Given** un gasto existente, **When** lo edito o lo elimino (con confirmación), **Then** la lista y el total se actualizan.

---

### User Story 2 - Ver el gasto de un mes y revisar meses anteriores (Priority: P1)

Como usuario, quiero ver la lista de gastos de un mes con su total y moverme al mes anterior
o siguiente, de modo que pueda saber cuánto gasté en cada mes.

**Independent Test**: Registrar gastos en dos meses, ir al mes pasado con la flecha y comprobar lista y total.

**Acceptance Scenarios**:

1. **Given** gastos en un mes, **When** abro ese mes, **Then** veo cada gasto (categoría, fecha de pago, monto, nota) y el total sumado en COP.
2. **Given** el mes actual, **When** uso "Previous month", **Then** veo los gastos y el total del mes pasado.
3. **Given** un mes sin gastos, **When** lo abro, **Then** veo un estado vacío y un total de $0.
4. **Given** que estoy en otro mes, **When** elijo "Back to this month", **Then** vuelvo al mes actual.
5. **Given** el dashboard, **When** hay gastos en el mes actual, **Then** "Spent in <mes>" muestra ese total.

---

### User Story 3 - Mis gastos son solo míos (Priority: P1)

Como usuario, quiero que nadie más vea ni modifique mis gastos.

**Acceptance Scenarios**:

1. **Given** dos usuarios con gastos, **When** uno lista un mes, **Then** solo ve y suma los propios.
2. **Given** el identificador de un gasto ajeno, **When** intento editarlo o eliminarlo, **Then** no tiene efecto.
3. **Given** la categoría de otro usuario, **When** intento registrar un gasto con ella, **Then** se rechaza.
4. **Given** que no tengo sesión, **When** abro `/monthly-expenses`, **Then** me redirige a login.

---

### User Story 4 - No perder historial al borrar categorías (Priority: P2)

**Acceptance Scenarios**:

1. **Given** una categoría con gastos, **When** intento eliminarla, **Then** se bloquea con un mensaje y la categoría sigue.
2. **Given** que elimino todos sus gastos, **When** la elimino, **Then** se borra.

## Requirements

- **FR-001**: Cada gasto pertenece a un usuario y a una categoría del mismo usuario.
- **FR-002**: Cada gasto guarda monto (entero > 0), moneda, mes (`YYYY-MM`), fecha de pago y nota opcional (máx. 140 caracteres).
- **FR-003**: El total de un mes suma solo los gastos de ese `period`.
- **FR-004**: Toda consulta y mutación se filtra por el usuario de la sesión.
- **FR-005**: Se pueden crear, editar y eliminar gastos de cualquier mes.
- **FR-006**: Montos con separadores ("2.000.000") se aceptan; el dato guardado es un entero.
