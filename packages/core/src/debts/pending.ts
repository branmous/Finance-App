import { installmentAmount, installmentPeriods, type DebtKind } from "./debt";

/** The part of a debt needed to work out the installments it still owes in a month. */
export type PendingDebtSource = {
  id: string;
  name: string;
  categoryId: string;
  kind: DebtKind;
  installmentMinor: number;
  totalMinor: number | null;
  startPeriod: string;
  totalInstallments: number;
};

/** An installment due in a month that has no expense yet. */
export type PendingInstallment = {
  debtId: string;
  debtName: string;
  categoryId: string;
  period: string;
  amountMinor: number;
};

/**
 * The installments of `period` that nobody has registered yet. A debt whose id is in
 * `registeredDebtIds` already has an expense (paid or pending) that month, so it is left out.
 */
export function pendingInstallmentsForPeriod(
  debts: PendingDebtSource[],
  period: string,
  registeredDebtIds: Iterable<string>,
): PendingInstallment[] {
  const registered = new Set(registeredDebtIds);
  return debts
    .filter((debt) => !registered.has(debt.id) && installmentPeriods(debt).includes(period))
    .map((debt) => ({
      debtId: debt.id,
      debtName: debt.name,
      categoryId: debt.categoryId,
      period,
      amountMinor: installmentAmount(debt, period),
    }));
}
