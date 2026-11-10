import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { Budget } from "../models/Budget.js";
import { Goal } from "../models/Goal.js";
import { RecurringTransaction } from "../models/RecurringTransaction.js";

export async function connectDatabase(uri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);

  // Initialize collections and indexes upfront to prevent catalog change errors in ACID transactions
  await Promise.all([
    User.createCollection().catch(() => {}),
    Transaction.createCollection().catch(() => {}),
    Budget.createCollection().catch(() => {}),
    Goal.createCollection().catch(() => {}),
    RecurringTransaction.createCollection().catch(() => {}),
  ]);

  await Promise.all([
    User.init().catch(() => {}),
    Transaction.init().catch(() => {}),
    Budget.init().catch(() => {}),
    Goal.init().catch(() => {}),
    RecurringTransaction.init().catch(() => {}),
  ]);
}
