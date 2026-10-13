# Contrato: formato del CSV

## Encabezados (obligatorios, sin distinguir mayúsculas, cualquier orden)

`category,amount,paidOn,note`

Cualquier otra columna (por ejemplo `parent` o `parentId`) rechaza el archivo completo con `csvUnknownColumn`. Los pagos cargados nunca tienen pago padre.

## Reglas por columna

| Columna | Obligatoria en la fila | Regla | Error |
|---------|------------------------|-------|-------|
| `category` | sí, si hay monto | nombre de una categoría propia, sin distinguir mayúsculas ni espacios extremos | `csvUnknownCategory` |
| `amount` | no (vacío = fila ignorada) | entero > 0; admite `$`, espacios y separadores de miles `.` o `,`; sin decimales | `amountPositive` |
| `paidOn` | no | `YYYY-MM-DD` válida; vacío = pendiente | `invalidPaymentDate` |
| `note` | no | ≤ 140 caracteres tras recortar | `noteTooLong` |

## Codificación y estructura

- UTF-8 con o sin BOM; saltos de línea `\n` o `\r\n`.
- Separador `,` o `;` (se detecta por la línea de encabezados).
- Campos con comas, comillas o saltos de línea van entre comillas dobles; una comilla se escapa como `""`.
- Máximo 500 filas con datos y 1 MB.
- Las filas completamente vacías se ignoran.

## Plantilla descargada

```csv
category,amount,paidOn,note
Netflix,,,
Rent,,,
"Groceries, market",,,
```

Una fila por categoría del usuario (orden por tipo y nombre, igual que la lista de categorías), con `amount`, `paidOn` y `note` vacíos. El archivo lleva BOM UTF-8 y separador `,`.

## Ejemplo de archivo lleno (mes 2026-06)

```csv
category,amount,paidOn,note
Netflix,"$45.900",2026-06-05,Annual plan share
Rent,1.800.000,2026-06-01,
Groceries,320000,,Pending receipts
Groceries,150000,2026-06-18,
```
