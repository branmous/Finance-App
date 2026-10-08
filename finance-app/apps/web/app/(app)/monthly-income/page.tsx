import { currentPeriod, isValidPeriod, type IncomeType } from "@finance-app/core";
import { createIncomeRepository } from "@finance-app/db";

import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

import type { IncomeItem } from "./income-form-dialog";
import { IncomeView } from "./income-view";

export const metadata = { title: "Monthly income · Finance App" };

type Props = { searchParams: { period?: string | string[] } };

export default async function MonthlyIncomePage({ searchParams }: Props) {
  const requested = Array.isArray(searchParams.period) ? searchParams.period[0] : searchParams.period;
  const thisMonth = currentPeriod();
  const period = isValidPeriod(requested) ? requested : thisMonth;

  const user = await getSessionUser();
  const rows = user ? await createIncomeRepository(getDb()).listByPeriod(user.id, period) : [];

  // The type was validated against the closed list on write.
  const incomes: IncomeItem[] = rows.map((row) => ({
    id: row.id,
    type: row.type as IncomeType,
    amountMinor: row.amountMinor,
    period: row.period,
    note: row.note,
  }));
  const total = incomes.reduce((sum, item) => sum + item.amountMinor, 0);

  return <IncomeView period={period} isCurrentPeriod={period === thisMonth} incomes={incomes} total={total} />;
}
