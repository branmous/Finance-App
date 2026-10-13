# Contrato: plantilla y server actions

Todo requiere sesión iniciada (`getSessionUser()`); sin sesión devuelve `SESSION_EXPIRED` (actions) o `401` (route).

## `GET /monthly-expenses/template`

- Respuesta `200`: `text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="expenses-template.csv"`, cuerpo según [csv-format.md](./csv-format.md).
- Respuesta `401` sin sesión (el middleware ya redirige al login).
- Datos: `categoryRepository.list(userId)` → `buildTemplateCsv`.

## `previewBulkExpenses(formData)`

Entrada (`FormData`): `file` (File), `period` (`YYYY-MM`).

```ts
type BulkPreviewResult =
  | { ok: true; count: number; total: number; ignored: number; existingInPeriod: number }
  | { ok: false; errors?: BulkImportError[]; message?: string };
```

Pasos: sesión → validar `period` (`invalidMonth`) → validar `file.size` ≤ 1 MB (`csvTooLarge`) → leer texto → `categoryRepository.list` → `validateBulkImport` → `expenseRepository.countByPeriod`. No escribe nada.

## `importBulkExpenses(formData)`

Misma entrada. Devuelve:

```ts
type BulkImportActionResult =
  | { ok: true; created: number }
  | { ok: false; errors?: BulkImportError[]; message?: string };
```

Pasos: los mismos de validación (siempre se revalida) → `expenseRepository.createMany(userId, period, rows)` → `revalidatePath("/monthly-expenses")` y `revalidatePath("/")`. `ExpenseCategoryNotFoundError` se mapea a `csvUnknownCategory`. Cualquier error deja la base sin cambios.

## UI (`bulk-import-dialog.tsx`)

1. Selector de mes (valor inicial `period` de la página) y enlace "Descargar plantilla".
2. Campo de archivo `.csv`; al elegirlo se llama `previewBulkExpenses`.
3. Resultado: vista previa (cantidad, total en COP, aviso de mes con gastos) o lista de errores `Línea N · columna · motivo`.
4. "Confirmar carga" llama `importBulkExpenses`; al terminar cierra el diálogo, navega al mes cargado y muestra cuántos gastos se crearon.
