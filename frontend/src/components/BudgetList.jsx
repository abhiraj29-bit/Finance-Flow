function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatMonthName(monthStr) {
  if (!monthStr || !monthStr.includes("-")) return monthStr || "";
  const [year, month] = monthStr.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}

export function BudgetList({
  items = [],
  selectedMonth,
  onMonthChange,
  availableMonths = [],
  onDelete,
}) {
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const otherMonthsWithBudgets = (availableMonths || []).filter(
    (m) => m && m !== selectedMonth
  );

  return (
    <div className="space-y-4">
      {/* Month Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-3">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-slate-400">Month:</span>
          <span className="text-sm font-semibold text-teal-300">
            {formatMonthName(selectedMonth || currentMonthKey)}
          </span>
          {selectedMonth === currentMonthKey && (
            <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-[10px] font-medium text-teal-300 border border-teal-500/30">
              Current
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedMonth !== currentMonthKey && onMonthChange && (
            <button
              type="button"
              onClick={() => onMonthChange(currentMonthKey)}
              className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Current Month
            </button>
          )}
          {onMonthChange && (
            <input
              type="month"
              value={selectedMonth || currentMonthKey}
              onChange={(e) => onMonthChange(e.target.value)}
              onClick={(e) => {
                try {
                  e.target.showPicker?.();
                } catch {}
              }}
              className="rounded-xl border border-white/10 bg-slate-900 px-3 py-1 text-xs text-white focus:border-teal-400 focus:outline-none cursor-pointer"
            />
          )}
        </div>
      </div>

      {/* Available Budgets in Other Months Notice */}
      {items.length === 0 && otherMonthsWithBudgets.length > 0 && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3.5 text-xs text-amber-200">
          <p className="font-semibold mb-1">
            No budgets found for {formatMonthName(selectedMonth)}.
          </p>
          <p className="text-amber-300/80 mb-2">
            You have budgets configured in other months:
          </p>
          <div className="flex flex-wrap gap-2">
            {otherMonthsWithBudgets.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onMonthChange && onMonthChange(m)}
                className="rounded-lg bg-amber-400/20 px-2.5 py-1 font-medium text-amber-100 transition hover:bg-amber-400/30 border border-amber-400/30"
              >
                👉 Switch to {formatMonthName(m)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {items.length === 0 && otherMonthsWithBudgets.length === 0 && (
        <p className="text-sm text-slate-400 py-3">
          Add a budget below to start tracking monthly category spend.
        </p>
      )}

      {/* Budget Cards List */}
      {items.map((item) => {
        const percentage = item.monthlyLimit
          ? Math.min(100, Math.round((item.spent / item.monthlyLimit) * 100))
          : 0;
        return (
          <div
            key={item.id || item.category}
            className="group relative rounded-3xl border border-white/10 bg-slate-950/40 p-4 transition hover:border-white/20 hover:bg-slate-950/60"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-white">{item.category}</h3>
                  {item.month && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({formatMonthName(item.month)})
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 mt-0.5">
                  {formatCurrency(item.spent)} spent of {formatCurrency(item.monthlyLimit)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`rounded-xl px-2.5 py-1 text-xs font-semibold ${
                    item.exceeded
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-teal-500/20 text-emerald-300 border border-teal-500/30"
                  }`}
                >
                  {item.exceeded ? "Over budget" : `${formatCurrency(item.remaining)} left`}
                </span>
                {onDelete && item.id && (
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    title="Delete budget"
                    className="rounded-xl p-1 text-slate-500 transition hover:bg-rose-500/20 hover:text-rose-300 opacity-60 group-hover:opacity-100"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  item.exceeded ? "bg-rose-400" : "bg-teal-300"
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
