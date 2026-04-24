import { useState } from "react";

export function BudgetForm({ onSubmit }) {
  const [form, setForm] = useState({
    category: "",
    monthlyLimit: "",
    month: new Date().toISOString().slice(0, 7),
  });

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit({
      ...form,
      monthlyLimit: Number(form.monthlyLimit),
    });
    setForm((current) => ({ ...current, category: "", monthlyLimit: "" }));
  }

  return (
    <form className="grid gap-3 md:grid-cols-3" onSubmit={handleSubmit}>
      <input
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white"
        name="category"
        placeholder="Category budget"
        required
        value={form.category}
        onChange={updateField}
      />
      <input
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white"
        type="number"
        name="monthlyLimit"
        min="0"
        placeholder="Monthly limit"
        required
        value={form.monthlyLimit}
        onChange={updateField}
      />
      <input
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white"
        type="month"
        name="month"
        required
        value={form.month}
        onChange={updateField}
      />
      <button className="rounded-2xl bg-amber-300 px-4 py-3 font-semibold text-slate-950 md:col-span-3" type="submit">
        Save budget
      </button>
    </form>
  );
}

