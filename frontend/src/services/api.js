import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

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

// Automatically handle unauthorized (401) responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes("/auth/")) {
      localStorage.removeItem("ff_token");
      localStorage.removeItem("ff_user");
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export async function fetchDashboardData(transactionParams = { page: 1, limit: 10 }, budgetMonth = null) {
  const [summary, transactions, budgets, goals, recurring] = await Promise.all([
    api.get("/summary", { params: budgetMonth ? { month: budgetMonth } : {} }),
    api.get("/transactions", { params: transactionParams }),
    api.get("/budgets"),
    api.get("/goals"),
    api.get("/recurring-transactions").catch(() => ({ data: [] })),
  ]);

  return {
    summary: summary.data,
    transactions: transactions.data,
    budgets: budgets.data,
    goals: goals.data,
    recurring: recurring.data,
  };
}

export async function deleteBudget(id) {
  const res = await api.delete(`/budgets/${id}`);
  return res.data;
}

export async function fetchTransactions(params = {}) {
  const res = await api.get("/transactions", { params });
  return res.data;
}

export async function createTransaction(payload) {
  const res = await api.post("/transactions", payload);
  return res.data;
}

export async function updateTransaction(id, payload) {
  const res = await api.put(`/transactions/${id}`, payload);
  return res.data;
}

export async function patchTransaction(id, payload) {
  const res = await api.patch(`/transactions/${id}`, payload);
  return res.data;
}

export async function deleteTransaction(id) {
  const res = await api.delete(`/transactions/${id}`);
  return res.data;
}

export async function fetchRecurringTransactions() {
  const res = await api.get("/recurring-transactions");
  return res.data;
}

export async function createRecurringTransaction(payload) {
  const res = await api.post("/recurring-transactions", payload);
  return res.data;
}

export async function patchRecurringTransaction(id, payload) {
  const res = await api.patch(`/recurring-transactions/${id}`, payload);
  return res.data;
}

export async function deleteRecurringTransaction(id) {
  const res = await api.delete(`/recurring-transactions/${id}`);
  return res.data;
}

export async function updateGoal(id, payload) {
  const res = await api.put(`/goals/${id}`, payload);
  return res.data;
}

export async function allocateGoal(id, amount) {
  const res = await api.post(`/goals/${id}/allocate`, { amount });
  return res.data;
}

export async function withdrawGoal(id, amount) {
  const res = await api.post(`/goals/${id}/withdraw`, { amount });
  return res.data;
}

export async function deleteGoal(id) {
  const res = await api.delete(`/goals/${id}`);
  return res.data;
}

export async function authRegister({ name, email, password }) {
  const res = await api.post("/auth/register", { name, email, password });
  return res.data;
}

export async function authLogin({ email, password }) {
  const res = await api.post("/auth/login", { email, password });
  return res.data;
}

export async function sendChatMessage({ message, history = [] }) {
  const res = await api.post("/chat", { message, history });
  return res.data;
}

