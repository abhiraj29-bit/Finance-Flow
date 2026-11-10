import { useState } from "react";
import { EditGoalModal } from "./EditGoalModal.jsx";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function GoalList({ items, onAllocate, onWithdraw, onUpdate, onDelete }) {
  const [drafts, setDrafts] = useState({});
  const [allocatingId, setAllocatingId] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  function setDraft(goalId, value) {
    setDrafts((current) => ({ ...current, [goalId]: value }));
  }

  async function handleDeposit(goal) {
    const rawValue = drafts[goal._id];
    const amount = Number(rawValue);

    if (!amount || amount <= 0) {
      alert("Please enter a valid deposit amount greater than zero.");
      return;
    }

    const remaining = goal.targetAmount - (goal.currentAmount || 0);
    if (amount > remaining) {
      alert(`Amount exceeds the remaining goal target of ${formatCurrency(remaining)}.`);
      return;
    }

    setAllocatingId(goal._id);
    try {
      await onAllocate(goal._id, amount);
      setDraft(goal._id, "");
    } finally {
      setAllocatingId(null);
    }
  }

  async function handleWithdraw(goal) {
    const rawValue = drafts[goal._id];
    const amount = Number(rawValue);

    if (!amount || amount <= 0) {
      alert("Please enter a valid withdrawal amount greater than zero.");
      return;
    }

    const currentSaved = goal.currentAmount || 0;
    if (amount > currentSaved) {
      alert(`Cannot withdraw more than currently saved (${formatCurrency(currentSaved)}).`);
      return;
    }

    setAllocatingId(goal._id);
    try {
      if (onWithdraw) {
        await onWithdraw(goal._id, amount);
      }
      setDraft(goal._id, "");
    } finally {
      setAllocatingId(null);
    }
  }

  async function handleDelete(goal) {
    if (!window.confirm(`Are you sure you want to delete the "${goal.name}" sinking fund?`)) {
      return;
    }
    setDeletingId(goal._id);
    try {
      if (onDelete) {
        await onDelete(goal._id);
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {items.map((goal) => {
        const percentage = Math.min(
          100,
          Math.round(((goal.currentAmount || 0) / (goal.targetAmount || 1)) * 100)
        );
        const remaining = Math.max(0, goal.targetAmount - (goal.currentAmount || 0));
        const isFunded = goal.isCompleted || remaining === 0;

        return (
          <div key={goal._id} className="rounded-3xl border border-white/10 bg-slate-950/40 p-4 transition hover:border-white/20">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: goal.color }} />
                <div>
                  <h3 className="font-medium text-white">{goal.name}</h3>
                  <p className="text-sm text-slate-400">
                    {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}{" "}
                    {!isFunded && (
                      <span className="text-xs text-teal-300">
                        ({formatCurrency(remaining)} left)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${isFunded ? "text-emerald-300" : "text-slate-400"}`}>
                  {isFunded ? "🎉 Fully Funded" : `${percentage}% funded`}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingGoal(goal)}
                  className="rounded-xl border border-white/10 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10 hover:text-white"
                  title="Manage Sinking Fund (Deposit / Withdraw / Edit)"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={deletingId === goal._id}
                  onClick={() => handleDelete(goal)}
                  className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
                  title="Delete Sinking Fund"
                >
                  {deletingId === goal._id ? "…" : "Delete"}
                </button>
              </div>
            </div>

            <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${percentage}%`, backgroundColor: goal.color }}
              />
            </div>

            {/* Direct Quick Deposit & Withdraw Controls */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="flex-1 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder={`Amount (Saved: ${formatCurrency(goal.currentAmount || 0)})`}
                  value={drafts[goal._id] || ""}
                  onChange={(event) => setDraft(goal._id, event.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    className="rounded-2xl bg-emerald-500 px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-40"
                    disabled={allocatingId === goal._id || remaining <= 0}
                    onClick={() => handleDeposit(goal)}
                    type="button"
                    title={remaining <= 0 ? "Goal is fully funded" : `Deposit funds (max ${formatCurrency(remaining)})`}
                  >
                    {allocatingId === goal._id ? "…" : "+ Deposit"}
                  </button>
                  <button
                    className="rounded-2xl bg-rose-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-rose-400 disabled:opacity-40"
                    disabled={allocatingId === goal._id || (goal.currentAmount || 0) <= 0}
                    onClick={() => handleWithdraw(goal)}
                    type="button"
                    title={(goal.currentAmount || 0) <= 0 ? "No funds saved yet" : `Withdraw funds (max ${formatCurrency(goal.currentAmount)})`}
                  >
                    {allocatingId === goal._id ? "…" : "− Withdraw"}
                  </button>
                </div>
              </div>
              {isFunded && (
                <p className="text-[11px] text-emerald-400">
                  🎉 Goal reached 100%! You can withdraw funds as needed.
                </p>
              )}
            </div>
          </div>
        );
      })}

      {editingGoal && (
        <EditGoalModal
          goal={editingGoal}
          onSave={onUpdate}
          onAllocate={onAllocate}
          onWithdraw={onWithdraw}
          onClose={() => setEditingGoal(null)}
        />
      )}
    </div>
  );
}
