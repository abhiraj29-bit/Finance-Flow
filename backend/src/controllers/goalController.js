import mongoose from "mongoose";
import { Goal } from "../models/Goal.js";
import { Transaction } from "../models/Transaction.js";
import { emitFinanceUpdate } from "../lib/socket.js";
import {
  goalAllocationSchema,
  goalSchema,
  goalUpdateSchema,
} from "../validators/financeValidators.js";

function toPaise(amount) {
  return Math.round(Number(amount) * 100);
}

function fromPaise(paise) {
  return Math.round(paise) / 100;
}

export async function listGoals(req, res) {
  const goals = await Goal.find({ userId: req.user._id }).sort({ targetDate: 1 });
  res.json(goals);
}

export async function createGoal(req, res) {
  const payload = goalSchema.parse(req.body);
  const targetPaise = toPaise(payload.targetAmount);

  const goal = await Goal.create({
    ...payload,
    targetAmount: fromPaise(targetPaise),
    currentAmount: 0,
    isCompleted: false,
    targetDate: new Date(payload.targetDate),
    userId: req.user._id,
  });

  emitFinanceUpdate(
    "finance:updated",
    {
      resource: "goal",
      action: "created",
      id: goal._id,
    },
    req.user._id
  );

  res.status(201).json(goal);
}

export async function allocateToGoal(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    const error = new Error("Invalid goal ID format");
    error.statusCode = 400;
    throw error;
  }

  const payload = goalAllocationSchema.parse(req.body);
  const allocationPaise = toPaise(payload.amount);

  if (allocationPaise <= 0) {
    const error = new Error("Allocation amount must be greater than zero");
    error.statusCode = 400;
    throw error;
  }

  const clientKey = req.headers["idempotency-key"] || req.body.idempotencyKey;
  let updatedGoal;

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).session(session);

    if (!goal) {
      const error = new Error("Goal not found");
      error.statusCode = 404;
      throw error;
    }

    const currentPaise = toPaise(goal.currentAmount || 0);
    const targetPaise = toPaise(goal.targetAmount);
    const remainingPaise = targetPaise - currentPaise;

    if (remainingPaise <= 0) {
      const error = new Error("Goal is already fully funded");
      error.statusCode = 400;
      throw error;
    }

    if (allocationPaise > remainingPaise) {
      const maxRemaining = fromPaise(remainingPaise);
      const error = new Error(
        `Allocation amount exceeds remaining goal amount of ${maxRemaining}`
      );
      error.statusCode = 400;
      throw error;
    }

    const newCurrentPaise = currentPaise + allocationPaise;
    goal.currentAmount = fromPaise(newCurrentPaise);
    goal.isCompleted = newCurrentPaise >= targetPaise;
    await goal.save({ session });

    const idempotencyKey =
      clientKey ||
      `goal-alloc-${goal._id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    await Transaction.create(
      [
        {
          userId: req.user._id,
          kind: "income",
          amount: fromPaise(allocationPaise),
          category: "Sinking Fund Deposit",
          note: `Deposited into ${goal.name}`,
          source: "goal-allocation",
          goalId: goal._id,
          idempotencyKey,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    updatedGoal = goal;
  } catch (error) {
    await session.abortTransaction().catch(() => {});

    // If running on a standalone local MongoDB instance where multi-document transactions are disallowed by the engine
    const isStandaloneError =
      error.message?.includes("Transaction numbers are only allowed on a replica set member") ||
      error.message?.includes("standalone");

    if (!isStandaloneError) {
      throw error;
    }

    // Coordinated atomic operations with compensating rollback for standalone environments
    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!goal) {
      const notFound = new Error("Goal not found");
      notFound.statusCode = 404;
      throw notFound;
    }

    const currentPaise = toPaise(goal.currentAmount || 0);
    const targetPaise = toPaise(goal.targetAmount);
    const remainingPaise = targetPaise - currentPaise;

    if (remainingPaise <= 0) {
      const err = new Error("Goal is already fully funded");
      err.statusCode = 400;
      throw err;
    }

    if (allocationPaise > remainingPaise) {
      const maxRemaining = fromPaise(remainingPaise);
      const err = new Error(
        `Allocation amount exceeds remaining goal amount of ${maxRemaining}`
      );
      err.statusCode = 400;
      throw err;
    }

    const originalAmount = goal.currentAmount;
    const originalCompleted = goal.isCompleted;

    const newCurrentPaise = currentPaise + allocationPaise;
    goal.currentAmount = fromPaise(newCurrentPaise);
    goal.isCompleted = newCurrentPaise >= targetPaise;
    await goal.save();

    const idempotencyKey =
      clientKey ||
      `goal-alloc-${goal._id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      await Transaction.create({
        userId: req.user._id,
        kind: "income",
        amount: fromPaise(allocationPaise),
        category: "Sinking Fund Deposit",
        note: `Deposited into ${goal.name}`,
        source: "goal-allocation",
        goalId: goal._id,
        idempotencyKey,
      });
    } catch (txError) {
      // Compensating rollback on failure
      await Goal.updateOne(
        { _id: goal._id },
        { currentAmount: originalAmount, isCompleted: originalCompleted }
      );
      throw txError;
    }

    updatedGoal = goal;
  } finally {
    await session.endSession().catch(() => {});
  }

  emitFinanceUpdate(
    "finance:updated",
    {
      resource: "goal",
      action: "allocated",
      id: req.params.id,
    },
    req.user._id
  );

  res.json(updatedGoal);
}

export async function updateGoal(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    const error = new Error("Invalid goal ID format");
    error.statusCode = 400;
    throw error;
  }

  const payload = goalUpdateSchema.parse(req.body);

  const goal = await Goal.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!goal) {
    const error = new Error("Goal not found");
    error.statusCode = 404;
    throw error;
  }

  if (payload.name !== undefined) {
    goal.name = payload.name;
  }
  if (payload.targetAmount !== undefined) {
    goal.targetAmount = fromPaise(toPaise(payload.targetAmount));
  }
  if (payload.targetDate !== undefined) {
    goal.targetDate = new Date(payload.targetDate);
  }
  if (payload.color !== undefined) {
    goal.color = payload.color;
  }

  if (payload.currentAmount !== undefined) {
    const oldCurrentPaise = toPaise(goal.currentAmount || 0);
    const newCurrentPaise = toPaise(payload.currentAmount);
    goal.currentAmount = fromPaise(newCurrentPaise);

    const diff = newCurrentPaise - oldCurrentPaise;
    if (diff > 0) {
      await Transaction.create({
        userId: req.user._id,
        kind: "income",
        amount: fromPaise(diff),
        category: "Sinking Fund Deposit",
        note: `Adjustment deposit for ${goal.name}`,
        source: "goal-allocation",
        goalId: goal._id,
        idempotencyKey: `goal-adj-dep-${goal._id}-${Date.now()}`,
      });
    } else if (diff < 0) {
      await Transaction.create({
        userId: req.user._id,
        kind: "expense",
        amount: fromPaise(-diff),
        category: "Sinking Fund Withdrawal",
        note: `Adjustment withdrawal from ${goal.name}`,
        source: "goal-allocation",
        goalId: goal._id,
        idempotencyKey: `goal-adj-with-${goal._id}-${Date.now()}`,
      });
    }
  }

  goal.isCompleted = goal.currentAmount >= goal.targetAmount;
  await goal.save();

  emitFinanceUpdate(
    "finance:updated",
    {
      resource: "goal",
      action: "updated",
      id: goal._id,
    },
    req.user._id
  );

  res.json(goal);
}

export async function withdrawFromGoal(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    const error = new Error("Invalid goal ID format");
    error.statusCode = 400;
    throw error;
  }

  const payload = goalAllocationSchema.parse(req.body);
  const withdrawPaise = toPaise(payload.amount);

  if (withdrawPaise <= 0) {
    const error = new Error("Withdrawal amount must be greater than zero");
    error.statusCode = 400;
    throw error;
  }

  const goal = await Goal.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!goal) {
    const error = new Error("Goal not found");
    error.statusCode = 404;
    throw error;
  }

  const currentPaise = toPaise(goal.currentAmount || 0);

  if (withdrawPaise > currentPaise) {
    const maxWithdraw = fromPaise(currentPaise);
    const error = new Error(
      `Withdrawal amount exceeds current saved amount of ${maxWithdraw}`
    );
    error.statusCode = 400;
    throw error;
  }

  const newCurrentPaise = currentPaise - withdrawPaise;
  goal.currentAmount = fromPaise(newCurrentPaise);
  goal.isCompleted = false;
  await goal.save();

  // Create an individual Withdrawal transaction (expense) to preserve complete audit history
  await Transaction.create({
    userId: req.user._id,
    kind: "expense",
    amount: fromPaise(withdrawPaise),
    category: "Sinking Fund Withdrawal",
    note: `Withdrawn from ${goal.name}`,
    source: "goal-allocation",
    goalId: goal._id,
    idempotencyKey: `goal-withdraw-${goal._id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  });

  emitFinanceUpdate(
    "finance:updated",
    {
      resource: "goal",
      action: "withdrawn",
      id: req.params.id,
    },
    req.user._id
  );

  res.json(goal);
}

export async function deleteGoal(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    const error = new Error("Invalid goal ID format");
    error.statusCode = 400;
    throw error;
  }

  const goal = await Goal.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!goal) {
    const error = new Error("Goal not found");
    error.statusCode = 404;
    throw error;
  }

  // Clean up any linked allocation transactions for this deleted goal
  await Transaction.deleteMany({
    goalId: goal._id,
    userId: req.user._id,
    source: "goal-allocation",
  });

  emitFinanceUpdate(
    "finance:updated",
    {
      resource: "goal",
      action: "deleted",
      id: req.params.id,
    },
    req.user._id
  );

  res.json({ message: "Goal deleted successfully", id: req.params.id });
}

