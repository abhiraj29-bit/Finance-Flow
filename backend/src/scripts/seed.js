import { connectDatabase } from "../config/db.js";
import { env } from "../config/env.js";
import { Budget } from "../models/Budget.js";
import { Goal } from "../models/Goal.js";
import { Transaction } from "../models/Transaction.js";
import { seedBudgets, seedGoals, seedTransactions } from "../data/seedData.js";

async function seed() {
  await connectDatabase(env.mongoUri);

  await Promise.all([
    Transaction.deleteMany({}),
    Budget.deleteMany({}),
    Goal.deleteMany({}),
  ]);

  await Transaction.insertMany(
    seedTransactions.map((item) => ({
      ...item,
      date: new Date(item.date),
    }))
  );

  await Budget.insertMany(seedBudgets);

  await Goal.insertMany(
    seedGoals.map((item) => ({
      ...item,
      targetDate: new Date(item.targetDate),
    }))
  );

  console.log("FinanceFlow seed data inserted successfully");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Failed to seed FinanceFlow data", error);
  process.exit(1);
});

