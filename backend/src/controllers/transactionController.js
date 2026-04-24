import { Transaction } from "../models/Transaction.js";
import { emitFinanceUpdate } from "../lib/socket.js";
import { transactionSchema } from "../validators/financeValidators.js";

export async function listTransactions(_req, res) {
  const transactions = await Transaction.find().sort({ date: -1, createdAt: -1 }).limit(50);
  res.json(transactions);
}

export async function createTransaction(req, res) {
  const payload = transactionSchema.parse(req.body);
  const transaction = await Transaction.create({
    ...payload,
    date: payload.date ? new Date(payload.date) : new Date(),
  });

  emitFinanceUpdate("finance:updated", {
    resource: "transaction",
    action: "created",
    id: transaction._id,
  });

  res.status(201).json(transaction);
}

