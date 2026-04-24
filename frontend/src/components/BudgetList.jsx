function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function BudgetList({ items }) {
  return (
    <div className="space-y-4">
      {items.map((item) => {
        const percentage = item.monthlyLimit ? Math.min(100, Math.round((item.spent / item.monthlyLimit) * 100)) : 0;
        return (
          <div key={item.category} className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-white">{item.category}</h3>
                <p className="text-sm text-slate-400">
                  {formatCurrency(item.spent)} spent of {formatCurrency(item.monthlyLimit)}
                </p>
              </div>
              <span className={`text-sm font-medium ${item.exceeded ? "text-rose-300" : "text-emerald-300"}`}>
                {item.exceeded ? "Over budget" : `${formatCurrency(item.remaining)} left`}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${item.exceeded ? "bg-rose-400" : "bg-teal-300"}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
