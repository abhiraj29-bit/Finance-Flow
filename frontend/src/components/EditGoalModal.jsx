import { useState } from "react";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function EditGoalModal({ goal, onSave, onAllocate, onWithdraw, onClose }) {
  const [activeTab, setActiveTab] = useState("funds"); // "funds" or "details"
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: goal.name || "",
    targetAmount: goal.targetAmount || "",
    currentAmount: goal.currentAmount || 0,
    targetDate: goal.targetDate
      ? new Date(goal.targetDate).toISOString().slice(0, 10)
      : "",
    color: goal.color || "#0f766e",
  });

  const remaining = Math.max(0, goal.targetAmount - (goal.currentAmount || 0));
  const currentSaved = goal.currentAmount || 0;
  const percentage = Math.min(100, Math.round((currentSaved / (goal.targetAmount || 1)) * 100));

  function updateField(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleDeposit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const amount = Number(depositAmount);
    if (!amount || amount <= 0) {
      setError("Please enter a valid deposit amount greater than zero.");
      return;
    }

    if (amount > remaining) {
      setError(`Deposit cannot exceed the remaining target of ${formatCurrency(remaining)}.`);
      return;
    }

    setLoadingAction(true);
    try {
      if (onAllocate) {
        await onAllocate(goal._id, amount);
      }
      setSuccess(`Successfully deposited ${formatCurrency(amount)} into "${goal.name}".`);
      setDepositAmount("");
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to deposit funds into goal.");
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleWithdraw(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      setError("Please enter a valid withdrawal amount greater than zero.");
      return;
    }

    if (amount > currentSaved) {
      setError(`Cannot withdraw more than currently saved (${formatCurrency(currentSaved)}).`);
      return;
    }

    setLoadingAction(true);
    try {
      if (onWithdraw) {
        await onWithdraw(goal._id, amount);
      }
      setSuccess(`Successfully withdrew ${formatCurrency(amount)} from "${goal.name}".`);
      setWithdrawAmount("");
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to withdraw funds from goal.");
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleSaveDetails(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const target = Number(form.targetAmount);
    const current = Number(form.currentAmount);

    if (target <= 0) {
      setError("Target amount must be greater than zero.");
      return;
    }

    if (current < 0) {
      setError("Current saved amount cannot be negative.");
      return;
    }

    setLoadingAction(true);
    try {
      await onSave(goal._id, {
        name: form.name.trim(),
        targetAmount: target,
        currentAmount: current,
        targetDate: new Date(form.targetDate).toISOString(),
        color: form.color,
      });
      setSuccess("Sinking fund updated successfully.");
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update sinking fund details.");
    } finally {
      setLoadingAction(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-slate-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-4 w-4 rounded-full" style={{ backgroundColor: goal.color }} />
            <div>
              <h3 className="text-xl font-semibold text-white">Manage Sinking Fund</h3>
              <p className="text-xs text-slate-400">{goal.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Tab Selector */}
        <div className="mb-5 flex rounded-2xl bg-slate-950/60 p-1 border border-white/5">
          <button
            type="button"
            onClick={() => {
              setActiveTab("funds");
              setError("");
              setSuccess("");
            }}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold transition ${
              activeTab === "funds"
                ? "bg-teal-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            💰 Deposit & Withdraw
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("details");
              setError("");
              setSuccess("");
            }}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold transition ${
              activeTab === "details"
                ? "bg-teal-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ⚙️ Edit Goal Details
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-200">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-200">
            {success}
          </div>
        )}

        {/* TAB 1: DEPOSIT & WITHDRAW */}
        {activeTab === "funds" && (
          <div className="space-y-4">
            {/* Fund Status Snapshot */}
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Currently Saved: <strong className="text-white text-sm">{formatCurrency(currentSaved)}</strong></span>
                <span>Target: <strong className="text-teal-300 text-sm">{formatCurrency(goal.targetAmount)}</strong></span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%`, backgroundColor: goal.color }}
                />
              </div>
              <p className="mt-2 text-right text-[11px] text-slate-400">
                {remaining > 0 ? `${formatCurrency(remaining)} left to target (${percentage}%)` : "🎉 100% Fully Funded"}
              </p>
            </div>

            {/* Deposit Box */}
            <form onSubmit={handleDeposit} className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-emerald-300">Deposit Funds (Lock Money)</span>
                <span className="text-[10px] text-slate-400">Max: {formatCurrency(remaining)}</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max={remaining}
                  step="0.01"
                  disabled={loadingAction || remaining <= 0}
                  placeholder="Enter amount to deposit"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="flex-1 rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loadingAction || !depositAmount || remaining <= 0}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-40"
                >
                  Deposit
                </button>
              </div>
            </form>

            {/* Withdraw Box */}
            <form onSubmit={handleWithdraw} className="rounded-2xl border border-rose-500/20 bg-rose-950/20 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-rose-300">Withdraw Funds (Release to Available)</span>
                <span className="text-[10px] text-slate-400">Available: {formatCurrency(currentSaved)}</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max={currentSaved}
                  step="0.01"
                  disabled={loadingAction || currentSaved <= 0}
                  placeholder="Enter amount to withdraw"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="flex-1 rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-400 focus:outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loadingAction || !withdrawAmount || currentSaved <= 0}
                  className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-400 disabled:opacity-40"
                >
                  Withdraw
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: EDIT GOAL DETAILS */}
        {activeTab === "details" && (
          <form onSubmit={handleSaveDetails} className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-xs text-slate-400">Goal Name</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Goal name"
                value={form.name}
                onChange={updateField}
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3.5 py-2.5 text-xs text-white"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Target Amount (₹)</label>
              <input
                type="number"
                name="targetAmount"
                min="1"
                step="0.01"
                required
                placeholder="Target amount"
                value={form.targetAmount}
                onChange={updateField}
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3.5 py-2.5 text-xs text-white"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Current Saved (₹)</label>
              <input
                type="number"
                name="currentAmount"
                min="0"
                step="0.01"
                placeholder="Current saved"
                value={form.currentAmount}
                onChange={updateField}
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3.5 py-2.5 text-xs text-white"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Target Date</label>
              <input
                type="date"
                name="targetDate"
                title="Click to open mini calendar or type dd/mm/yyyy directly"
                required
                value={form.targetDate}
                onChange={updateField}
                onClick={(e) => {
                  try {
                    e.target.showPicker?.();
                  } catch {}
                }}
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3.5 py-2.5 text-xs text-white cursor-pointer focus:border-teal-400 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Goal Color</label>
              <input
                type="color"
                name="color"
                value={form.color}
                onChange={updateField}
                className="h-10 w-full rounded-xl border border-white/10 bg-slate-950/70 p-1"
              />
            </div>

            <p className="text-[11px] text-slate-400 md:col-span-2">
              💡 Directly updating "Current Saved" automatically synchronizes your ledger transactions so expenses match.
            </p>

            <div className="mt-2 flex justify-end gap-2 md:col-span-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loadingAction}
                className="rounded-xl bg-teal-400 px-5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-teal-300 disabled:opacity-50"
              >
                {loadingAction ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
