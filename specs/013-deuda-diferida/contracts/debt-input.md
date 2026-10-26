# Contract: entrada y salida del módulo de deudas

La app no expone API pública; los contratos son las Server Actions de `apps/web/app/(app)/debts/actions.ts` y las funciones puras de `@finance-app/core`.

## Server Actions (`createDebt(input)`, `updateDebt(id, input)`)

`input` es una unión discriminada por `kind`. Si `kind` falta se asume `"monthly"`.

```ts
// monthly (comportamiento actual)
{ kind: "monthly", name, categoryId, installmentMinor, startPeriod, endPeriod, alreadyPaid, note }

// deferred
{ kind: "deferred", name, categoryId, totalMinor, months, startPeriod, alreadyPaid, note }
```

Resultado (sin cambios de forma): `{ ok: true } | { ok: false, errors?: DebtInputErrors, message?: ValidationError }`.

`DebtInputErrors` gana las claves `kind`, `totalMinor` y `months`.

### Códigos de error nuevos (`validation.json`, es y en)

| Código | Campo | Cuándo |
|--------|-------|--------|
| `totalAmountPositive` | `totalMinor` | no es entero > 0 |
| `invalidMonths` | `months` | no es entero 1..120 (usa `tooManyInstallments` sobre 120) |
| `totalTooSmall` | `totalMinor` | `floor(total / months) < 1` |
| `paidInstallmentsLocked` | `totalMinor` | editar total/meses de una diferida con cuotas pagadas |

## `@finance-app/core` (debts)

```ts
type DebtKind = "monthly" | "deferred";

installmentAmount(debt: { kind; installmentMinor; totalMinor; startPeriod; totalInstallments }, period: string): number
debtTotalMinor(debt): number                       // total adeudado, ambos tipos
deferredInstallmentMinor(totalMinor: number, months: number): number  // floor
debtProgress(debt, paidPeriods, nowPeriod): DebtProgress  // paidMinor/remainingMinor con montos reales
```

Invariantes: `Σ installmentAmount` sobre todos los periodos = `debtTotalMinor`; `monthly` equivale al cálculo anterior.

## `DebtWithProgress` (db → web)

Añade `kind: "monthly" | "deferred"` y `totalMinor: number | null`; el resto igual.
