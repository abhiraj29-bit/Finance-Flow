import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { BudgetForm } from "./components/BudgetForm.jsx";
import { BudgetList } from "./components/BudgetList.jsx";
import { GoalForm } from "./components/GoalForm.jsx";
import { GoalList } from "./components/GoalList.jsx";
import { RecurringTransactionForm } from "./components/RecurringTransactionForm.jsx";
import { RecurringTransactionList } from "./components/RecurringTransactionList.jsx";
import { SectionCard } from "./components/SectionCard.jsx";
import { StatCard } from "./components/StatCard.jsx";
import { TransactionFilters } from "./components/TransactionFilters.jsx";
import { TransactionForm } from "./components/TransactionForm.jsx";
import { TransactionsTable } from "./components/TransactionsTable.jsx";
import { TrendChart } from "./components/TrendChart.jsx";
import { AuthPage } from "./components/AuthPage.jsx";
import { ChatWidget } from "./components/ChatWidget.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import {
  api,
  createRecurringTransaction,
  deleteBudget,
  deleteGoal,
  deleteRecurringTransaction,
  deleteTransaction,
  fetchDashboardData,
  fetchTransactions,
  patchRecurringTransaction,
  updateGoal,
  updateTransaction,
} from "./services/api.js";

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
  transactions: {
    data: [],
    pagination: { page: 1, limit: 10, totalRecords: 0, totalPages: 1 },
  },
  budgets: [],
  goals: [],
  recurring: [],
};

export default function App() {
  const { token, user, logout } = useAuth();
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState("");
  const [filters, setFilters] = useState({ source: "general" });
  const [page, setPage] = useState(1);
  const [budgetMonth, setBudgetMonth] = useState(new Date().toISOString().slice(0, 7));

  function notify(msg) {
    setNotification(msg);
    setTimeout(() => setNotification(""), 4000);
  }

  async function loadDashboard(targetPage = page, targetFilters = filters, targetMonth = budgetMonth) {
    try {
      setError("");
      const data = await fetchDashboardData(
        {
          page: targetPage,
          limit: 10,
          ...targetFilters,
        },
        targetMonth
      );

      // Normalize transactions if server returns array vs paginated object
      const normalizedTransactions = Array.isArray(data.transactions)
        ? {
            data: data.transactions,
            pagination: { page: 1, limit: 10, totalRecords: data.transactions.length, totalPages: 1 },
          }
        : data.transactions;

      setDashboard({
        ...data,
        transactions: normalizedTransactions,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Could not load FinanceFlow data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      loadDashboard(page, filters, budgetMonth);
    }
  }, [token, page, filters, budgetMonth]);

  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, {
      auth: { token },
      query: { token },
    });

    if (user?.id) {
      socket.emit("join", user.id);
    }

    socket.on("finance:updated", () => {
      loadDashboard(page, filters, budgetMonth);
    });

    return () => socket.close();
  }, [token, user?.id, page, filters, budgetMonth]);

  async function handleCreateTransaction(payload) {
    try {
      await api.post("/transactions", payload);
      notify("Transaction added successfully");
      await loadDashboard(1, filters);
      setPage(1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create transaction");
    }
  }

  async function handleUpdateTransaction(id, payload) {
    try {
      await updateTransaction(id, payload);
      notify("Transaction updated successfully");
      await loadDashboard(page, filters);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update transaction");
      throw err;
    }
  }

  async function handleDeleteTransaction(id) {
    try {
      await deleteTransaction(id);
      notify("Transaction deleted");
      await loadDashboard(page, filters);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete transaction");
    }
  }

  async function handleSaveBudget(payload) {
    try {
      await api.post("/budgets", payload);
      notify("Budget saved successfully");
      const targetMonth = payload.month || budgetMonth;
      setBudgetMonth(targetMonth);
      await loadDashboard(page, filters, targetMonth);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save budget");
    }
  }

  async function handleDeleteBudget(id) {
    try {
      await deleteBudget(id);
      notify("Budget removed successfully");
      await loadDashboard(page, filters, budgetMonth);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete budget");
    }
  }

  async function handleCreateGoal(payload) {
    try {
      await api.post("/goals", payload);
      notify("Sinking fund goal created");
      await loadDashboard(page, filters);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create goal");
    }
  }

  async function handleUpdateGoal(goalId, payload) {
    try {
      await updateGoal(goalId, payload);
      notify("Sinking fund updated successfully");
      await loadDashboard(page, filters);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update sinking fund");
      throw err;
    }
  }

  async function handleDeleteGoal(goalId) {
    try {
      await deleteGoal(goalId);
      notify("Sinking fund deleted");
      await loadDashboard(page, filters);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete sinking fund");
    }
  }

  async function handleAllocateToGoal(goalId, amount) {
    try {
      await api.post(`/goals/${goalId}/allocate`, { amount });
      notify(`Locked funds into goal`);
      await loadDashboard(page, filters);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to allocate funds to goal");
      throw err;
    }
  }

  async function handleWithdrawFromGoal(goalId, amount) {
    try {
      await api.post(`/goals/${goalId}/withdraw`, { amount });
      notify("Withdrew funds from sinking fund");
      await loadDashboard(page, filters);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to withdraw funds from goal");
      throw err;
    }
  }

  async function handleCreateRecurring(payload) {
    try {
      await createRecurringTransaction(payload);
      notify("Recurring schedule created");
      await loadDashboard(page, filters);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create recurring schedule");
    }
  }

  async function handleToggleRecurringActive(id, isActive) {
    try {
      await patchRecurringTransaction(id, { isActive });
      notify(`Recurring schedule ${isActive ? "resumed" : "paused"}`);
      await loadDashboard(page, filters);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update schedule status");
    }
  }

  async function handleDeleteRecurring(id) {
    try {
      await deleteRecurringTransaction(id);
      notify("Recurring schedule deleted");
      await loadDashboard(page, filters);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete schedule");
    }
  }

  function handleFilterChange(newFilters) {
    setFilters(newFilters);
    setPage(1);
  }

  // Show auth page if not logged in
  if (!token) return <AuthPage />;

  const { totals, budgetProgress, trends } = dashboard.summary;
  const transactionItems = dashboard.transactions?.data || [];
  const pagination = dashboard.transactions?.pagination || {
    page: 1,
    limit: 10,
    totalRecords: transactionItems.length,
    totalPages: 1,
  };

  return (
    <main className="min-h-screen px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Top Header */}
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
          <div className="mt-4">
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
              Personal finance tracking with budgets, sinking funds, and live insights.
            </h1>
          </div>
        </section>

        {/* Notifications */}
        {notification && (
          <div className="mb-6 rounded-3xl border border-teal-400/20 bg-teal-500/10 px-5 py-4 text-teal-200">
            {notification}
          </div>
        )}

        {/* Errors */}
        {error && (
          <div className="mb-6 rounded-3xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-rose-100">
            {error}
          </div>
        )}

        {/* Cash Flow & Budgets */}
        <section className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <SectionCard title="Cash Flow Trend" subtitle="Last six months of deposits and withdrawals">
            {loading ? <p className="text-slate-400">Loading chart...</p> : <TrendChart data={trends} />}
          </SectionCard>

          <SectionCard title="Budget Health" subtitle="Monthly category spending guardrails">
            <BudgetList
              items={budgetProgress}
              selectedMonth={budgetMonth}
              onMonthChange={(m) => {
                setBudgetMonth(m);
                loadDashboard(page, filters, m);
              }}
              availableMonths={dashboard.summary?.availableBudgetMonths || []}
              onDelete={handleDeleteBudget}
            />
          </SectionCard>
        </section>

        {/* Input Forms */}
        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <SectionCard title="Add Transaction" subtitle="Log deposits or withdrawals instantly">
            <TransactionForm onSubmit={handleCreateTransaction} />
          </SectionCard>

          <SectionCard title="Create Budget" subtitle="Set monthly guardrails by category">
            <BudgetForm onSubmit={handleSaveBudget} />
          </SectionCard>

          <SectionCard title="New Sinking Fund" subtitle="Save toward larger planned expenses">
            <GoalForm onSubmit={handleCreateGoal} />
          </SectionCard>
        </section>

        {/* Recurring Schedules Section */}
        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <SectionCard title="Schedule Recurring Transaction" subtitle="Automate recurring deposits and withdrawals">
            <RecurringTransactionForm onSubmit={handleCreateRecurring} />
          </SectionCard>

          <SectionCard title="Active Recurring Schedules" subtitle="Upcoming automated occurrences">
            <RecurringTransactionList
              items={dashboard.recurring || []}
              onToggleActive={handleToggleRecurringActive}
              onDelete={handleDeleteRecurring}
            />
          </SectionCard>
        </section>

        {/* Transactions Table & Sinking Funds */}
        <section className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <SectionCard title="Transaction History" subtitle="Live cash ledger — filter, search, and paginate records">
            {/* Scoped Cash Flow Metrics */}
            <div className="mb-4 grid grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Cash Deposits</p>
                <p className="text-base font-bold text-emerald-400">{formatCurrency(totals.income)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Cash Withdrawals</p>
                <p className="text-base font-bold text-rose-400">{formatCurrency(totals.expense)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Net Cash Flow</p>
                <p className="text-base font-bold text-white">{formatCurrency(totals.balance)}</p>
              </div>
            </div>

            <TransactionFilters onFilterChange={handleFilterChange} />
            <TransactionsTable
              items={transactionItems}
              pagination={pagination}
              onPageChange={(p) => setPage(p)}
            />
          </SectionCard>

          <SectionCard title="Sinking Funds" subtitle="Lock money toward upcoming goals">
            {/* Scoped Sinking Funds Metrics */}
            <div className="mb-4 grid grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Total Saved</p>
                <p className="text-base font-bold text-teal-300">{formatCurrency(totals.lockedInGoals)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Target Goal</p>
                <p className="text-base font-bold text-slate-300">
                  {formatCurrency(
                    totals.sinkingFunds?.totalTarget ||
                      dashboard.goals.reduce((s, g) => s + (g.targetAmount || 0), 0)
                  )}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Remaining</p>
                <p className="text-base font-bold text-amber-300">
                  {formatCurrency(
                    Math.max(
                      0,
                      (totals.sinkingFunds?.totalTarget ||
                        dashboard.goals.reduce((s, g) => s + (g.targetAmount || 0), 0)) -
                        totals.lockedInGoals
                    )
                  )}
                </p>
              </div>
            </div>

            {dashboard.goals.length ? (
              <GoalList
                items={dashboard.goals}
                onAllocate={handleAllocateToGoal}
                onWithdraw={handleWithdrawFromGoal}
                onUpdate={handleUpdateGoal}
                onDelete={handleDeleteGoal}
              />
            ) : (
              <p className="text-slate-400">No goals yet. Create a sinking fund to get started.</p>
            )}
          </SectionCard>
        </section>
      </div>

      {/* Floating AI Financial Assistant */}
      <ChatWidget />
    </main>
  );
}
