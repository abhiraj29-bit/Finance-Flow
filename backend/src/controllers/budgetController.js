import { Budget } from "../models/Budget.js";
import { emitFinanceUpdate } from "../lib/socket.js";
import { budgetSchema } from "../validators/financeValidators.js";

export async function listBudgets(_req, res) {
  const budgets = await Budget.find().sort({ category: 1 });
  res.json(budgets);
}

export async function upsertBudget(req, res) {
  const payload = budgetSchema.parse(req.body);

  const budget = await Budget.findOneAndUpdate(
    { category: payload.category, month: payload.month },
    payload,
    { new: true, upsert: true }
  );

  emitFinanceUpdate("finance:updated", {
    resource: "budget",
    action: "upserted",
    id: budget._id,
  });

  res.status(201).json(budget);
}

