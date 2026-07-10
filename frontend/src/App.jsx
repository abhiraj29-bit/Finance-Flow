import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { BudgetForm } from "./components/BudgetForm.jsx";
import { BudgetList } from "./components/BudgetList.jsx";
import { GoalForm } from "./components/GoalForm.jsx";
import { GoalList } from "./components/GoalList.jsx";
import { SectionCard } from "./components/SectionCard.jsx";
import { StatCard } from "./components/StatCard.jsx";
import { TransactionForm } from "./components/TransactionForm.jsx";
import { TransactionsTable } from "./components/TransactionsTable.jsx";
import { TrendChart } from "./components/TrendChart.jsx";
import { AuthPage } from "./components/AuthPage.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { api, fetchDashboardData } from "./services/api.js";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5004";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

const emptyDashboard = {
  summary: {
    totals: {
      income: 0,
      expense: 0,
      balance: 0,
      lockedInGoals: 0,
    },
    budgetProgress: [],
    trends: [],
    goals: [],
  },
  transactions: [],
  budgets: [],
  goals: [],
};

export default function App() {
  const { token, user, logout } = useAuth();
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setError("");
      const data = await fetchDashboardData();
      setDashboard(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load FinanceFlow data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadDashboard();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL);
    socket.on("finance:updated", loadDashboard);
    return () => socket.close();
  }, [token]);

  async function createTransaction(payload) {
    await api.post("/transactions", payload);
    await loadDashboard();
  }

  async function saveBudget(payload) {
    await api.post("/budgets", payload);
    await loadDashboard();
  }

  async function createGoal(payload) {
    await api.post("/goals", payload);
    await loadDashboard();
  }

  async function allocateToGoal(goalId, amount) {
    await api.post(`/goals/${goalId}/allocate`, { amount });
    await loadDashboard();
  }

  // Show auth page if not logged in
  if (!token) return <AuthPage />;

  const { totals, budgetProgress, trends } = dashboard.summary;

  return (
    <main className="min-h-screen px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 overflow-hidden rounded-[36px] border border-white/10 bg-white/5 p-8 shadow-glow backdrop-blur">
          <div className="flex items-start justify-between">
            <p className="text-sm uppercase tracking-[0.4em] text-teal-200">FinanceFlow</p>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">
                Hi, <span className="text-white">{user?.name}</span>
              </span>
              <button
                onClick={logout}
                className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                Sign out
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                Personal finance tracking with budgets, sinking funds, and live insights.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                Built as a production-minded MERN starter with MongoDB-backed analytics, transaction-safe goal allocations, and a frontend designed to surface financial health in one glance.
              </p>
            </div>
            <div className="rounded-[28px] border border-teal-300/20 bg-slate-950/40 p-5">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Realtime status</p>
              <p className="mt-3 text-2xl font-semibold text-white">Live sync enabled</p>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Any new transaction, budget update, or sinking fund allocation emits a Socket.io event and refreshes the dashboard.
              </p>
            </div>
          </div>
        </section>

        {error ? (
          <div className="mb-6 rounded-3xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-rose-100">{error}</div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Income" value={formatCurrency(totals.income)} tone="good" />
          <StatCard label="Expenses" value={formatCurrency(totals.expense)} tone="danger" />
          <StatCard label="Balance" value={formatCurrency(totals.balance)} tone="default" />
          <StatCard label="Locked in Goals" value={formatCurrency(totals.lockedInGoals)} tone="warn" />
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <SectionCard title="Cash Flow Trend" subtitle="Last six months of income and expense totals">
            {loading ? <p className="text-slate-400">Loading chart...</p> : <TrendChart data={trends} />}
          </SectionCard>

          <SectionCard title="Budget Health" subtitle="Current month category tracking">
            {budgetProgress.length ? (
              <BudgetList items={budgetProgress} />
            ) : (
              <p className="text-slate-400">Add a budget to start tracking monthly category spend.</p>
            )}
          </SectionCard>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <SectionCard title="Add Transaction" subtitle="Log income or expenses instantly">
            <TransactionForm onSubmit={createTransaction} />
          </SectionCard>

          <SectionCard title="Create Budget" subtitle="Set monthly guardrails by category">
            <BudgetForm onSubmit={saveBudget} />
          </SectionCard>

          <SectionCard title="New Sinking Fund" subtitle="Save toward larger planned expenses">
            <GoalForm onSubmit={createGoal} />
          </SectionCard>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionCard title="Recent Transactions" subtitle="Latest financial activity">
            {dashboard.transactions.length ? (
              <TransactionsTable items={dashboard.transactions} />
            ) : (
              <p className="text-slate-400">No transactions yet. Add your first one above.</p>
            )}
          </SectionCard>

          <SectionCard title="Sinking Funds" subtitle="Lock money toward upcoming goals">
            {dashboard.goals.length ? (
              <GoalList items={dashboard.goals} onAllocate={allocateToGoal} />
            ) : (
              <p className="text-slate-400">No goals yet. Create a sinking fund to get started.</p>
            )}
          </SectionCard>
        </section>
      </div>
    </main>
  );
}
