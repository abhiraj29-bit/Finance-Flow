import { useState } from "react";

const initialState = {
  kind: "expense",
  amount: "",
  category: "",
  frequency: "monthly",
  startDate: new Date().toISOString().slice(0, 10),
  description: "",
  endDate: "",
};

export function RecurringTransactionForm({ onSubmit }) {
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isDeposit = form.kind === "income";

  function updateField(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onSubmit({
        ...form,
        amount: Number(form.amount),
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      });
      setForm(initialState);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to schedule recurring transaction");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
      {error && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200 md:col-span-2">
          {error}
        </div>
      )}

      {/* Deposit vs Withdrawal Toggle */}
      <div className="flex rounded-2xl bg-slate-950/60 p-1 border border-white/5 md:col-span-2">
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, kind: "income" }))}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition ${
            isDeposit
              ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span>💰</span> Recurring Deposit
        </button>
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, kind: "expense" }))}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition ${
            !isDeposit
              ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span>💸</span> Recurring Withdrawal
        </button>
      </div>

      <input
        type="number"
        name="amount"
        min="0.01"
        step="0.01"
        placeholder={isDeposit ? "Deposit amount (₹)" : "Withdrawal amount (₹)"}
        required
        value={form.amount}
        onChange={updateField}
        className={`rounded-2xl border bg-slate-950/70 px-4 py-3 text-white transition focus:outline-none ${
          isDeposit
            ? "border-emerald-500/30 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40"
            : "border-rose-500/30 focus:border-rose-400 focus:ring-1 focus:ring-rose-400/40"
        }`}
      />

      <input
        type="text"
        name="category"
        placeholder={isDeposit ? "Category (e.g. Salary, Dividend)" : "Category (e.g. Netflix, Rent, Gym)"}
        required
        value={form.category}
        onChange={updateField}
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
      />

      <select
        name="frequency"
        value={form.frequency}
        onChange={updateField}
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus:border-teal-400 focus:outline-none"
      >
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="yearly">Yearly</option>
      </select>

      <input
        type="date"
        name="startDate"
        required
        title="Click to open mini calendar or type dd/mm/yyyy directly"
        value={form.startDate}
        onChange={updateField}
        onClick={(e) => {
          try {
            e.target.showPicker?.();
          } catch {}
        }}
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus:border-teal-400 focus:outline-none cursor-pointer"
      />

      <input
        type="text"
        name="description"
        placeholder="Description / note (optional)"
        value={form.description}
        onChange={updateField}
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
      />

      <input
        type="date"
        name="endDate"
        placeholder="End date (optional)"
        title="Click to open mini calendar or type dd/mm/yyyy directly (optional)"
        value={form.endDate}
        onChange={updateField}
        onClick={(e) => {
          try {
            e.target.showPicker?.();
          } catch {}
        }}
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none cursor-pointer"
      />

      <button
        type="submit"
        disabled={loading}
        className={`rounded-2xl px-5 py-3 font-semibold transition disabled:opacity-50 md:col-span-2 ${
          isDeposit
            ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20"
            : "bg-rose-500 text-white hover:bg-rose-400 shadow-md shadow-rose-500/20"
        }`}
      >
        {loading
          ? "Scheduling…"
          : isDeposit
          ? "+ Schedule Recurring Deposit"
          : "− Schedule Recurring Withdrawal"}
      </button>
    </form>
  );
}
