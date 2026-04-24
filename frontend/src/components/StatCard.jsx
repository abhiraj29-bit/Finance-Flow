export function StatCard({ label, value, tone = "default" }) {
  const toneMap = {
    default: "from-white/10 to-white/5",
    good: "from-emerald-400/20 to-emerald-400/5",
    warn: "from-amber-300/20 to-amber-300/5",
    danger: "from-rose-400/20 to-rose-400/5",
  };

  return (
    <div className={`rounded-3xl border border-white/10 bg-gradient-to-br ${toneMap[tone]} p-5 shadow-glow`}>
      <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

