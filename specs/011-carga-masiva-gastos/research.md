# Research: Carga masiva de gastos por mes (CSV)

No quedaron `NEEDS CLARIFICATION`; estas son las decisiones de diseño.

## D1. Parser CSV propio en `core`
- **Decision**: implementar `parseCsv` (RFC 4180: comillas, comillas escapadas `""`, saltos CRLF/LF, BOM) en `packages/core`.
- **Rationale**: el formato es mínimo, `core` no debe tener dependencias de runtime y el comportamiento (línea/columna para errores) se controla mejor.
- **Alternatives**: `papaparse` / `csv-parse` — más robustos pero añaden dependencia a `core` y devuelven posiciones menos directas.

## D2. Detección del separador
- **Decision**: leer la primera línea (encabezados) y elegir `;` si hay más `;` que `,` fuera de comillas; si no, `,`.
- **Rationale**: Excel en configuración regional española guarda con `;`. La plantilla se genera con `,`.
- **Alternatives**: forzar solo `,` (fricción con Excel); pedir al usuario el separador (UX peor).

## D3. Normalización del monto
- **Decision**: quitar `$`, espacios y separadores `.`/`,`, y aceptar solo dígitos restantes. Un valor con decimales (`1500,50`, `1.500.50`) se rechaza con `amountPositive` cuando no se puede interpretar como entero (patrón: si el último separador tiene exactamente 1-2 dígitos detrás, es decimal → inválido).
- **Rationale**: COP sin decimales; coincide con `parseAmount` del formulario pero sin aceptar decimales silenciosamente.
- **Alternatives**: redondear (pierde datos sin avisar).

## D4. Validación por fila reutilizando `validateExpenseInput`
- **Decision**: cada fila se mapea a `ExpenseInput` (`categoryId` resuelto por nombre, `parentId: null`) y se valida con la función existente; los errores se convierten en `{line, column, code, params}`.
- **Rationale**: una sola fuente de verdad de las reglas (monto, fecha, nota ≤ 140) y los códigos ya traducidos en `validation.json`.
- **Alternatives**: duplicar reglas en el importador (riesgo de divergencia).

## D5. Resolución de categoría por nombre
- **Decision**: mapa `lower(trim(name)) → id` con las categorías del usuario (provistas por la action desde `categoryRepository.list`). Sin coincidencia → `unknownCategory`.
- **Rationale**: el índice único `(userId, lower(name))` garantiza que no hay ambigüedad.

## D6. Rechazo de columnas de pago padre
- **Decision**: el conjunto de encabezados debe ser exactamente `category, amount, paidOn, note` (en cualquier orden, sin distinguir mayúsculas); faltantes → `missingColumn`, extras (incluye `parent`, `parentId`) → `unknownColumn`. `parentId` jamás se lee del archivo.
- **Rationale**: cumple el requisito de que el archivo no pueda asociar a un pago padre y evita ignorar silenciosamente datos del usuario.

## D7. Inserción atómica
- **Decision**: `createMany` verifica que todas las categorías pertenezcan al usuario (`select ... where id in (...) and user_id`) y hace un único `insert ... values (...)`; una sola sentencia SQL es atómica, igual que `copyToPeriod`.
- **Rationale**: todo o nada sin necesidad de transacción explícita; 500 filas caben en una sentencia.
- **Alternatives**: `db.transaction` con inserciones por fila (más lento, más complejo).

## D8. Vista previa sin estado en servidor
- **Decision**: dos server actions que reciben el mismo `FormData` (archivo + mes). `preview` valida y devuelve resumen; `import` **vuelve a validar** y guarda. El cliente conserva el `File` entre ambos pasos.
- **Rationale**: no hay almacenamiento temporal que mantener ni riesgo de confiar en datos de cliente; el archivo es ≤ 1 MB.
- **Alternatives**: guardar la vista previa en sesión/DB (estado innecesario); enviar filas ya parseadas del cliente (no confiable).

## D9. Descarga de la plantilla
- **Decision**: route handler `GET /monthly-expenses/template` autenticado con `getSessionUser()`, respuesta `text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="expenses-template.csv"`, con BOM para que Excel respete los acentos.
- **Rationale**: no existe patrón de descargas; los route handlers son la forma estándar en App Router y el middleware ya protege la ruta.

## D10. Límites
- **Decision**: 500 filas con datos y 1 MB; comprobar el tamaño en la action antes de leer el contenido (`file.size`).
- **Rationale**: acota memoria y tiempo; supera `MAX_COPY_BATCH = 200` pero cubre meses con muchos gastos pequeños.

## D11. Aviso de mes con gastos
- **Decision**: `countByPeriod(userId, period)` en el repositorio, devuelto en la vista previa.
- **Rationale**: consulta barata; evita duplicados accidentales sin impedir cargas legítimas.

## D12. i18n
- **Decision**: core devuelve códigos; el diálogo usa `useValidationMessage` y claves nuevas en `validation.json` y `expenses.json` en en/es (el test de paridad `messages.test.ts` las valida).
