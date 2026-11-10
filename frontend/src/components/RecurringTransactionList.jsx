function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function RecurringTransactionList({ items, onToggleActive, onDelete }) {
  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        No recurring schedules found. Add subscriptions, rent, or salary above to automate recurring entries.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item._id}
          className="flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4 sm:flex-row sm:items-center"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-white">{item.category}</h4>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                  item.kind === "income"
                    ? "border-emerald-500/30 bg-emerald-400/20 text-emerald-300"
                    : "border-rose-500/30 bg-rose-400/20 text-rose-300"
                }`}
              >
                {item.kind === "income" ? "Deposit" : "Withdrawal"}
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] text-slate-300 capitalize">
                {item.frequency}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  item.isActive
                    ? "bg-teal-400/20 text-teal-300"
                    : "bg-amber-400/20 text-amber-300"
                }`}
              >
                {item.isActive ? "Active" : "Paused"}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {item.description || "Recurring schedule"} • Next due:{" "}
              <span className="text-teal-200 font-medium">{formatDate(item.nextDueDate)}</span>
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <span
              className={`text-base font-bold ${
                item.kind === "income" ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {item.kind === "income" ? "+" : "−"} {formatCurrency(item.amount)}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onToggleActive(item._id, !item.isActive)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                  item.isActive
                    ? "border-amber-400/30 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20"
                    : "border-teal-400/30 bg-teal-400/10 text-teal-200 hover:bg-teal-400/20"
                }`}
              >
                {item.isActive ? "Pause" : "Resume"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete recurring schedule for ${item.category}?`)) {
                    onDelete(item._id);
                  }
                }}
                className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
