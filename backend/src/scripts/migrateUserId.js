import mongoose from "mongoose";
import { connectDatabase } from "../config/db.js";
import { env } from "../config/env.js";
import { Budget } from "../models/Budget.js";
import { Goal } from "../models/Goal.js";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";

async function runMigration() {
  await connectDatabase(env.mongoUri);
  console.log("Connected to MongoDB for userId migration inspection...");

  const args = process.argv.slice(2);
  const assignEmailIndex = args.indexOf("--assign-to-email");
  const targetEmail = assignEmailIndex !== -1 ? args[assignEmailIndex + 1] : null;
  const isArchive = args.includes("--archive");

  const unassignedFilter = {
    $or: [{ userId: { $exists: false } }, { userId: null }],
  };

  const [unassignedTransactions, unassignedBudgets, unassignedGoals] =
    await Promise.all([
      Transaction.countDocuments(unassignedFilter),
      Budget.countDocuments(unassignedFilter),
      Goal.countDocuments(unassignedFilter),
    ]);

  console.log("=== Legacy Records Without userId ===");
  console.log(`Transactions : ${unassignedTransactions}`);
  console.log(`Budgets      : ${unassignedBudgets}`);
  console.log(`Goals        : ${unassignedGoals}`);

  if (targetEmail) {
    const user = await User.findOne({ email: targetEmail.toLowerCase().trim() });
    if (!user) {
      console.error(`Error: User with email "${targetEmail}" not found.`);
      process.exit(1);
    }

    console.log(`\nAssigning unassigned records to user "${user.name}" (${user._id})...`);

    const [txResult, budgetResult, goalResult] = await Promise.all([
      Transaction.updateMany(unassignedFilter, { $set: { userId: user._id } }),
      Budget.updateMany(unassignedFilter, { $set: { userId: user._id } }),
      Goal.updateMany(unassignedFilter, { $set: { userId: user._id } }),
    ]);

    console.log(`Updated ${txResult.modifiedCount} transactions.`);
    console.log(`Updated ${budgetResult.modifiedCount} budgets.`);
    console.log(`Updated ${goalResult.modifiedCount} goals.`);
  } else if (isArchive) {
    console.log("\nArchiving unassigned legacy records to avoid data leakage...");
    const db = mongoose.connection.db;

    if (unassignedTransactions > 0) {
      const legacyTx = await Transaction.find(unassignedFilter).lean();
      await db.collection("legacy_unassigned_transactions").insertMany(legacyTx);
      await Transaction.deleteMany(unassignedFilter);
      console.log(`Archived ${unassignedTransactions} transactions.`);
    }

    if (unassignedBudgets > 0) {
      const legacyB = await Budget.find(unassignedFilter).lean();
      await db.collection("legacy_unassigned_budgets").insertMany(legacyB);
      await Budget.deleteMany(unassignedFilter);
      console.log(`Archived ${unassignedBudgets} budgets.`);
    }

    if (unassignedGoals > 0) {
      const legacyG = await Goal.find(unassignedFilter).lean();
      await db.collection("legacy_unassigned_goals").insertMany(legacyG);
      await Goal.deleteMany(unassignedFilter);
      console.log(`Archived ${unassignedGoals} goals.`);
    }
  } else {
    console.log(
      "\nDry run completed. To safely assign legacy records to a specific user, run:\n" +
        "  node src/scripts/migrateUserId.js --assign-to-email <user@example.com>\n" +
        "To archive them safely into legacy collections, run:\n" +
        "  node src/scripts/migrateUserId.js --archive\n"
    );
  }

  // Ensure old conflicting index is dropped if present
  try {
    const budgetIndexes = await Budget.collection.indexes();
    const oldIndex = budgetIndexes.find((idx) => idx.name === "category_1_month_1");
    if (oldIndex) {
      console.log("Dropping old global index category_1_month_1 from budgets...");
      await Budget.collection.dropIndex("category_1_month_1");
    }
  } catch (err) {
    // Index may not exist or collection not initialized
  }

  // Ensure new indexes are synced
  await Promise.all([
    Transaction.syncIndexes(),
    Budget.syncIndexes(),
    Goal.syncIndexes(),
  ]);

  console.log("Database indexes synchronized successfully.");
  await mongoose.disconnect();
  process.exit(0);
}

runMigration().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
