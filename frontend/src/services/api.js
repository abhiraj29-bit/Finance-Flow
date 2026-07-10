import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5004/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach JWT token to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ff_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
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

export async function authRegister({ name, email, password }) {
  const res = await api.post("/auth/register", { name, email, password });
  return res.data;
}

export async function authLogin({ email, password }) {
  const res = await api.post("/auth/login", { email, password });
  return res.data;
}
