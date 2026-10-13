# Quickstart: validar la carga masiva de gastos

## Prerrequisitos

- Dependencias instaladas (`pnpm install`) y PostgreSQL local (`docker compose up -d db`) con `DATABASE_URL` configurada.
- Migraciones aplicadas (esta feature no agrega ninguna).
- Un usuario sembrado con `seed-user` y al menos 3 categorías.

## Pruebas automáticas

```bash
pnpm --filter @finance-app/core test        # parser, plantilla y validación
pnpm --filter @finance-app/db test          # createMany / countByPeriod
pnpm --filter web test                      # incluye paridad de catálogos en/es
pnpm lint
pnpm --filter web exec playwright test bulk-import
```

## Escenario manual

1. `pnpm dev`, iniciar sesión y abrir `/monthly-expenses?period=2026-06`.
2. **Carga masiva** → **Descargar plantilla**: el CSV trae una fila por categoría y abre bien en Excel (acentos correctos).
3. Llenar `amount` en tres categorías (una con `$1.500.000`, otra con fecha de pago, otra sin fecha) y subir el archivo para el mes 2026-06.
4. La vista previa muestra 3 gastos y el total esperado, sin aviso de mes con gastos.
5. Confirmar: aparecen 3 gastos en junio 2026; los pagados con su fecha, los demás pendientes; ninguno aparece vinculado a un pago padre.
6. Volver a subir el mismo archivo: la vista previa avisa que el mes ya tiene gastos.
7. Editar el CSV con una categoría inexistente y un monto `abc`: se listan ambos errores con línea y columna y confirmar no está disponible; el mes no cambia.
8. Agregar una columna `parent`: el archivo se rechaza con el error de columna no permitida.
9. Cambiar el idioma a inglés/español: diálogo y errores se traducen.
10. Subir un archivo de más de 1 MB o de más de 500 filas: se rechaza con mensaje claro.
