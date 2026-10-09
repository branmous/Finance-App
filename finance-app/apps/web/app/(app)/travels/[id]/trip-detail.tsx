"use client";

import { formatCop } from "@finance-app/core/expenses";
import {
  TRIP_EXPENSE_CATEGORIES,
  computeSettlementPlan,
  computeTripSchedule,
  computeTripSummary,
  isTripSettled,
  splitAmount,
} from "@finance-app/core/travels";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { TRIP_CATEGORY_LABELS, TRIP_KIND_LABELS } from "@/lib/travel-labels";
import { formatTripDates, formatTripDay } from "@/lib/trip-dates";
import { useToday } from "@/lib/use-today";

import {
  addTripPerson,
  createTripSettlement,
  deleteTrip,
  deleteTripExpense,
  deleteTripSettlement,
  removeTripPerson,
  setTripExpensePayment,
  setTripExpenseShares,
} from "../actions";
import { TripFormDialog } from "../trip-form-dialog";
import { SettledStamp, TripPhaseBadge, TripPhaseDetail, TripProgress } from "../trip-status";
import { ExpenseFormDialog } from "./expense-form-dialog";
import type { TripData, TripExpenseItem, TripPerson, TripSettlementItem } from "./types";

type Props = {
  trip: TripData;
  people: TripPerson[];
  expenses: TripExpenseItem[];
  settlements: TripSettlementItem[];
};

const CHIP = "min-h-9 rounded-full border px-3 text-sm font-medium transition-colors";

export function TripDetail({ trip, people, expenses: savedExpenses, settlements }: Props) {
  const router = useRouter();
  const isGroup = trip.kind === "group";
  const nameOf = (id: string | null) => people.find((person) => person.id === id)?.name ?? "—";

  // The list is kept locally so toggling a person or a payment recalculates at once; the server
  // data replaces it as soon as it arrives.
  const [expenses, setExpenses] = useState(savedExpenses);
  useEffect(() => setExpenses(savedExpenses), [savedExpenses]);

  // `undefined` = closed, `null` = creating, an item = editing.
  const [editingExpense, setEditingExpense] = useState<TripExpenseItem | null | undefined>(undefined);
  const [deletingExpense, setDeletingExpense] = useState<TripExpenseItem | null>(null);
  const [editingTrip, setEditingTrip] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [newPerson, setNewPerson] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const summary = useMemo(
    () => computeTripSummary(people, expenses, settlements),
    [people, expenses, settlements],
  );

  const settled = isTripSettled(summary, expenses.length);
  const today = useToday();
  const schedule = today ? computeTripSchedule(trip.startDate, trip.endDate, today) : null;

  // What is still to be paid to leave everyone at zero; recorded payments are already in the balances.
  const transfers = useMemo(() => computeSettlementPlan(summary.people), [summary.people]);
  const pendingCount = expenses.filter((expense) => expense.status === "pending").length;

  function run(action: () => Promise<{ ok: boolean; message?: string }>, onFail?: () => void) {
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        onFail?.();
        setNotice(result.message ?? "Something went wrong. Try again.");
      }
    });
  }

  function patchExpense(id: string, patch: Partial<TripExpenseItem>) {
    setExpenses((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function toggleShare(expense: TripExpenseItem, personId: string) {
    const next = people
      .map((person) => person.id)
      .filter((id) => (id === personId ? !expense.shareIds.includes(id) : expense.shareIds.includes(id)));
    if (next.length === 0) {
      setNotice("An expense needs at least one person.");
      return;
    }
    patchExpense(expense.id, { shareIds: next });
    run(() => setTripExpenseShares(trip.id, expense.id, next), () => patchExpense(expense.id, { shareIds: expense.shareIds }));
  }

  function setPayment(expense: TripExpenseItem, paidById: string | null) {
    patchExpense(expense.id, { paidById, status: paidById ? "paid" : "pending" });
    run(
      () => setTripExpensePayment(trip.id, expense.id, paidById),
      () => patchExpense(expense.id, { paidById: expense.paidById, status: expense.status }),
    );
  }

  function confirmDeleteExpense() {
    if (!deletingExpense) return;
    const target = deletingExpense;
    setDeletingExpense(null);
    run(() => deleteTripExpense(trip.id, target.id));
  }

  function confirmDeleteTrip() {
    startTransition(async () => {
      const result = await deleteTrip(trip.id);
      if (result.ok) router.push("/travels");
      else {
        setDeletingTrip(false);
        setNotice(result.message);
      }
    });
  }

  function handleAddPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newPerson;
    run(
      async () => {
        const result = await addTripPerson(trip.id, name);
        if (result.ok) setNewPerson("");
        return result;
      },
    );
  }

  const dates = formatTripDates(trip.startDate, trip.endDate);
  const categoryTotals = TRIP_EXPENSE_CATEGORIES.filter((category) => summary.byCategory[category]);

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/travels" className="inline-flex items-center gap-1 text-sm font-semibold text-leaf">
        <Icon name="chevronLeft" width={16} height={16} />
        All trips
      </Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{trip.name}</h1>
          <p className="mt-1.5 text-paper-muted">
            {TRIP_KIND_LABELS[trip.kind]} trip
            {dates ? ` · ${dates}` : ""}
            {isGroup ? ` · ${people.length} people` : ""}
          </p>
          {(schedule && schedule.phase !== "undated") || settled ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              {schedule ? <TripPhaseBadge schedule={schedule} /> : null}
              {schedule ? <TripPhaseDetail schedule={schedule} className="text-sm font-medium" /> : null}
              {settled ? <SettledStamp size="lg" /> : null}
            </div>
          ) : null}
          {schedule ? (
            <div className="mt-3 max-w-sm">
              <TripProgress schedule={schedule} />
            </div>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditingTrip(true)} aria-label="Edit trip">
            <Icon name="pencil" width={18} height={18} />
            Edit
          </Button>
          <Button variant="secondary" className="hover:text-clay" onClick={() => setDeletingTrip(true)} aria-label="Delete trip">
            <Icon name="trash" width={18} height={18} />
            Delete
          </Button>
        </div>
      </div>

      {notice ? (
        <p role="alert" className="mt-4 rounded-field bg-clay-tint px-3 py-2.5 text-sm text-clay">
          {notice}
        </p>
      ) : null}

      <section aria-label="Totals" className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-panel bg-ink p-6 text-paper sm:col-span-1">
          <h2 className="text-sm font-medium text-ink-muted">Total cost</h2>
          <p className="mt-2 font-display text-4xl font-semibold" data-testid="trip-total">
            {formatCop(summary.totalMinor)}
          </p>
        </div>
        <div className="rounded-panel border border-paper-line bg-paper-raised p-6">
          <h2 className="text-sm font-medium text-paper-muted">Paid</h2>
          <p className="mt-2 font-display text-3xl font-semibold" data-testid="trip-paid">
            {formatCop(summary.paidMinor)}
          </p>
        </div>
        <div className="rounded-panel border border-paper-line bg-paper-raised p-6">
          <h2 className="text-sm font-medium text-paper-muted">Still to pay</h2>
          <p className="mt-2 font-display text-3xl font-semibold" data-testid="trip-pending">
            {formatCop(summary.pendingMinor)}
          </p>
        </div>
      </section>

      {categoryTotals.length > 0 ? (
        <ul aria-label="By category" className="mt-4 flex flex-wrap gap-2">
          {categoryTotals.map((category) => (
            <li key={category} className="rounded-full bg-leaf-tint px-3 py-1 text-sm">
              {TRIP_CATEGORY_LABELS[category]}{" "}
              <strong className="tabular-nums">{formatCop(summary.byCategory[category] ?? 0)}</strong>
            </li>
          ))}
        </ul>
      ) : null}

      {isGroup ? (
        <section aria-labelledby="balances" className="mt-10">
          <h2 id="balances" className="text-xl font-semibold">
            Who owes whom
          </h2>
          <p className="mt-1 text-sm text-paper-muted">
            Based on paid expenses. Positive means the others owe them; negative means they owe.
          </p>
          <ul className="mt-4 divide-y divide-paper-line border-y border-paper-line">
            {summary.people.map((person, index) => (
              <li key={person.id} className="flex items-center gap-3 py-3" data-testid={`balance-${person.name}`}>
                <span
                  aria-label={`Person ${index + 1}`}
                  className="w-7 shrink-0 text-right text-sm font-semibold tabular-nums text-paper-muted"
                  data-testid="person-number"
                >
                  {index + 1}.
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{person.name}</p>
                  <p className="text-sm text-paper-muted">
                    Put in {formatCop(person.paidMinor)} · their part {formatCop(person.owedMinor)}
                    {person.pendingShareMinor > 0 ? ` · ${formatCop(person.pendingShareMinor)} still to pay` : ""}
                  </p>
                </div>
                <span
                  className={`font-semibold tabular-nums ${
                    person.balanceMinor > 0 ? "text-leaf" : person.balanceMinor < 0 ? "text-clay" : "text-paper-muted"
                  }`}
                >
                  {person.balanceMinor > 0
                    ? `is owed ${formatCop(person.balanceMinor)}`
                    : person.balanceMinor < 0
                      ? `owes ${formatCop(-person.balanceMinor)}`
                      : "settled up"}
                </span>
                {index === 0 ? null : (
                  <Button
                    variant="ghost"
                    className="px-2.5 hover:text-clay"
                    onClick={() => run(() => removeTripPerson(trip.id, person.id))}
                    aria-label={`Remove ${person.name}`}
                  >
                    <Icon name="close" width={18} height={18} />
                  </Button>
                )}
              </li>
            ))}
          </ul>

          <form onSubmit={handleAddPerson} className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="new-person" className="text-sm font-medium">
                Add a person
              </label>
              <input
                id="new-person"
                value={newPerson}
                onChange={(event) => setNewPerson(event.target.value)}
                className="mt-1.5 block min-h-11 w-56 rounded-field border border-paper-line bg-paper-raised px-3 text-base text-ink focus:border-leaf"
              />
            </div>
            <Button type="submit" variant="secondary" loading={pending} disabled={newPerson.trim() === ""}>
              Add person
            </Button>
          </form>
        </section>
      ) : null}

      <section aria-labelledby="expenses" className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="expenses" className="text-xl font-semibold">
            Expenses
          </h2>
          <Button onClick={() => setEditingExpense(null)}>
            <Icon name="plus" width={18} height={18} />
            New expense
          </Button>
        </div>

        {expenses.length === 0 ? (
          <p className="mt-4 rounded-panel border border-dashed border-paper-line px-6 py-10 text-center text-sm text-paper-muted">
            No expenses yet. Add the flights, hotel and anything else this trip costs.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-paper-line border-y border-paper-line">
            {expenses.map((expense) => {
              const shares = splitAmount(expense.amountMinor, expense.shareIds);
              const eachShare = Math.max(0, ...Object.values(shares));
              return (
                <li key={expense.id} className="py-4" data-testid="expense-row">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{expense.description}</p>
                      <p className="text-sm text-paper-muted">
                        {TRIP_CATEGORY_LABELS[expense.category]}
                        {expense.spentOn ? ` · ${formatTripDay(expense.spentOn)}` : ""}
                        {expense.status === "paid" && isGroup ? ` · paid by ${nameOf(expense.paidById)}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums">{formatCop(expense.amountMinor)}</p>
                      <p className={`text-xs font-semibold ${expense.status === "paid" ? "text-leaf" : "text-saffron"}`}>
                        {expense.status === "paid" ? "Paid" : "Pending"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      className="px-2.5"
                      onClick={() => setEditingExpense(expense)}
                      aria-label={`Edit ${expense.description}`}
                    >
                      <Icon name="pencil" width={18} height={18} />
                    </Button>
                    <Button
                      variant="ghost"
                      className="px-2.5 hover:text-clay"
                      onClick={() => setDeletingExpense(expense)}
                      aria-label={`Delete ${expense.description}`}
                    >
                      <Icon name="trash" width={18} height={18} />
                    </Button>
                  </div>

                  {isGroup ? (
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <div className="flex flex-wrap gap-2" role="group" aria-label={`Who pays for ${expense.description}`}>
                        {people.map((person) => {
                          const on = expense.shareIds.includes(person.id);
                          return (
                            <button
                              key={person.id}
                              type="button"
                              aria-pressed={on}
                              aria-label={`${person.name} pays for ${expense.description}`}
                              onClick={() => toggleShare(expense, person.id)}
                              className={`${CHIP} ${
                                on
                                  ? "border-leaf bg-leaf-tint text-leaf"
                                  : "border-paper-line text-paper-muted line-through hover:bg-leaf-tint"
                              }`}
                            >
                              {person.name}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-sm text-paper-muted" data-testid="expense-each">
                        {formatCop(eachShare)} each
                      </p>
                      <select
                        aria-label={`Paid by for ${expense.description}`}
                        value={expense.paidById ?? ""}
                        onChange={(event) => setPayment(expense, event.target.value === "" ? null : event.target.value)}
                        className="min-h-9 rounded-field border border-paper-line bg-paper-raised px-2 text-sm"
                      >
                        <option value="">Not paid yet</option>
                        {people.map((person) => (
                          <option key={person.id} value={person.id}>
                            Paid by {person.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <Button
                        variant="secondary"
                        onClick={() => setPayment(expense, expense.status === "paid" ? null : people[0]!.id)}
                        aria-label={`${expense.status === "paid" ? "Mark pending" : "Mark paid"}: ${expense.description}`}
                      >
                        {expense.status === "paid" ? "Mark as pending" : "Mark as paid"}
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {isGroup ? (
        <section aria-labelledby="settle" className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="settle" className="text-xl font-semibold">
              Settle up
            </h2>
            <Button variant={settleOpen ? "secondary" : "primary"} onClick={() => setSettleOpen((open) => !open)} aria-expanded={settleOpen}>
              {settleOpen ? "Hide" : "Settle up"}
            </Button>
          </div>
          <p className="mt-1 text-sm text-paper-muted">
            Works out who pays whom, with the fewest transfers, so everyone ends up even.
          </p>

          {settleOpen ? (
            <div className="mt-4" data-testid="settle-panel">
              {transfers.length === 0 ? (
                <div
                  className={`flex items-center gap-3 rounded-panel px-4 py-3 text-sm font-medium ${
                    settled ? "animate-stamp border border-leaf bg-leaf-tint text-leaf" : "bg-leaf-tint text-leaf"
                  }`}
                >
                  {settled ? <Icon name="checkCircle" width={22} height={22} /> : null}
                  <p>
                    {summary.paidMinor > 0 || settlements.length > 0
                      ? "Everyone is settled up."
                      : "Nothing to settle yet. Mark some expenses as paid first."}
                    {settled ? " Every expense is paid and nobody owes anyone." : ""}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-paper-line border-y border-paper-line">
                  {transfers.map((transfer) => (
                    <li key={`${transfer.fromId}-${transfer.toId}`} className="flex items-center gap-3 py-3" data-testid="transfer-row">
                      <p className="min-w-0 flex-1">
                        <strong>{nameOf(transfer.fromId)}</strong> pays <strong>{nameOf(transfer.toId)}</strong>
                      </p>
                      <span className="font-semibold tabular-nums">{formatCop(transfer.amountMinor)}</span>
                      <Button
                        variant="secondary"
                        loading={pending}
                        onClick={() =>
                          run(() =>
                            createTripSettlement(trip.id, {
                              fromId: transfer.fromId,
                              toId: transfer.toId,
                              amountMinor: transfer.amountMinor,
                              paidOn: null,
                            }),
                          )
                        }
                        aria-label={`Mark as paid: ${nameOf(transfer.fromId)} pays ${nameOf(transfer.toId)}`}
                      >
                        Mark as paid
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {pendingCount > 0 ? (
                <p className="mt-3 text-sm text-paper-muted">
                  {pendingCount} {pendingCount === 1 ? "expense is" : "expenses are"} still pending and not included.
                </p>
              ) : null}
            </div>
          ) : null}

          {settlements.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-paper-muted">Payments made</h3>
              <ul className="mt-2 divide-y divide-paper-line border-y border-paper-line">
                {settlements.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-3">
                    <p className="min-w-0 flex-1 truncate">
                      <strong>{nameOf(item.fromId)}</strong> paid <strong>{nameOf(item.toId)}</strong>
                      {item.paidOn ? <span className="text-paper-muted"> · {formatTripDay(item.paidOn)}</span> : null}
                    </p>
                    <span className="font-semibold tabular-nums">{formatCop(item.amountMinor)}</span>
                    <Button
                      variant="ghost"
                      className="px-2.5 hover:text-clay"
                      onClick={() => run(() => deleteTripSettlement(trip.id, item.id))}
                      aria-label={`Undo payment from ${nameOf(item.fromId)} to ${nameOf(item.toId)}`}
                    >
                      <Icon name="trash" width={18} height={18} />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <ExpenseFormDialog
        open={editingExpense !== undefined}
        tripId={trip.id}
        expense={editingExpense ?? null}
        people={people}
        isGroup={isGroup}
        onClose={() => setEditingExpense(undefined)}
      />

      <TripFormDialog
        open={editingTrip}
        trip={{ id: trip.id, name: trip.name, startDate: trip.startDate, endDate: trip.endDate }}
        onClose={() => setEditingTrip(false)}
      />

      <Dialog open={deletingExpense !== null} title="Delete expense" onClose={() => setDeletingExpense(null)}>
        <p className="text-sm text-paper-muted">
          Delete <strong className="text-ink">{deletingExpense?.description}</strong> (
          {deletingExpense ? formatCop(deletingExpense.amountMinor) : ""})? The balances will be recalculated.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeletingExpense(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDeleteExpense} loading={pending}>
            Delete expense
          </Button>
        </div>
      </Dialog>

      <Dialog open={deletingTrip} title="Delete trip" onClose={() => setDeletingTrip(false)}>
        <p className="text-sm text-paper-muted">
          Delete <strong className="text-ink">{trip.name}</strong> with all its expenses and payments? This cannot be
          undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeletingTrip(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDeleteTrip} loading={pending}>
            Delete trip
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
