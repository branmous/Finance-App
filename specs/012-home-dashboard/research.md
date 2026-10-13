# Research: Home dashboard del mes cerrado

## D1. Período por defecto y selector
- **Decision**: período por defecto `shiftPeriod(currentPeriod(), -1)`; comparación con `shiftPeriod(period, -1)`; `?period=YYYY-MM` válido con `isValidPeriod` y no posterior a `currentPeriod()`; si no, el valor por defecto.
- **Rationale**: los gastos se registran mes vencido, por lo que el mes en curso casi siempre está vacío. Es el mismo contrato de `?period=` que usa `monthly-expenses`.
- **Alternatives**: mostrar el mes en curso por defecto (rechazado: vacío casi siempre); concepto explícito de "mes cerrado" (rechazado: más estado sin valor).

## D2. Viajes fuera de los totales
- **Decision**: no se consultan ni se suman gastos de viaje en ninguna agregación mensual; la franja usa `trips.list` (total, participantes, fechas, `settled`).
- **Rationale**: decisión del usuario (viajes se miden aparte). Evita doble conteo y mantiene SC-002.
- **Alternatives**: sumar al mes de `spent_on` (rechazado por el usuario).

## D3. Agregaciones en base de datos
- **Decision**: `categoryTotalsByPeriod` con `GROUP BY` sobre `expenses` unido a `categories` (solo `parent_id IS NULL`); `totalsByPeriodRange` con `GROUP BY period` y `BETWEEN`; `countPendingByPeriod`.
- **Rationale**: `listByPeriod` ordena pendientes primero y trae filas completas; agrupar en memoria desperdicia datos y repite lógica. Los períodos son strings `YYYY-MM`, comparables lexicográficamente.
- **Alternatives**: agrupar en memoria (rechazado); vistas SQL (rechazado: sin migraciones).

## D4. Compromiso y deudas sin doble conteo
- **Decision**: compromiso = gasto del período en categorías `fixed` + `subscription` sobre ingresos. La tarjeta de deudas se muestra aparte y sus montos no se suman al compromiso.
- **Rationale**: una cuota pagada es un gasto con categoría; si esa categoría es `fixed` ya está dentro del compromiso.
- **Alternatives**: sumar cuotas al compromiso (rechazado por doble conteo).

## D5. Deudas "activas en el período"
- **Decision**: cuota mensual = suma de `installmentMinor` de deudas cuyo `installmentPeriods` incluye el período; cuotas restantes y vencidas de `debtProgress(…, nowPeriod = currentPeriod())`; mes de fin = máximo `endPeriod` entre deudas no saldadas.
- **Rationale**: reutiliza `debtProgress` y `installmentPeriods` ya probadas.

## D6. Gráficos propios
- **Decision**: barras de categoría con `div`/CSS y tendencia en SVG con `role="img"` y `aria-label` con los valores; sin animaciones fuera de `motion-safe`.
- **Rationale**: coherente con las barras actuales, sin dependencia nueva y dentro del alcance MVP de la constitución. Una librería puede evaluarse en un spec futuro.
- **Alternatives**: Recharts (rechazado: peso, SSR y alcance).

## D7. Viajes y "hoy"
- **Decision**: `trips-strip` es componente cliente y calcula fase con `useToday` + `computeTripSchedule`; el costo por persona y la posición en la línea de tiempo se calculan en core. La alerta de viajes sin saldar se calcula en servidor con `todayIso()` (diferencia máxima de un día, aceptada).
- **Rationale**: el servidor no conoce la zona horaria del usuario.

## D8. Alertas como códigos
- **Decision**: `buildAlerts` devuelve `{ code, severity, params }`; la interfaz traduce con `dashboard.alerts.<code>`. Orden: severidad (alta, media, baja) y luego orden fijo de regla; máximo 4. Solo la categoría con mayor aumento genera `categoryRise`.
- **Rationale**: mismo patrón de códigos de validación (010); permite probar umbrales sin texto.
