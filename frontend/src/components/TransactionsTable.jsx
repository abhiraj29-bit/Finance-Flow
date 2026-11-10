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

export function TransactionsTable({
  items,
  pagination,
  onPageChange,
}) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-3xl border border-white/10">
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
            {items.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-slate-400">
                  No transactions found matching your criteria.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isSinkingFundWithdrawal =
                  item.category?.toLowerCase().includes("withdraw") ||
                  item.note?.toLowerCase().includes("withdrawn");
                const isDeposit =
                  item.source === "goal-allocation"
                    ? !isSinkingFundWithdrawal
                    : item.kind === "income";

                return (
                  <tr key={item._id} className="transition hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium border ${
                            isDeposit
                              ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                              : "border-rose-500/30 bg-rose-500/20 text-rose-300"
                          }`}
                        >
                          {isDeposit ? "Deposit" : "Withdrawal"}
                        </span>
                        {item.source === "recurring" && (
                          <span className="rounded-full bg-blue-400/20 px-2 py-0.5 text-[10px] text-blue-300">
                            recurring
                          </span>
                        )}
                        {item.source === "goal-allocation" && (
                          <span className="rounded-full bg-teal-400/20 px-2 py-0.5 text-[10px] text-teal-300">
                            sinking fund
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-200">{item.category}</td>
                    <td
                      className={`px-4 py-3 font-semibold ${
                        isDeposit ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {isDeposit ? "+" : "−"} {formatCurrency(item.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(item.date)}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-400">
                      {item.note || "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-2 text-xs text-slate-400">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.totalRecords} total)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-1.5 font-medium text-slate-300 hover:bg-white/10 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-1.5 font-medium text-slate-300 hover:bg-white/10 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
