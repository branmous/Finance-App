# Quickstart: validar deuda diferida

## Prerrequisitos

- PostgreSQL accesible (Docker Compose del repo) y dependencias instaladas con `pnpm install`.
- Migración `0010` aplicada: `pnpm --filter @finance-app/db migrate`.

## Pruebas automáticas

```bash
pnpm --filter @finance-app/core test      # reparto, validación, progreso, dashboard
pnpm --filter @finance-app/db test        # repositorio y migración (PGlite)
pnpm --filter web test:e2e -- debts       # flujo completo
```

Resultado esperado: todo en verde, incluidos los casos de [data-model.md](./data-model.md) (suma de cuotas = total, deuda `monthly` sin cambios).

## Escenarios manuales (`pnpm --filter web dev`, ir a Deudas)

1. **Diferida exacta**: nueva deuda → "Valor total diferido", total 1.200.000, 12 meses, inicio enero. Ver cuota 100.000 en el resumen antes de guardar; en la lista: etiqueta de tipo, total 1.200.000, pendiente 1.200.000.
2. **Diferida con resto**: total 1.000.000, 3 meses → cuotas 333.333, 333.333, 333.334. Marcar la primera y la última; los gastos creados en Gastos mensuales tienen esos montos. Al pagar todas el estado es "pagada" y lo pagado suma 1.000.000.
3. **Validación**: total menor que los meses, meses 0 o 121, cuotas ya pagadas > meses → mensajes en el campo correspondiente.
4. **Edición**: diferida sin pagos → cambiar total recalcula la cuota; con una cuota pagada → total y meses rechazados hasta desmarcarla.
5. **Compatibilidad**: una deuda por cuota creada antes del cambio conserva cuota, total y pagadas.
6. **Dashboard**: la cuota del mes y el pendiente de la diferida coinciden con la pantalla de Deudas.
7. **Idiomas**: cambiar a inglés y repetir 1 y 3; no deben quedar textos sin traducir.
