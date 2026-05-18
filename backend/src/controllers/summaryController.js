import { Budget } from "../models/Budget.js";
import { Goal } from "../models/Goal.js";
import { Transaction } from "../models/Transaction.js";
import { getCurrentMonthKey } from "../utils/month.js";

export async function getSummary(_req, res) {
  const monthKey = getCurrentMonthKey();
  const monthStart = new Date(`${monthKey}-01T00:00:00.000Z`);
  const nextMonthStart = new Date(monthStart);
  nextMonthStart.setUTCMonth(nextMonthStart.getUTCMonth() + 1);

  const [totals, budgets, categorySpend, trends, goals] = await Promise.all([
    Transaction.aggregate([
      {
        $group: {
          _id: "$kind",
          total: { $sum: "$amount" },
        },
      },
    ]),
    Budget.find({ month: monthKey }).lean(),
    Transaction.aggregate([
      {
        $match: {
          kind: "expense",
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
    Goal.find().lean(),
  ]);

  const totalsMap = totals.reduce(
    (acc, item) => {
      acc[item._id] = item.total;
      return acc;
    },
    { income: 0, expense: 0 }
  );

  const budgetProgress = budgets.map((budget) => {
    const matchingSpend = categorySpend.find((item) => item._id === budget.category);
    const spent = matchingSpend?.spent || 0;

    return {
      category: budget.category,
      monthlyLimit: budget.monthlyLimit,
      spent,
      remaining: Math.max(0, budget.monthlyLimit - spent),
      exceeded: spent > budget.monthlyLimit,
    };
  });

  const trendMap = new Map();
  for (const item of trends) {
    const key = item._id.month;
    const existing = trendMap.get(key) || { month: key, income: 0, expense: 0 };
    existing[item._id.kind] = item.total;
    trendMap.set(key, existing);
  }

  const totalSavedForGoals = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);

  res.json({
    totals: {
      income: totalsMap.income,
      expense: totalsMap.expense,
      balance: totalsMap.income - totalsMap.expense,
      lockedInGoals: totalSavedForGoals,
    },
    budgetProgress,
    trends: Array.from(trendMap.values()).slice(-6),
    goals,
  });
}

