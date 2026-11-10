import { useState } from "react";

export function TransactionFilters({ onFilterChange }) {
  const [filters, setFilters] = useState({
    source: "general",
    kind: "",
    category: "",
    startDate: "",
    endDate: "",
    minAmount: "",
    maxAmount: "",
  });

  function updateField(e) {
    const { name, value } = e.target;
    const nextFilters = { ...filters, [name]: value };
    setFilters(nextFilters);
    onFilterChange(cleanFilters(nextFilters));
  }

  function handleReset() {
    const empty = {
      source: "general",
      kind: "",
      category: "",
      startDate: "",
      endDate: "",
      minAmount: "",
      maxAmount: "",
    };
    setFilters(empty);
    onFilterChange(cleanFilters(empty));
  }

  function cleanFilters(f) {
    const cleaned = {};
    if (f.source) cleaned.source = f.source;
    if (f.kind) cleaned.kind = f.kind;
    if (f.category) cleaned.category = f.category.trim();
    if (f.startDate) cleaned.startDate = f.startDate;
    if (f.endDate) cleaned.endDate = f.endDate;
    if (f.minAmount) cleaned.minAmount = Number(f.minAmount);
    if (f.maxAmount) cleaned.maxAmount = Number(f.maxAmount);
    return cleaned;
  }

  return (
    <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-slate-950/40 p-3 sm:grid-cols-3 lg:grid-cols-7">
      <select
        name="source"
        value={filters.source}
        onChange={updateField}
        className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-teal-300 font-medium"
      >
        <option value="general">Cash Flow Only</option>
        <option value="goal-allocation">Sinking Funds Only</option>
        <option value="all">All Records</option>
      </select>

      <select
        name="kind"
        value={filters.kind}
        onChange={updateField}
        className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
      >
        <option value="">All Types</option>
        <option value="income">Deposits</option>
        <option value="expense">Withdrawals</option>
      </select>

      <input
        type="text"
        name="category"
        placeholder="Filter category…"
        value={filters.category}
        onChange={updateField}
        className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
      />

      <input
        type="date"
        name="startDate"
        title="Start date (click to open mini calendar or type dd/mm/yyyy directly)"
        value={filters.startDate}
        onChange={updateField}
        onClick={(e) => {
          try {
            e.target.showPicker?.();
          } catch {}
        }}
        className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none cursor-pointer focus:border-teal-400"
      />

      <input
        type="date"
        name="endDate"
        title="End date (click to open mini calendar or type dd/mm/yyyy directly)"
        value={filters.endDate}
        onChange={updateField}
        onClick={(e) => {
          try {
            e.target.showPicker?.();
          } catch {}
        }}
        className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none cursor-pointer focus:border-teal-400"
      />

      <input
        type="number"
        name="minAmount"
        placeholder="Min ₹"
        min="0"
        value={filters.minAmount}
        onChange={updateField}
        className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
      />

      <div className="flex gap-2">
        <input
          type="number"
          name="maxAmount"
          placeholder="Max ₹"
          min="0"
          value={filters.maxAmount}
          onChange={updateField}
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleReset}
          className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
