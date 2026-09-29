# Guía de inicio: App de finanzas personales

Sep 29, 2026 · @Brandon Steve Montoya

Empieza con una app web personal en Next.js + PostgreSQL, organizada como monolito modular, y limita el MVP a tres cosas: registrar gastos fijos y variables, marcar cada pago del mes como pagado o pendiente, y ver un reporte mensual. Todo lo demás (análisis, ahorro, préstamos, móvil) se construye encima de ese núcleo.

## Decisiones clave

Estas decisiones ya están tomadas como punto de partida; puedes cambiarlas antes de escribir código.

| Decisión | Elección | Por qué |
| --- | --- | --- |
| Plataforma | App web responsive (PWA) primero, móvil nativa después | La usas desde el celular sin publicar en tiendas; la lógica se reutiliza luego en React Native |
| Arquitectura | Monolito modular con dominio separado | Una sola app fácil de mantener para una persona, pero con límites claros para crecer |
| Lenguaje | TypeScript en todo el stack | Un solo lenguaje para web, servidor, lógica de negocio y móvil |
| Base de datos | PostgreSQL | Relacional, ideal para reportes y agregaciones por mes y categoría |
| Dinero | Enteros en la unidad mínima + moneda (COP por defecto) | Evita errores de redondeo de los decimales |
| Usuarios | Solo tú, pero con `user_id` en cada tabla | Cero complejidad hoy, sin reescritura si algún día la compartes |

La idea central del diseño: separar la **plantilla** de un gasto fijo ("Arriendo, día 5, 1.200.000") de su **ocurrencia** de cada mes ("Arriendo de octubre: pendiente"). Esa separación es lo que hace posible el checklist de pagado/pendiente y los reportes históricos.

## Alcance del MVP

El MVP está listo cuando puedes pasar un mes completo usando solo la app, sin Excel ni notas aparte.

| Módulo | Qué hace | Criterio de listo |
| --- | --- | --- |
| Categorías | Crear categorías (Vivienda, Transporte, Salud…) marcadas como fijo o variable | Puedo clasificar cualquier gasto |
| Cuentas | Efectivo, cuenta bancaria, tarjeta de crédito | Cada pago sale de una cuenta |
| Gastos fijos | Plantillas recurrentes: nombre, monto estimado, día de pago, frecuencia (mensual, anual) | Arriendo, gym y plan de datos creados una sola vez |
| Checklist del mes | Al iniciar el mes se generan las ocurrencias; cada una se marca pagada (con monto real y fecha) u omitida | Veo de un vistazo qué falta por pagar y cuánto suma |
| Gastos variables | Registro rápido: monto, categoría, fecha, nota | Registrar un gasto toma menos de 10 segundos |
| Ingresos | Registro de salario y otros ingresos del mes | El mes muestra ingresos menos gastos |
| Reporte mensual | Total gastado, fijo vs variable, por categoría, pagado vs pendiente, comparación con el mes anterior | Puedo responder "¿en qué se fue la plata este mes?" |

Fuera del MVP a propósito: presupuestos, metas, gráficos avanzados, notificaciones, importar extractos y app móvil nativa.

## Arquitectura

Un monolito modular: una sola aplicación desplegada, pero con la lógica financiera aislada en `packages/core`, sin depender de Next.js ni de la base de datos.

_(Diagrama de arquitectura: ver la guía original en Claude Docs.)_

Las flechas solo bajan: la interfaz llama a los casos de uso, y estos a los repositorios. Cada módulo nuevo (ahorro, préstamos) se agrega en `core` sin tocar los existentes; lo punteado es futuro.

## Stack sugerido

Un stack moderno y simple, con un solo lenguaje y hosting gratuito para un usuario.

| Capa | Herramienta | Por qué |
| --- | --- | --- |
| Monorepo | pnpm workspaces + Turborepo | Permite compartir `core` entre web y móvil |
| Web (UI + servidor) | Next.js (App Router) + React + TypeScript | Frontend y backend en un mismo proyecto; Server Actions para los casos de uso |
| Estilos y componentes | Tailwind CSS + shadcn/ui | Interfaz limpia y rápida de construir |
| Base de datos | PostgreSQL en Supabase o Neon (plan gratuito) | Relacional, con backups y sin administrar servidores |
| Acceso a datos | Drizzle ORM + migraciones | Esquema tipado en TypeScript y migraciones versionadas |
| Validación | Zod | Mismas reglas en formularios y servidor |
| Autenticación | Auth.js o Supabase Auth, restringido a tu correo | Solo tú entras |
| Gráficos | Recharts | Suficiente para reportes mensuales |
| Pruebas | Vitest (dominio) + Playwright (flujos clave) | La lógica financiera debe estar cubierta por pruebas |
| Despliegue | Vercel + GitHub Actions | Cada push despliega; CI corre lint y pruebas |
| Móvil (fase 5) | Expo (React Native) | Reutiliza `packages/core` sin reescribir la lógica |

## Modelo de datos inicial

Seis tablas cubren el MVP; todas llevan `id`, `user_id`, `created_at` y `updated_at`. Los montos se guardan como enteros (`amount_minor`) junto a `currency`.

| Tabla | Campos principales | Se relaciona con |
| --- | --- | --- |
| `accounts` | nombre, tipo (efectivo, banco, tarjeta), moneda, activa | transacciones |
| `categories` | nombre, tipo (fijo, variable, ingreso), color, `parent_id` | transacciones, gastos fijos |
| `recurring_bills` | nombre, `category_id`, `account_id`, monto estimado, día de pago, frecuencia, fecha inicio y fin, activo | genera `bill_occurrences` |
| `bill_occurrences` | `recurring_bill_id`, periodo (`2026-10`), fecha límite, monto esperado, estado (pendiente, pagado, omitido), `paid_at`, `transaction_id` | una plantilla; una transacción al pagarse |
| `transactions` | fecha, tipo (gasto, ingreso, transferencia), monto, `category_id`, `account_id`, descripción | cuenta, categoría, ocurrencia opcional |
| `income_sources` | nombre, monto esperado, día de pago, frecuencia | transacciones de ingreso |

Reglas del dominio que conviene fijar desde el inicio:

- Marcar una ocurrencia como pagada crea su transacción; desmarcarla la elimina. Así el checklist y los reportes nunca se contradicen.
- Las ocurrencias del mes se generan con un proceso idempotente (se puede correr dos veces sin duplicar), al abrir el mes o con un cron.
- Cambiar el monto de una plantilla solo afecta meses futuros; el historial no se reescribe.
- Los reportes se calculan desde `transactions` (lo real) y `bill_occurrences` (lo pendiente).

## Funcionalidades futuras

Cada una es un módulo nuevo que lee los datos del núcleo, sin cambiar cómo se registran.

| Funcionalidad | Qué haría | Datos nuevos |
| --- | --- | --- |
| Presupuesto por categoría | Límite mensual por categoría con alerta al 80% y 100% | `budgets` |
| Estrategia de ahorro | Proponer cuánto ahorrar según tus ingresos (regla 50/30/20 o porcentaje propio) y medir si se cumple | `savings_goals`, `savings_rules` |
| Metas | Fondo de emergencia, viaje, cuota inicial: monto objetivo, fecha y aporte mensual necesario | `savings_goals` |
| Análisis | Tendencias de 6 a 12 meses, gastos que crecen, gasto promedio por categoría, gastos hormiga | ninguno |
| Proyección de flujo de caja | Saldo esperado de los próximos meses con ingresos y gastos fijos conocidos | ninguno |
| Simulador de préstamos | Tabla de amortización (sistema francés), cuota mensual, intereses totales y cuánto de tus ingresos compromete la cuota | `loans`, `loan_payments` |
| Deudas y tarjetas | Seguimiento de saldos, fecha de corte y pago mínimo | `debts` |
| Importar extractos | Cargar CSV del banco y categorizar automáticamente con reglas | `import_rules` |
| Notificaciones | Recordatorio antes de la fecha límite de cada pago pendiente | `notification_settings` |

Las fórmulas (amortización, proyecciones, reglas de ahorro) van en `packages/core` como funciones puras con pruebas, para reutilizarlas en web y móvil.

## Hoja de ruta

Se avanza a la siguiente fase solo cuando se cumple el criterio de salida de la actual.

_(Diagrama de la hoja de ruta de 6 fases: ver la guía original en Claude Docs.)_

Usar la app con tus datos reales desde la fase 1 es lo que te dirá qué priorizar en las fases 3 a 5.

## Desarrollo guiado por specs (SDD)

Cada funcionalidad empieza como un spec escrito en el repositorio, y el código se genera y se revisa contra ese spec. El spec es la fuente de verdad: si el comportamiento cambia, primero cambia el spec.

### El flujo por funcionalidad

1. **Constitución** (una sola vez): las reglas que todo spec debe respetar. Salen de esta guía: TypeScript estricto, lógica en `packages/core` sin dependencias de Next.js ni de la base de datos, montos en enteros, pruebas obligatorias en `core`.
2. **Spec** (qué y por qué): historias de usuario y criterios de aceptación. Sin tecnología.
3. **Plan** (cómo): módulos de `core` que toca, tablas y migraciones, casos de uso, pantallas. Debe cumplir la constitución.
4. **Tareas**: pasos pequeños y ordenados; cada uno cabe en un commit o PR y nombra la prueba que lo demuestra.
5. **Implementación**: se ejecuta tarea por tarea (tú o un agente como Claude Code). Cada criterio de aceptación se convierte en una prueba.
6. **Verificación**: el PR se revisa contra el spec; el spec se marca como implementado.

### Estructura en el repositorio

```
specs/
  constitution.md
  001-cimientos/
    spec.md
    plan.md
    tasks.md
  002-categorias-y-cuentas/
  003-gastos-fijos-y-checklist/
  004-gastos-variables-e-ingresos/
  005-reporte-mensual/
CLAUDE.md          # apunta a specs/ y a la constitución
```

Los cinco specs cubren el MVP (fases 0 a 2). Las fases 3 a 5 se escriben como specs nuevos (`006-presupuestos`, `007-simulador-prestamos`…) solo cuando llegue su turno.

### Ejemplo: `003-gastos-fijos-y-checklist/spec.md`

```markdown
# 003 · Gastos fijos y checklist mensual

## Objetivo
Saber en cualquier momento qué pagos fijos del mes ya hice y cuánto falta por pagar.

## Historias de usuario
- Como usuario, registro un gasto fijo una sola vez (nombre, categoría, monto estimado, día de pago, frecuencia).
- Como usuario, al abrir un mes veo la lista de pagos fijos de ese mes con su estado.
- Como usuario, marco un pago como pagado indicando monto real y fecha.
- Como usuario, marco un pago como omitido cuando ese mes no aplica.

## Criterios de aceptación
- Dado un gasto fijo mensual con día de pago 5, cuando se abre octubre 2026, entonces existe una ocurrencia con fecha límite 2026-10-05 en estado pendiente.
- Dado que se abre el mismo mes dos veces, entonces no se duplican ocurrencias.
- Dado un día de pago 31, en un mes de 30 días la fecha límite es el último día del mes.
- Cuando marco una ocurrencia como pagada, se crea una transacción con el monto real; al desmarcarla, la transacción se elimina.
- Cambiar el monto de la plantilla no modifica meses ya generados.
- El encabezado del checklist muestra total pagado y total pendiente del mes.

## Fuera de alcance
Notificaciones, presupuestos, pagos parciales.

## Preguntas abiertas
- ¿Se permiten pagos parciales de una misma ocurrencia?
```

### Herramientas sugeridas

| Herramienta | Para qué |
| --- | --- |
| [GitHub Spec Kit](https://github.com/github/spec-kit) | Plantillas y comandos para generar constitución, spec, plan y tareas con un agente de IA; encaja con esta estructura |
| Claude Code + `CLAUDE.md` | Implementar tarea por tarea leyendo el spec y la constitución |
| Vitest | Convertir cada criterio de aceptación en una prueba de `core` |
| GitHub Issues o Projects | Una issue por spec, con sus tareas enlazadas |

### Cómo empezar

- [ ] Escribir `specs/constitution.md` con las decisiones clave de esta guía
- [ ] Escribir el spec 001 (cimientos) e implementarlo con el flujo completo, como ensayo del proceso
- [ ] Escribir el spec 003 con tus gastos fijos reales como datos de ejemplo
- [ ] Revisar al terminar cada spec qué sobró o faltó en las plantillas y ajustarlas

## Primeros pasos

- [ ] Escribir en una página tus gastos fijos reales (nombre, monto, día de pago) y tus categorías; son los datos de prueba
- [ ] Crear el repositorio en GitHub con el monorepo (`apps/web`, `packages/core`, `packages/db`)
- [ ] Configurar TypeScript estricto, ESLint, Prettier y Vitest
- [ ] Crear la base de datos en Supabase o Neon y la primera migración con Drizzle
- [ ] Desplegar una página vacía en Vercel con login restringido a tu correo
- [ ] Programar en `core` la generación de ocurrencias del mes, con pruebas
- [ ] Construir la pantalla del checklist del mes y usarla con tus pagos reales

Cuando tengas el repositorio, conectarlo a este proyecto me permite escribir el código contigo fase por fase.
