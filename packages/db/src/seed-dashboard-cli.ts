/* eslint-disable no-console -- CLI entry point: console output is the interface */
import { eq } from "drizzle-orm";

import { categories } from "../schema/categories";
import { debts } from "../schema/debts";
import { expenses } from "../schema/expenses";
import { incomes } from "../schema/incomes";
import { createCategoryRepository } from "./category-repository";
import { createDbClient } from "./client";
import { createDebtRepository } from "./debt-repository";
import { createExpenseRepository } from "./expense-repository";
import { createIncomeRepository } from "./income-repository";
import { parseSeedArgs, seedUser } from "./seed-user";
import { createTripRepository } from "./trip-repository";
import { createUserRepository } from "./user-repository";

/**
 * Test fixture for the home dashboard e2e (specs/012-home-dashboard). Creates the user if needed, wipes
 * everything it owns and loads a known scenario in March and February 2020, long past so the numbers never move:
 *
 *   March 2020:    income 5.000.000 · Rent 1.500.000 (fixed) · Streaming 100.000 (subscription)
 *                  · Food 900.000 (household, unpaid) · a 6-installment debt of 200.000 starting in January
 *                  (all six overdue today) · a finished group trip with a 1.000.000 lodging expense, never
 *                  squared away (and not part of the month)
 *   February 2020: income 5.000.000 · Rent 1.500.000 · Streaming 100.000 · Food 600.000
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL environment variable is not set");

  const input = parseSeedArgs(process.argv.slice(2));
  const db = createDbClient(databaseUrl);
  const users = createUserRepository(db);
  await seedUser(users, input);
  const user = await users.findByIdentifier(input.email.trim().toLowerCase());
  if (!user) throw new Error("The seeded user could not be found");
  const userId = user.id;

  // Wipe in dependency order: trips (their own cleanup), expenses, debts, then what they point at.
  const tripRepo = createTripRepository(db);
  for (const trip of await tripRepo.list(userId)) await tripRepo.remove(userId, trip.id);
  await db.delete(expenses).where(eq(expenses.userId, userId));
  await db.delete(debts).where(eq(debts.userId, userId));
  await db.delete(incomes).where(eq(incomes.userId, userId));
  await db.delete(categories).where(eq(categories.userId, userId));

  const categoryRepo = createCategoryRepository(db);
  const expenseRepo = createExpenseRepository(db);
  const incomeRepo = createIncomeRepository(db);

  const rent = await categoryRepo.create(userId, { name: "Rent", type: "fixed", color: "#0f766e", icon: "home", paymentInfo: "" });
  const streaming = await categoryRepo.create(userId, { name: "Streaming", type: "subscription", color: "#ca8a04", icon: "repeat", paymentInfo: "" });
  const food = await categoryRepo.create(userId, { name: "Food", type: "household", color: "#16a34a", icon: "cart", paymentInfo: "" });

  const expense = (categoryId: string, period: string, amountMinor: number, paidOn: string | null) =>
    expenseRepo.create(userId, { categoryId, amountMinor, period, paidOn, note: "", parentId: null });
  await expense(rent.id, "2020-03", 1_500_000, "2020-04-02");
  await expense(streaming.id, "2020-03", 100_000, "2020-04-02");
  await expense(food.id, "2020-03", 900_000, null);
  await expense(rent.id, "2020-02", 1_500_000, "2020-03-02");
  await expense(streaming.id, "2020-02", 100_000, "2020-03-02");
  await expense(food.id, "2020-02", 600_000, "2020-03-02");

  for (const period of ["2020-03", "2020-02"]) {
    await incomeRepo.create(userId, { type: "payroll", amountMinor: 5_000_000, period, note: "" });
  }

  await createDebtRepository(db).create(
    userId,
    { kind: "monthly", name: "Car loan", categoryId: rent.id, installmentMinor: 200_000, totalMinor: null, startPeriod: "2020-01", totalInstallments: 6, alreadyPaid: 0, note: "" },
    new Date().toISOString().slice(0, 10),
  );

  const trip = await tripRepo.create(userId, {
    name: "Beach week",
    kind: "group",
    startDate: "2020-03-10",
    endDate: "2020-03-15",
    participants: ["Me", "Ana"],
  });
  const detail = await tripRepo.get(userId, trip.id);
  const shareIds = detail?.participants.map((person) => person.id) ?? [];
  await tripRepo.createExpense(userId, trip.id, {
    description: "Beach house",
    category: "lodging",
    amountMinor: 1_000_000,
    spentOn: "2020-03-10",
    status: "pending",
    paidById: null,
    shareIds,
  });

  console.log(`Seeded the dashboard scenario for ${input.email}.`);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
