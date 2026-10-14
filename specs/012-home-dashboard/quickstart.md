# Quickstart: Home dashboard

## Prerrequisitos

- `pnpm install`, PostgreSQL local arriba (`docker compose up -d db`) y `DATABASE_URL` configurada.
- Un usuario de prueba con datos en los dos últimos meses cerrados (puedes usar la carga masiva de la feature 011).

## Pruebas automáticas

```bash
pnpm --filter @finance-app/core test
pnpm --filter @finance-app/db test
pnpm --filter web test
pnpm lint
pnpm --filter web exec playwright test home-dashboard
```

## Escenario manual

1. Inicia sesión y abre `/`: se muestra el mes anterior al actual contra el anterior a ese.
2. Verifica ingresos, gastos, lo que queda y tasa de ahorro contra `/monthly-income` y `/monthly-expenses` del mismo mes.
3. Revisa el gasto por categoría: orden por variación, categoría nueva sin porcentaje, grupo "Otras" con más de 6 categorías.
4. Crea un viaje con gastos en ese mes y confirma que los totales del mes **no** cambian y que el viaje aparece en su franja.
5. Cambia el período con el selector o con `/?period=2026-08`; con `/?period=abc` vuelve al valor por defecto.
6. Con el mes anterior al actual sin gastos, aparece el aviso "Falta cargar".
7. Cambia el idioma en el menú y revisa textos y alertas en inglés y español.
8. Reduce el ancho a 360 px: sin desplazamiento horizontal.
