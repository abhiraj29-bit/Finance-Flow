function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value) {
  return new Date(value).toLocaleDateString();
}

export function TransactionsTable({ items }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10">
      <table className="min-w-full divide-y divide-white/10 text-left">
        <thead className="bg-white/5 text-xs uppercase tracking-[0.3em] text-slate-400">
          <tr>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Note</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 bg-slate-950/30 text-sm text-slate-200">
          {items.map((item) => (
            <tr key={item._id}>
              <td className="px-4 py-3">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${item.kind === "income" ? "bg-emerald-400/20 text-emerald-200" : "bg-rose-400/20 text-rose-200"}`}>
                  {item.kind}
                </span>
              </td>
              <td className="px-4 py-3">{item.category}</td>
              <td className="px-4 py-3">{formatCurrency(item.amount)}</td>
              <td className="px-4 py-3">{formatDate(item.date)}</td>
              <td className="px-4 py-3 text-slate-400">{item.note || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
