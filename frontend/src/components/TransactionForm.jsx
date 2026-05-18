import { useState } from "react";

const initialState = {
  kind: "expense",
  amount: "",
  category: "",
  date: "",
  note: "",
};

export function TransactionForm({ onSubmit }) {
  const [form, setForm] = useState(initialState);

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
      <select
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white"
        name="kind"
        value={form.kind}
        onChange={updateField}
      >
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </select>
      <input
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white"
        type="number"
        name="amount"
        min="0"
        step="0.01"
        placeholder="Amount"
        required
        value={form.amount}
        onChange={updateField}
      />
      <input
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white"
        type="text"
        name="category"
        placeholder="Category"
        required
        value={form.category}
        onChange={updateField}
      />
      <input
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white"
        type="date"
        name="date"
        value={form.date}
        onChange={updateField}
      />
      <input
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white md:col-span-2"
        type="text"
        name="note"
        placeholder="Note"
        value={form.note}
        onChange={updateField}
      />
      <button
        className="rounded-2xl bg-teal-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-teal-300 md:col-span-2"
        type="submit"
      >
        Add transaction
      </button>
    </form>
  );
}

