import { connectDatabase } from "../config/db.js";
import { env } from "../config/env.js";
import { Budget } from "../models/Budget.js";
import { Goal } from "../models/Goal.js";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";
import { seedBudgets, seedGoals, seedTransactions } from "../data/seedData.js";

async function seed() {
  await connectDatabase(env.mongoUri);
  console.log("Connected to MongoDB for seeding...");

  // Ensure demo user exists
  let demoUser = await User.findOne({ email: "demo@financeflow.dev" });
  if (!demoUser) {
    demoUser = await User.create({
      name: "Demo User",
      email: "demo@financeflow.dev",
      password: "password123",
    });
    console.log("Created demo user: demo@financeflow.dev / password123");
  } else {
    console.log("Using existing demo user: demo@financeflow.dev");
  }

  // Clear demo user's existing records
  await Promise.all([
    Transaction.deleteMany({ userId: demoUser._id }),
    Budget.deleteMany({ userId: demoUser._id }),
    Goal.deleteMany({ userId: demoUser._id }),
  ]);

  await Transaction.insertMany(
    seedTransactions.map((item) => ({
      ...item,
      userId: demoUser._id,
      date: new Date(item.date),
    }))
  );

  await Budget.insertMany(
    seedBudgets.map((item) => ({
      ...item,
      userId: demoUser._id,
    }))
  );

  await Goal.insertMany(
    seedGoals.map((item) => ({
      ...item,
      userId: demoUser._id,
      targetDate: new Date(item.targetDate),
    }))
  );

  console.log("FinanceFlow seed data inserted successfully for demo user.");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Failed to seed FinanceFlow data", error);
  process.exit(1);
});
