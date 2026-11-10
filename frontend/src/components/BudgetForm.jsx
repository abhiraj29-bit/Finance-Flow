import { useState } from "react";

export function BudgetForm({ onSubmit }) {
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const [form, setForm] = useState({
    category: "",
    monthlyLimit: "",
    month: currentMonthKey,
  });

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit({
      category: form.category.trim(),
      monthlyLimit: Number(form.monthlyLimit),
      month: form.month,
    });
    setForm((current) => ({
      ...current,
      category: "",
      monthlyLimit: "",
    }));
  }

  return (
    <form className="grid gap-3 md:grid-cols-3" onSubmit={handleSubmit}>
      <input
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-300 focus:outline-none"
        name="category"
        placeholder="Category (e.g. Groceries, Dining)"
        required
        value={form.category}
        onChange={updateField}
      />
      <input
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-300 focus:outline-none"
        type="number"
        name="monthlyLimit"
        min="0.01"
        step="0.01"
        placeholder="Monthly limit (₹)"
        required
        value={form.monthlyLimit}
        onChange={updateField}
      />
      <input
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus:border-amber-300 focus:outline-none cursor-pointer"
        type="month"
        name="month"
        title="Click to open mini month picker or write directly"
        required
        value={form.month}
        onChange={updateField}
        onClick={(e) => {
          try {
            e.target.showPicker?.();
          } catch {}
        }}
      />
      <p className="text-xs text-slate-400 md:col-span-3">
        Budgets track withdrawals for the chosen month in <span className="text-amber-300">Budget Health</span>.
      </p>
      <button className="rounded-2xl bg-amber-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-amber-200 md:col-span-3" type="submit">
        Save budget
      </button>
    </form>
  );
}

