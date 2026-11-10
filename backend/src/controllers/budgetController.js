import { Budget } from "../models/Budget.js";
import { emitFinanceUpdate } from "../lib/socket.js";
import { budgetSchema } from "../validators/financeValidators.js";

export async function listBudgets(req, res) {
  const budgets = await Budget.find({ userId: req.user._id }).sort({ category: 1 });
  res.json(budgets);
}

export async function upsertBudget(req, res) {
  const payload = budgetSchema.parse(req.body);

  const budget = await Budget.findOneAndUpdate(
    { userId: req.user._id, category: payload.category, month: payload.month },
    { ...payload, userId: req.user._id },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  emitFinanceUpdate(
    "finance:updated",
    {
      resource: "budget",
      action: "upserted",
      id: budget._id,
    },
    req.user._id
  );

  res.status(201).json(budget);
}

export async function deleteBudget(req, res) {
  const budget = await Budget.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!budget) {
    const err = new Error("Budget not found");
    err.statusCode = 404;
    throw err;
  }

  emitFinanceUpdate(
    "finance:updated",
    {
      resource: "budget",
      action: "deleted",
      id: req.params.id,
    },
    req.user._id
  );

  res.json({ message: "Budget deleted successfully" });
}
