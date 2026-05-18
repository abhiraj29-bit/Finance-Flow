import mongoose from "mongoose";
import { Goal } from "../models/Goal.js";
import { Transaction } from "../models/Transaction.js";
import { emitFinanceUpdate } from "../lib/socket.js";
import { goalAllocationSchema, goalSchema } from "../validators/financeValidators.js";

export async function listGoals(_req, res) {
  const goals = await Goal.find().sort({ targetDate: 1 });
  res.json(goals);
}

export async function createGoal(req, res) {
  const payload = goalSchema.parse(req.body);
  const goal = await Goal.create({
    ...payload,
    targetDate: new Date(payload.targetDate),
  });

  emitFinanceUpdate("finance:updated", {
    resource: "goal",
    action: "created",
    id: goal._id,
  });

  res.status(201).json(goal);
}

export async function allocateToGoal(req, res) {
  const payload = goalAllocationSchema.parse(req.body);
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const goal = await Goal.findById(req.params.id).session(session);

      if (!goal) {
        const error = new Error("Goal not found");
        error.statusCode = 404;
        throw error;
      }

      goal.currentAmount += payload.amount;
      goal.isCompleted = goal.currentAmount >= goal.targetAmount;
      await goal.save({ session });

      await Transaction.create(
        [
          {
            kind: "expense",
            amount: payload.amount,
            category: "Sinking Fund Allocation",
            note: `Allocated to ${goal.name}`,
            source: "goal-allocation",
            goalId: goal._id,
          },
        ],
        { session }
      );
    });
  } catch (error) {
    const transactionsUnsupported = error.message?.includes("Transaction numbers are only allowed on a replica set member");

    if (!transactionsUnsupported) {
      throw error;
    }

    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      const notFoundError = new Error("Goal not found");
      notFoundError.statusCode = 404;
      throw notFoundError;
    }

    goal.currentAmount += payload.amount;
    goal.isCompleted = goal.currentAmount >= goal.targetAmount;
    await goal.save();

    await Transaction.create({
      kind: "expense",
      amount: payload.amount,
      category: "Sinking Fund Allocation",
      note: `Allocated to ${goal.name}`,
      source: "goal-allocation",
      goalId: goal._id,
    });
  } finally {
    await session.endSession();
  }

  const updatedGoal = await Goal.findById(req.params.id);

  emitFinanceUpdate("finance:updated", {
    resource: "goal",
    action: "allocated",
    id: req.params.id,
  });

  res.json(updatedGoal);
}
