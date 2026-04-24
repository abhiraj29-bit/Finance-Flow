import { useState } from "react";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function GoalList({ items, onAllocate }) {
  const [drafts, setDrafts] = useState({});

  function setDraft(goalId, value) {
    setDrafts((current) => ({ ...current, [goalId]: value }));
  }

  return (
    <div className="space-y-4">
      {items.map((goal) => {
        const percentage = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));

        return (
          <div key={goal._id} className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: goal.color }} />
                <div>
                  <h3 className="font-medium text-white">{goal.name}</h3>
                  <p className="text-sm text-slate-400">
                    {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}
                  </p>
                </div>
              </div>
              <span className="text-sm text-slate-400">{percentage}% funded</span>
            </div>
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: goal.color }} />
            </div>
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white"
                type="number"
                min="0"
                placeholder="Allocate amount"
                value={drafts[goal._id] || ""}
                onChange={(event) => setDraft(goal._id, event.target.value)}
              />
              <button
                className="rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950"
                onClick={() => {
                  const amount = Number(drafts[goal._id]);
                  if (!amount) return;
                  onAllocate(goal._id, amount);
                  setDraft(goal._id, "");
                }}
                type="button"
              >
                Lock funds
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
