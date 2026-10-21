# Research: Deuda diferida

No quedaban `NEEDS CLARIFICATION`; estas son las decisiones de diseño.

## D1. Cómo guardar el tipo y el total

- **Decision**: columnas nuevas en `debts`: `kind` varchar (`monthly` | `deferred`, default `monthly`) y `total_minor` bigint nullable. `installment_minor` sigue siendo la cuota base (para diferidas: `floor(total / meses)`), y `total_installments` el número de meses. Check: `kind = 'deferred'` ⇔ `total_minor IS NOT NULL`.
- **Rationale**: las filas existentes quedan válidas con el default, sin backfill. Mantener `installment_minor` poblado evita romper consultas y pantallas que ya lo leen.
- **Alternatives**: tabla aparte para diferidas (duplica listado, pagos y dashboard); guardar solo el total y derivar la cuota siempre (obliga a cambiar todo lector de `installment_minor`).

## D2. Manejo del resto de la división

- **Decision**: cuota base = `floor(total / n)`; la última cuota = `total − base × (n − 1)`. Nueva función pura `installmentAmount(debt, period)` es la única fuente del monto de una cuota; `monthly` siempre devuelve `installmentMinor`.
- **Rationale**: cumple SC-002 (suma exacta) y el principio III. La última cuota es entre `base` y `base + n − 1`, diferencia mínima.
- **Alternatives**: repartir el resto en las primeras cuotas (cuotas distintas al inicio, más confuso); redondear y aceptar descuadre (viola el total); exigir divisibilidad (mala UX).

## D3. Progreso y pendiente

- **Decision**: `debtProgress` calcula `paidMinor` y `remainingMinor` sumando `installmentAmount` de cada periodo pagado/pendiente, en vez de `conteo × cuota`. `debtsOverview.monthlyMinor` usa `installmentAmount(debt, period)`.
- **Rationale**: es la única forma de que lo pagado más lo pendiente sea el total en diferidas, y equivale a la fórmula actual en `monthly` (sin cambio de resultados, SC-003).
- **Alternatives**: persistir el monto por cuota en una tabla de calendario (principio V pide plantilla + ocurrencia, no un calendario materializado).

## D4. Edición

- **Decision**: el tipo no se cambia al editar. Para `monthly` rigen las reglas actuales. Para `deferred` con cualquier cuota pagada, `totalMinor` y `totalInstallments` se bloquean (error `paidInstallmentsLocked`); sin pagos son editables. Primer mes: igual que hoy, solo si no deja pagadas fuera del rango.
- **Rationale**: los gastos ya creados guardan su monto; recalcular la cuota con pagos hechos haría que lo pagado no cuadre con el total y reescribiría historial (principio V). Reutiliza el patrón existente "desmarca primero".
- **Alternatives**: recalcular solo las cuotas futuras repartiendo el saldo (más complejo, cambia lo que la persona decidió diferir).

## D5. Validación

- **Decision**: `validateDebtInput` se vuelve unión discriminada por `kind`. Diferida: `totalMinor` entero seguro > 0, `months` entero 1..120, `floor(total / months) ≥ 1`, `alreadyPaid` 0..months. Mensajes nuevos: `totalAmountPositive`, `invalidMonths`, `totalTooSmall`, `paidInstallmentsLocked`; se reutilizan `tooManyInstallments`, `paidExceedsTotal`, etc. Entradas sin `kind` se tratan como `monthly` (compatibilidad con clientes previos).
- **Rationale**: misma forma de errores por campo que usa el formulario.

## D6. Pago de cuotas

- **Decision**: `payPeriods` crea cada gasto con `installmentAmount(debt, period)`. `markPaidUpTo` y `alreadyPaid` heredan el comportamiento. Si cuotas ya pagadas existen y el gasto se refresca, su monto no se toca (hoy tampoco).
- **Rationale**: único cambio en el flujo de pago; mantiene idempotencia por índice único `(debt_id, period)`.

## D7. UI

- **Decision**: al crear, selector de tipo (control segmentado) que cambia los campos: monthly (cuota, primer y último mes) / deferred (total, meses, primer mes), con resumen en vivo "N cuotas de X, la última de Y, termina en M". Al editar no se muestra el selector. La lista agrega etiqueta de tipo y, en diferidas, "Total diferido". El total mensual de la vista suma el monto real del mes actual.
- **Rationale**: reutiliza `Input`/`Select` y el patrón de resumen de `debt-form-dialog.tsx`.

## D8. Rama y migración

- **Decision**: rama `feature/013-deuda-diferida` desde `main`. Migración generada con `drizzle-kit generate` (`0010_*`), aditiva y con defaults, segura para datos existentes.
