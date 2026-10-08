# Spec 009: Viajes (travels)

## Objetivo
Registrar viajes con sus gastos. Un viaje es **individual** (todo el gasto es mío) o **grupal** (yo lo administro y los gastos globales se dividen entre las personas que van). La pantalla es interactiva: al agregar o cambiar un gasto, los saldos se recalculan.

## Decisiones
- Un viaje tiene: nombre (≤80), tipo (`individual` | `group`), fecha de inicio y fin opcionales.
- Personas: solo nombres por viaje (sin cuenta en la app). Un viaje individual tiene una sola persona (yo); uno grupal tiene 2 o más, la primera soy yo.
- Gasto: descripción (≤80), categoría (`flights`, `lodging`, `transport`, `food`, `activities`, `other`), monto COP entero, fecha opcional, estado `pending` | `paid` y, si está pagado, quién lo pagó (un solo pagador).
- División en partes iguales entre las personas incluidas en el gasto. Excluir a alguien recalcula las partes. El resto de pesos se reparte de a $1 entre los primeros incluidos, de modo que las partes suman exactamente el monto.
- Saldo por persona = lo que pagó − lo que le corresponde (solo gastos `paid`) + abonos enviados − abonos recibidos. Positivo = le deben; negativo = debe. Los gastos `pending` se muestran como "por pagar" y no mueven saldos.
- Liquidación (**Settle up**): el botón calcula el mínimo de transferencias (a lo sumo personas − 1) para dejar todos los saldos en cero: el mayor deudor paga al mayor acreedor hasta saldar. La lista se recalcula en vivo mientras está abierta. Cada transferencia tiene **Mark as paid**, que la registra como un pago entre esas dos personas (con monto y fecha opcional) y ajusta los saldos; un pago marcado por error se puede deshacer desde "Payments made". Los gastos pendientes no entran.
- Módulo independiente: no afecta gastos mensuales ni el balance ingresos − gastos.
- Solo COP. Todas las consultas se filtran por `user_id`. UI en inglés, código en inglés.

## Fuera de alcance
Presupuesto del viaje, varios pagadores o pagos parciales por gasto, montos manuales por persona, pesos por persona, multimoneda.

## Verificación
- `pnpm --filter @finance-app/core test` y `pnpm --filter @finance-app/db test`.
- `pnpm --filter @finance-app/web test:e2e` (`apps/web/tests/e2e/travels.spec.ts`), con PostgreSQL accesible y la migración `0008_travels` aplicada.
