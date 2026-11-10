import mongoose from "mongoose";
import { RecurringTransaction } from "../models/RecurringTransaction.js";
import {
  recurringTransactionPatchSchema,
  recurringTransactionSchema,
} from "../validators/financeValidators.js";

function roundCurrency(amount) {
  return Math.round(Number(amount) * 100) / 100;
}

export async function listRecurringTransactions(req, res) {
  const recurring = await RecurringTransaction.find({
    userId: req.user._id,
  }).sort({ createdAt: -1 });

  res.json(recurring);
}

export async function createRecurringTransaction(req, res) {
  const payload = recurringTransactionSchema.parse(req.body);

  const start = new Date(payload.startDate);
  const end = payload.endDate ? new Date(payload.endDate) : null;

  if (end && end < start) {
    const error = new Error("End date cannot be earlier than start date");
    error.statusCode = 400;
    throw error;
  }

  const recurring = await RecurringTransaction.create({
    userId: req.user._id,
    amount: roundCurrency(payload.amount),
    category: payload.category,
    kind: payload.kind,
    description: payload.description || "",
    frequency: payload.frequency,
    startDate: start,
    nextDueDate: start,
    endDate: end,
    isActive: true,
  });

  res.status(201).json(recurring);
}

export async function patchRecurringTransaction(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    const error = new Error("Invalid recurring schedule ID format");
    error.statusCode = 400;
    throw error;
  }

  const payload = recurringTransactionPatchSchema.parse(req.body);

  const schedule = await RecurringTransaction.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!schedule) {
    const error = new Error("Recurring schedule not found");
    error.statusCode = 404;
    throw error;
  }

  if (payload.amount !== undefined) {
    schedule.amount = roundCurrency(payload.amount);
  }
  if (payload.category !== undefined) {
    schedule.category = payload.category;
  }
  if (payload.description !== undefined) {
    schedule.description = payload.description;
  }
  if (payload.frequency !== undefined) {
    schedule.frequency = payload.frequency;
  }
  if (payload.isActive !== undefined) {
    schedule.isActive = payload.isActive;
  }
  if (payload.endDate !== undefined) {
    schedule.endDate = payload.endDate ? new Date(payload.endDate) : null;
  }

  await schedule.save();

  res.json(schedule);
}

export async function deleteRecurringTransaction(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    const error = new Error("Invalid recurring schedule ID format");
    error.statusCode = 400;
    throw error;
  }

  const schedule = await RecurringTransaction.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!schedule) {
    const error = new Error("Recurring schedule not found");
    error.statusCode = 404;
    throw error;
  }

  res.json({
    message: "Recurring schedule deleted successfully",
    id: req.params.id,
  });
}
