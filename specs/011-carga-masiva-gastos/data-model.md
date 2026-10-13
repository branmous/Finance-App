# Data Model: Carga masiva de gastos por mes (CSV)

## Cambios de esquema

**Ninguno.** No hay migración (la siguiente seguiría siendo la `0010`). Los gastos cargados se guardan en la tabla `expenses` existente.

## Tabla `expenses` (existente, uso en esta feature)

| Columna | Valor al cargar |
|---------|-----------------|
| `id` | generado por la base de datos |
| `userId` | usuario autenticado |
| `categoryId` | categoría del usuario resuelta por nombre |
| `amountMinor` | entero > 0 (pesos) normalizado desde `amount` |
| `currency` | `COP` (default) |
| `period` | mes elegido, `YYYY-MM` |
| `paidOn` | fecha `YYYY-MM-DD` de la fila, o `null` (pendiente) |
| `note` | texto recortado ≤ 140 |
| `parentId` | **siempre `null`** |
| `debtId` | `null` (la carga no crea pagos de deuda) |

## Tipos nuevos (en `packages/core`, no persistidos)

```ts
type BulkImportColumn = "category" | "amount" | "paidOn" | "note";

type BulkImportRow = {
  line: number;          // línea del archivo (1 = encabezados)
  categoryId: string;
  amountMinor: number;
  paidOn: string | null;
  note: string;
};

type BulkImportError = {
  line: number;          // 0 cuando el error es del archivo completo
  column: BulkImportColumn | null;
  error: ValidationError; // { code, params } existente
};

type BulkImportResult =
  | { ok: true; rows: BulkImportRow[]; total: number; ignored: number }
  | { ok: false; errors: BulkImportError[] };
```

Límites exportados: `BULK_IMPORT_MAX_ROWS = 500`, `BULK_IMPORT_MAX_BYTES = 1_048_576`.

## Códigos de validación nuevos (`validation.json`, en y es)

| Código | Cuándo |
|--------|--------|
| `csvEmpty` | archivo vacío o solo espacios |
| `csvMissingColumn` (`{column}`) | falta un encabezado requerido |
| `csvUnknownColumn` (`{column}`) | encabezado no permitido (incluye `parent`, `parentId`) |
| `csvUnknownCategory` (`{name}`) | categoría que no existe |
| `csvNoRows` | no hay filas con monto |
| `csvTooManyRows` (`{max}`) | más de 500 filas |
| `csvTooLarge` (`{maxMb}`) | más de 1 MB |
| `csvBadFormat` | comillas sin cerrar o fila con distinto número de campos |

Se reutilizan: `amountPositive`, `invalidPaymentDate`, `noteTooLong`, `invalidMonth`.

## Consultas nuevas del repositorio

- `createMany(userId, period, rows)`: verifica propiedad de categorías (`ExpenseCategoryNotFoundError` si alguna no es del usuario) e inserta en un solo `INSERT`; devuelve el número de filas.
- `countByPeriod(userId, period)`: cantidad de gastos del mes (incluye hijos).
