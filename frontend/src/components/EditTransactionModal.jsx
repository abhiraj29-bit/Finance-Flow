import { useState } from "react";

export function EditTransactionModal({ transaction, onSave, onClose }) {
  const [form, setForm] = useState({
    kind: transaction.kind || "expense",
    amount: transaction.amount || "",
    category: transaction.category || "",
    date: transaction.date ? new Date(transaction.date).toISOString().slice(0, 10) : "",
    note: transaction.note || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateField(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onSave(transaction._id, {
        ...form,
        amount: Number(form.amount),
        date: form.date ? new Date(form.date).toISOString() : undefined,
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update transaction");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Edit Transaction</h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
          <select
            name="kind"
            value={form.kind}
            onChange={updateField}
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>

          <input
            type="number"
            name="amount"
            step="0.01"
            min="0"
            required
            placeholder="Amount"
            value={form.amount}
            onChange={updateField}
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white"
          />

          <input
            type="text"
            name="category"
            required
            placeholder="Category"
            value={form.category}
            onChange={updateField}
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white"
          />

          <input
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
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white cursor-pointer focus:border-teal-400 focus:outline-none"
          />

          <input
            type="text"
            name="note"
            placeholder="Note"
            value={form.note}
            onChange={updateField}
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white md:col-span-2"
          />

          <div className="mt-2 flex justify-end gap-3 md:col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-medium text-slate-300 hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-teal-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-teal-300 disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
