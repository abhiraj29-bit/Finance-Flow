import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

export async function fetchDashboardData() {
  const [summary, transactions, budgets, goals] = await Promise.all([
    api.get("/summary"),
    api.get("/transactions"),
    api.get("/budgets"),
    api.get("/goals"),
  ]);

  return {
    summary: summary.data,
    transactions: transactions.data,
    budgets: budgets.data,
    goals: goals.data,
  };
}

