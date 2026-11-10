import mongoose from "mongoose";
import { Transaction } from "../models/Transaction.js";
import { emitFinanceUpdate } from "../lib/socket.js";
import {
  transactionPatchSchema,
  transactionQuerySchema,
  transactionSchema,
  transactionUpdateSchema,
} from "../validators/financeValidators.js";

function roundCurrency(amount) {
  return Math.round(Number(amount) * 100) / 100;
}

export async function listTransactions(req, res) {
  const query = transactionQuerySchema.parse(req.query);

  const filter = {
    userId: req.user._id,
  };

  if (query.category) {
    filter.category = query.category;
  }

  if (query.kind) {
    filter.kind = query.kind;
  }

  if (query.source === "general") {
    filter.source = { $ne: "goal-allocation" };
  } else if (query.source && query.source !== "all") {
    filter.source = query.source;
  }

  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) {
      filter.date.$gte = new Date(query.startDate);
    }
    if (query.endDate) {
      filter.date.$lte = new Date(query.endDate);
    }
  }

  if (query.minAmount !== undefined || query.maxAmount !== undefined) {
    filter.amount = {};
    if (query.minAmount !== undefined) {
      filter.amount.$gte = roundCurrency(query.minAmount);
    }
    if (query.maxAmount !== undefined) {
      filter.amount.$lte = roundCurrency(query.maxAmount);
    }
  }

  const sortDirection = query.sortOrder === "asc" ? 1 : -1;
  const sort = { [query.sortBy]: sortDirection, _id: sortDirection };

  const skip = (query.page - 1) * query.limit;

  const [totalRecords, data] = await Promise.all([
    Transaction.countDocuments(filter),
    Transaction.find(filter).sort(sort).skip(skip).limit(query.limit),
  ]);

  res.json({
    data,
    pagination: {
      page: query.page,
      limit: query.limit,
      totalRecords,
      totalPages: Math.ceil(totalRecords / query.limit) || 1,
    },
  });
}

export async function createTransaction(req, res) {
  const payload = transactionSchema.parse(req.body);

  const transaction = await Transaction.create({
    ...payload,
    amount: roundCurrency(payload.amount),
    userId: req.user._id,
    date: payload.date ? new Date(payload.date) : new Date(),
  });

  emitFinanceUpdate(
    "finance:updated",
    {
      resource: "transaction",
      action: "created",
      id: transaction._id,
    },
    req.user._id
  );

  res.status(201).json(transaction);
}

export async function updateTransaction(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    const error = new Error("Invalid transaction ID format");
    error.statusCode = 400;
    throw error;
  }

  const payload = transactionUpdateSchema.parse(req.body);

  const transaction = await Transaction.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!transaction) {
    const error = new Error("Transaction not found");
    error.statusCode = 404;
    throw error;
  }

  transaction.kind = payload.kind;
  transaction.amount = roundCurrency(payload.amount);
  transaction.category = payload.category;
  if (payload.date) {
    transaction.date = new Date(payload.date);
  }
  transaction.note = payload.note !== undefined ? payload.note : "";

  await transaction.save();

  emitFinanceUpdate(
    "finance:updated",
    {
      resource: "transaction",
      action: "updated",
      id: transaction._id,
    },
    req.user._id
  );

  res.json(transaction);
}

export async function patchTransaction(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    const error = new Error("Invalid transaction ID format");
    error.statusCode = 400;
    throw error;
  }

  const payload = transactionPatchSchema.parse(req.body);

  const transaction = await Transaction.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!transaction) {
    const error = new Error("Transaction not found");
    error.statusCode = 404;
    throw error;
  }

  if (payload.kind !== undefined) transaction.kind = payload.kind;
  if (payload.amount !== undefined) transaction.amount = roundCurrency(payload.amount);
  if (payload.category !== undefined) transaction.category = payload.category;
  if (payload.date !== undefined) transaction.date = new Date(payload.date);
  if (payload.note !== undefined) transaction.note = payload.note;

  await transaction.save();

  emitFinanceUpdate(
    "finance:updated",
    {
      resource: "transaction",
      action: "patched",
      id: transaction._id,
    },
    req.user._id
  );

  res.json(transaction);
}

export async function deleteTransaction(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    const error = new Error("Invalid transaction ID format");
    error.statusCode = 400;
    throw error;
  }

  const transaction = await Transaction.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!transaction) {
    const error = new Error("Transaction not found");
    error.statusCode = 404;
    throw error;
  }

  emitFinanceUpdate(
    "finance:updated",
    {
      resource: "transaction",
      action: "deleted",
      id: req.params.id,
    },
    req.user._id
  );

  res.json({ message: "Transaction deleted successfully", id: req.params.id });
}
