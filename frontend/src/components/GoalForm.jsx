import { useState } from "react";

export function GoalForm({ onSubmit }) {
  const [form, setForm] = useState({
    name: "",
    targetAmount: "",
    targetDate: "",
    color: "#14b8a6",
  });

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit({
      ...form,
      targetAmount: Number(form.targetAmount),
      targetDate: new Date(form.targetDate).toISOString(),
    });
    setForm({ name: "", targetAmount: "", targetDate: "", color: "#14b8a6" });
  }

  return (
    <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
      <input
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white"
        name="name"
        placeholder="Emergency fund"
        required
        value={form.name}
        onChange={updateField}
      />
      <input
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white"
        type="number"
        name="targetAmount"
        min="1"
        placeholder="Target amount"
        required
        value={form.targetAmount}
        onChange={updateField}
      />
      <input
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus:border-teal-400 focus:outline-none cursor-pointer"
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
      />
      <input
        className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/70 p-2"
        type="color"
        name="color"
        value={form.color}
        onChange={updateField}
      />
      <button className="rounded-2xl bg-rose-300 px-4 py-3 font-semibold text-slate-950 md:col-span-2" type="submit">
        Create goal
      </button>
    </form>
  );
}

