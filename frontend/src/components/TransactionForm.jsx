import { useState } from "react";

const initialState = {
  kind: "income", // default to Deposit
  amount: "",
  category: "",
  date: "",
  note: "",
};

export function TransactionForm({ onSubmit }) {
  const [form, setForm] = useState(initialState);
  const isDeposit = form.kind === "income";

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit({
      ...form,
      amount: Number(form.amount),
      date: form.date ? new Date(form.date).toISOString() : undefined,
    });
    setForm(initialState);
  }

  return (
    <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
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
          <span>💰</span> Deposit
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
          <span>💸</span> Withdrawal
        </button>
      </div>

      <input
        className={`rounded-2xl border bg-slate-950/70 px-4 py-3 text-white transition focus:outline-none ${
          isDeposit
            ? "border-emerald-500/30 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40"
            : "border-rose-500/30 focus:border-rose-400 focus:ring-1 focus:ring-rose-400/40"
        }`}
        type="number"
        name="amount"
        min="0.01"
        step="0.01"
        placeholder={isDeposit ? "Deposit amount (₹)" : "Withdrawal amount (₹)"}
        required
        value={form.amount}
        onChange={updateField}
      />

      <input
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
        type="text"
        name="category"
        placeholder={isDeposit ? "Category (e.g. Salary, Savings, Bonus)" : "Category (e.g. Groceries, Rent, Bills)"}
        required
        value={form.category}
        onChange={updateField}
      />

      <input
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus:border-teal-400 focus:outline-none cursor-pointer"
        type="date"
        name="date"
        title="Click to open mini calendar or type dd/mm/yyyy directly"
        value={form.date}
        onChange={updateField}
        onClick={(e) => {
          try {
            e.target.showPicker?.();
          } catch {}
        }}
      />

      <input
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
        type="text"
        name="note"
        placeholder="Note (optional)"
        value={form.note}
        onChange={updateField}
      />

      <button
        className={`rounded-2xl px-5 py-3 font-semibold transition disabled:opacity-50 md:col-span-2 ${
          isDeposit
            ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20"
            : "bg-rose-500 text-white hover:bg-rose-400 shadow-md shadow-rose-500/20"
        }`}
        type="submit"
      >
        {isDeposit ? "+ Add Deposit" : "− Add Withdrawal"}
      </button>
    </form>
  );
}
