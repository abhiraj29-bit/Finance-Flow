import mongoose from "mongoose";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { z } from "zod";
import { Transaction } from "../models/Transaction.js";
import { Budget } from "../models/Budget.js";
import { Goal } from "../models/Goal.js";
import { RecurringTransaction } from "../models/RecurringTransaction.js";
import { getCurrentMonthKey } from "../utils/month.js";

function formatCurrency(val) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val || 0);
}

/**
 * Creates tenant-isolated tools for a specific authenticated user.
 */
function createScopedTools(userId) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const getFinancialSummary = tool(
    async () => {
      const totals = await Transaction.aggregate([
        { $match: { userId: userObjectId } },
        { $group: { _id: "$kind", total: { $sum: "$amount" } } },
      ]);

      const income = totals.find((t) => t._id === "income")?.total || 0;
      const expense = totals.find((t) => t._id === "expense")?.total || 0;

      const goals = await Goal.find({ userId });
      const lockedInGoals = goals.reduce((s, g) => s + (g.currentAmount || 0), 0);

      return JSON.stringify({
        totalIncome: Math.round(income * 100) / 100,
        totalExpenses: Math.round(expense * 100) / 100,
        netBalance: Math.round((income - expense) * 100) / 100,
        lockedInGoals: Math.round(lockedInGoals * 100) / 100,
      });
    },
    {
      name: "get_financial_summary",
      description: "Get user's overall income, expenses, net balance, and money locked in sinking funds.",
      schema: z.object({}),
    }
  );

  const queryTransactions = tool(
    async ({ category, kind, limit = 10, startDate, endDate }) => {
      const filter = { userId };
      if (category) filter.category = new RegExp(category.trim(), "i");
      if (kind) filter.kind = kind;
      if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) filter.date.$lte = new Date(endDate);
      }

      const txs = await Transaction.find(filter)
        .sort({ date: -1 })
        .limit(Math.min(limit, 25))
        .select("amount kind category date note");

      const sum = txs.reduce((acc, t) => acc + t.amount, 0);

      return JSON.stringify({
        matchedCount: txs.length,
        totalAmount: Math.round(sum * 100) / 100,
        transactions: txs.map((t) => ({
          kind: t.kind,
          amount: t.amount,
          category: t.category,
          date: t.date?.toISOString().slice(0, 10),
          note: t.note,
        })),
      });
    },
    {
      name: "query_transactions",
      description: "Search user transactions by category, kind (income/expense), or date range.",
      schema: z.object({
        category: z.string().optional().describe("e.g. Groceries, Dining, Rent, Travel"),
        kind: z.enum(["income", "expense"]).optional(),
        limit: z.number().optional().default(10),
        startDate: z.string().optional().describe("YYYY-MM-DD"),
        endDate: z.string().optional().describe("YYYY-MM-DD"),
      }),
    }
  );

  const getBudgets = tool(
    async ({ month }) => {
      const monthKey = month || getCurrentMonthKey();
      const monthStart = new Date(`${monthKey}-01T00:00:00.000Z`);
      const nextMonthStart = new Date(monthStart);
      nextMonthStart.setUTCMonth(nextMonthStart.getUTCMonth() + 1);

      const [budgets, categorySpend] = await Promise.all([
        Budget.find({ userId, month: monthKey }).lean(),
        Transaction.aggregate([
          {
            $match: {
              userId: userObjectId,
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
        ]),
      ]);

      const progress = budgets.map((b) => {
        const matching = categorySpend.find((cs) => cs._id.toLowerCase() === b.category.toLowerCase());
        const spent = matching?.spent || 0;
        return {
          category: b.category,
          monthlyLimit: b.monthlyLimit,
          spent: Math.round(spent * 100) / 100,
          remaining: Math.round(Math.max(0, b.monthlyLimit - spent) * 100) / 100,
          isExceeded: spent > b.monthlyLimit,
        };
      });

      return JSON.stringify({ month: monthKey, budgets: progress });
    },
    {
      name: "get_budgets",
      description: "Get user's monthly budgets, spend progress, and exceeded warnings for a given month (YYYY-MM).",
      schema: z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/).optional().describe("Month in YYYY-MM format"),
      }),
    }
  );

  const getSinkingFunds = tool(
    async () => {
      const goals = await Goal.find({ userId }).sort({ targetDate: 1 });
      return JSON.stringify(
        goals.map((g) => ({
          name: g.name,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
          remaining: Math.max(0, g.targetAmount - g.currentAmount),
          isCompleted: g.isCompleted,
          targetDate: g.targetDate?.toISOString().slice(0, 10),
        }))
      );
    },
    {
      name: "get_sinking_funds",
      description: "Get all sinking funds/goals, saved progress, remaining amounts, and target dates.",
      schema: z.object({}),
    }
  );

  const getRecurringSchedules = tool(
    async () => {
      const schedules = await RecurringTransaction.find({ userId }).sort({ nextDueDate: 1 });
      return JSON.stringify(
        schedules.map((s) => ({
          category: s.category,
          amount: s.amount,
          kind: s.kind,
          frequency: s.frequency,
          nextDueDate: s.nextDueDate?.toISOString().slice(0, 10),
          isActive: s.isActive,
          description: s.description,
        }))
      );
    },
    {
      name: "get_recurring_schedules",
      description: "Get user's recurring transaction schedules, frequencies, and next due dates.",
      schema: z.object({}),
    }
  );

  return {
    getFinancialSummary,
    queryTransactions,
    getBudgets,
    getSinkingFunds,
    getRecurringSchedules,
  };
}

/**
 * Intelligent Deterministic Financial Heuristic Engine (Fallback Mode).
 * Evaluates live database records when no external LLM API key is configured.
 */
async function processHeuristicIntent(userId, message) {
  const lower = message.toLowerCase();
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // 1. Check for Financial Summary / Balance / Income Overview
  if (
    lower.includes("balance") ||
    lower.includes("summary") ||
    lower.includes("overview") ||
    lower.includes("financial health") ||
    lower.includes("how much money") ||
    (lower.includes("income") && !lower.includes("category"))
  ) {
    const [totals, goalsCount] = await Promise.all([
      Transaction.aggregate([
        { $match: { userId: userObjectId } },
        { $group: { _id: "$kind", total: { $sum: "$amount" } } },
      ]),
      Goal.countDocuments({ userId }),
    ]);

    const income = totals.find((t) => t._id === "income")?.total || 0;
    const expense = totals.find((t) => t._id === "expense")?.total || 0;
    const balance = income - expense;

    return (
      `Here is a snapshot of your **Financial Health**:\n\n` +
      `• **Total Income**: ${formatCurrency(income)}\n` +
      `• **Total Expenses**: ${formatCurrency(expense)}\n` +
      `• **Net Balance**: ${formatCurrency(balance)}\n` +
      `• **Active Sinking Funds**: ${goalsCount} tracked\n\n` +
      `You can ask me specific questions like:\n` +
      `• *"Am I over budget this month?"*\n` +
      `• *"What's the status of my sinking funds?"*\n` +
      `• *"How much did I spend on Groceries?"*\n` +
      `• *"What recurring bills do I have coming up?"*`
    );
  }

  // 2. Check for Sinking Funds / Goals
  if (lower.includes("sinking") || lower.includes("goal") || lower.includes("save") || lower.includes("fund")) {
    const goals = await Goal.find({ userId }).sort({ targetDate: 1 });
    if (!goals.length) {
      return "You don't have any sinking funds set up yet. You can create one under **New Sinking Fund** (e.g. for an emergency fund, travel, or a laptop upgrade).";
    }
    const lines = goals.map((g) => {
      const remaining = Math.max(0, g.targetAmount - g.currentAmount);
      const pct = Math.round((g.currentAmount / g.targetAmount) * 100);
      const status = g.isCompleted ? "✅ Fully funded!" : `(${formatCurrency(remaining)} left to save)`;
      return `• **${g.name}**: ${formatCurrency(g.currentAmount)} of ${formatCurrency(g.targetAmount)} (${pct}% funded) ${status}`;
    });
    return `Here is the current status of your **Sinking Funds**:\n\n${lines.join("\n")}\n\n*Tip: You can allocate money directly into any fund from the dashboard cards!*`;
  }

  // 3. Check for Budgets
  if (lower.includes("budget") || lower.includes("limit") || lower.includes("guardrail")) {
    const monthKey = getCurrentMonthKey();
    const monthStart = new Date(`${monthKey}-01T00:00:00.000Z`);
    const nextMonthStart = new Date(monthStart);
    nextMonthStart.setUTCMonth(nextMonthStart.getUTCMonth() + 1);

    const [budgets, spend] = await Promise.all([
      Budget.find({ userId, month: monthKey }),
      Transaction.aggregate([
        {
          $match: {
            userId: userObjectId,
            kind: "expense",
            date: { $gte: monthStart, $lt: nextMonthStart },
          },
        },
        { $group: { _id: "$category", spent: { $sum: "$amount" } } },
      ]),
    ]);

    if (!budgets.length) {
      return `You haven't set up any budgets for **${monthKey}**. You can add monthly limits by category under **Create Budget** on your dashboard.`;
    }

    const lines = budgets.map((b) => {
      const match = spend.find((s) => s._id.toLowerCase() === b.category.toLowerCase());
      const spent = match?.spent || 0;
      const remaining = Math.max(0, b.monthlyLimit - spent);
      const exceeded = spent > b.monthlyLimit;
      return `• **${b.category}**: ${formatCurrency(spent)} spent of ${formatCurrency(b.monthlyLimit)} limit ${
        exceeded ? "⚠️ **(OVER BUDGET!)**" : `(${formatCurrency(remaining)} remaining)`
      }`;
    });

    return `Here is your **Budget Health** for **${monthKey}**:\n\n${lines.join("\n")}`;
  }

  // 4. Check for Recurring / Subscriptions
  if (lower.includes("recurring") || lower.includes("subscription") || lower.includes("bill") || lower.includes("due")) {
    const schedules = await RecurringTransaction.find({ userId }).sort({ nextDueDate: 1 });
    if (!schedules.length) {
      return "You don't have any active recurring schedules configured. You can automate subscriptions (like rent, Netflix, or salary) under **Schedule Recurring Transaction**.";
    }
    const lines = schedules.map((s) => {
      const dueStr = s.nextDueDate ? new Date(s.nextDueDate).toLocaleDateString() : "—";
      return `• **${s.category}** (${s.frequency}): ${formatCurrency(s.amount)} [${s.kind}] — Next due on **${dueStr}** (${s.isActive ? "Active" : "Paused"})`;
    });
    return `Here are your configured **Recurring Schedules**:\n\n${lines.join("\n")}`;
  }

  // 5. Category-Specific Spend Query with whole-word regex matching
  const commonCategories = ["food", "dining", "groceries", "rent", "travel", "transport", "utilities", "entertainment", "health", "shopping"];
  const matchedCategory = commonCategories.find((cat) => new RegExp(`\\b${cat}\\b`, "i").test(message));

  if (matchedCategory) {
    const txs = await Transaction.find({
      userId,
      category: new RegExp(matchedCategory, "i"),
    }).sort({ date: -1 }).limit(10);

    const total = txs.reduce((acc, t) => acc + t.amount, 0);

    if (!txs.length) {
      return `You haven't logged any transactions under category matching **"${matchedCategory}"** yet.`;
    }

    const recent = txs.slice(0, 5).map((t) => {
      const dateStr = t.date ? new Date(t.date).toLocaleDateString() : "—";
      return `• ${dateStr}: ${formatCurrency(t.amount)} (${t.kind}) — ${t.note || "No note"}`;
    });

    return `You have **${txs.length} transactions** matching **"${matchedCategory}"** totaling **${formatCurrency(total)}**.\n\nRecent entries:\n${recent.join("\n")}`;
  }

  // 6. General fallback
  const [totals, goalsCount] = await Promise.all([
    Transaction.aggregate([
      { $match: { userId: userObjectId } },
      { $group: { _id: "$kind", total: { $sum: "$amount" } } },
    ]),
    Goal.countDocuments({ userId }),
  ]);

  const income = totals.find((t) => t._id === "income")?.total || 0;
  const expense = totals.find((t) => t._id === "expense")?.total || 0;
  const balance = income - expense;

  return (
    `Here is a snapshot of your **Financial Health**:\n\n` +
    `• **Total Income**: ${formatCurrency(income)}\n` +
    `• **Total Expenses**: ${formatCurrency(expense)}\n` +
    `• **Net Balance**: ${formatCurrency(balance)}\n` +
    `• **Active Sinking Funds**: ${goalsCount} tracked\n\n` +
    `Feel free to ask me:\n` +
    `• *"How much did I spend on dining?"*\n` +
    `• *"Am I over budget?"*\n` +
    `• *"What sinking funds are currently active?"*`
  );
}

/**
 * Main Chat Processing Dispatcher.
 * Uses LangChain Tool-Calling with OpenAI when API key is set;
 * Gracefully falls back to the deterministic heuristic engine otherwise.
 */
export async function processChatQuery(userId, userMessage, conversationHistory = []) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  // Mode 1: Full LLM Tool-Calling Agent
  if (apiKey) {
    try {
      const toolsMap = createScopedTools(userId);
      const toolsList = Object.values(toolsMap);

      const model = new ChatOpenAI({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.1,
        apiKey,
      }).bindTools(toolsList);

      const systemPrompt = new SystemMessage(
        "You are FinanceFlow AI, a helpful and precise personal finance assistant. " +
          "You have access to live database tools to inspect the user's financial summary, transactions, budgets, sinking funds, and recurring schedules. " +
          "Always use your tools to query the verified facts before answering. Never guess or hallucinate monetary figures. " +
          "Format all currency values in Indian Rupees (₹) with appropriate commas (e.g. ₹2,000, ₹15,000). " +
          "Be concise, encouraging, and provide clear actionable breakdowns."
      );

      const messages = [systemPrompt];

      // Append recent conversation history (up to last 6 turns)
      if (Array.isArray(conversationHistory)) {
        for (const item of conversationHistory.slice(-6)) {
          if (item.role === "user") {
            messages.push(new HumanMessage(item.content));
          } else if (item.role === "assistant") {
            messages.push(new SystemMessage(item.content));
          }
        }
      }

      messages.push(new HumanMessage(userMessage));

      // First LLM call — model decides which tools to call
      const aiResponse = await model.invoke(messages);
      messages.push(aiResponse);

      // Execute tool calls if requested
      if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
        for (const call of aiResponse.tool_calls) {
          const matchedTool = toolsList.find((t) => t.name === call.name);
          if (matchedTool) {
            const toolResult = await matchedTool.invoke(call.args);
            messages.push(
              new ToolMessage({
                tool_call_id: call.id,
                name: call.name,
                content: typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult),
              })
            );
          }
        }

        // Second LLM call to synthesize verified tool results into natural response
        const finalResponse = await model.invoke(messages);
        return {
          reply: finalResponse.content,
          mode: "llm-agent",
        };
      }

      return {
        reply: aiResponse.content,
        mode: "llm-agent",
      };
    } catch (llmError) {
      console.warn("LLM invocation encountered an error, using heuristic fallback:", llmError.message);
      // Fallback to deterministic heuristic engine on API failure
    }
  }

  // Mode 2: Deterministic Heuristic Engine
  const heuristicReply = await processHeuristicIntent(userId, userMessage);
  return {
    reply: heuristicReply,
    mode: "heuristic-engine",
  };
}
