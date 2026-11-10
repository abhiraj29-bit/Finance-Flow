import mongoose from "mongoose";
import { Budget } from "../models/Budget.js";
import { Goal } from "../models/Goal.js";
import { Transaction } from "../models/Transaction.js";
import { getCurrentMonthKey } from "../utils/month.js";

function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export async function getSummary(req, res) {
  const userObjectId = new mongoose.Types.ObjectId(req.user._id);
  const monthKey =
    req.query.month && /^\d{4}-\d{2}$/.test(req.query.month)
      ? req.query.month
      : getCurrentMonthKey();
  const monthStart = new Date(`${monthKey}-01T00:00:00.000Z`);
  const nextMonthStart = new Date(monthStart);
  nextMonthStart.setUTCMonth(nextMonthStart.getUTCMonth() + 1);

  const [generalTotals, goalTotals, budgets, categorySpend, trends, goals, allUserBudgets] = await Promise.all([
    // General Cash Transactions (Add Transaction & Recurring)
    Transaction.aggregate([
      {
        $match: {
          userId: userObjectId,
          source: { $ne: "goal-allocation" },
        },
      },
      {
        $group: {
          _id: "$kind",
          total: { $sum: "$amount" },
        },
      },
    ]),
    // Sinking Fund Transactions
    Transaction.aggregate([
      {
        $match: {
          userId: userObjectId,
          source: "goal-allocation",
        },
      },
      {
        $group: {
          _id: "$kind",
          total: { $sum: "$amount" },
        },
      },
    ]),
    Budget.find({ userId: req.user._id, month: monthKey }).lean(),
    Transaction.aggregate([
      {
        $match: {
          userId: userObjectId,
          kind: "expense",
          source: { $ne: "goal-allocation" },
          date: { $gte: monthStart, $lt: nextMonthStart },
        },
      },
      {
        $group: {
          _id: "$category",
          spent: { $sum: "$amount" },
        },
      },
      {
        $sort: { spent: -1 },
      },
    ]),
    Transaction.aggregate([
      {
        $match: {
          userId: userObjectId,
          source: { $ne: "goal-allocation" },
        },
      },
      {
        $addFields: {
          month: {
            $dateToString: {
              format: "%Y-%m",
              date: "$date",
            },
          },
        },
      },
      {
        $group: {
          _id: {
            month: "$month",
            kind: "$kind",
          },
          total: { $sum: "$amount" },
        },
      },
      {
        $sort: { "_id.month": 1 },
      },
    ]),
    Goal.find({ userId: req.user._id }).lean(),
    Budget.find({ userId: req.user._id }).select("month").lean(),
  ]);

  const generalTotalsMap = generalTotals.reduce(
    (acc, item) => {
      acc[item._id] = roundCurrency(item.total);
      return acc;
    },
    { income: 0, expense: 0 }
  );

  const goalTotalsMap = goalTotals.reduce(
    (acc, item) => {
      acc[item._id] = roundCurrency(item.total);
      return acc;
    },
    { income: 0, expense: 0 }
  );

  const budgetProgress = budgets.map((budget) => {
    const matchingSpend = categorySpend.find(
      (item) => item._id && item._id.trim().toLowerCase() === budget.category.trim().toLowerCase()
    );
    const spent = roundCurrency(matchingSpend?.spent || 0);

    return {
      id: budget._id,
      category: budget.category,
      monthlyLimit: roundCurrency(budget.monthlyLimit),
      month: budget.month,
      spent,
      remaining: roundCurrency(Math.max(0, budget.monthlyLimit - spent)),
      exceeded: spent > budget.monthlyLimit,
    };
  });

  const availableBudgetMonths = Array.from(
    new Set(allUserBudgets.map((b) => b.month).filter(Boolean))
  ).sort();

  const trendMap = new Map();
  for (const item of trends) {
    const key = item._id.month;
    const existing = trendMap.get(key) || { month: key, income: 0, expense: 0 };
    existing[item._id.kind] = roundCurrency(item.total);
    trendMap.set(key, existing);
  }

  const totalSavedForGoals = roundCurrency(
    goals.reduce((sum, goal) => sum + (goal.currentAmount || 0), 0)
  );
  const totalTargetForGoals = roundCurrency(
    goals.reduce((sum, goal) => sum + (goal.targetAmount || 0), 0)
  );

  res.json({
    totals: {
      income: generalTotalsMap.income,
      expense: generalTotalsMap.expense,
      balance: roundCurrency(generalTotalsMap.income - generalTotalsMap.expense),
      lockedInGoals: totalSavedForGoals,
      general: {
        deposits: generalTotalsMap.income,
        withdrawals: generalTotalsMap.expense,
        balance: roundCurrency(generalTotalsMap.income - generalTotalsMap.expense),
      },
      sinkingFunds: {
        totalSaved: totalSavedForGoals,
        totalTarget: totalTargetForGoals,
        remaining: roundCurrency(Math.max(0, totalTargetForGoals - totalSavedForGoals)),
        deposits: goalTotalsMap.income,
        withdrawals: goalTotalsMap.expense,
      },
    },
    budgetMonth: monthKey,
    availableBudgetMonths,
    budgetProgress,
    trends: Array.from(trendMap.values()).slice(-6),
    goals,
  });
}
