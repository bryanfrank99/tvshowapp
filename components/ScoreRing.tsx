// Anillo de puntuación estilo TMDB (0-10 → %).
export default function ScoreRing({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((value || 0) * 10)));
  const color = pct >= 70 ? "#22c55e" : pct >= 40 ? "#eab308" : "#ef4444";
  const r = 26;
  const circ = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex w-16 h-16 shrink-0" title={`${pct}%`}>
      <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="#0b0b10" stroke="rgba(255,255,255,.15)" strokeWidth="5" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${(circ * pct) / 100} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-black">{pct}<span className="text-[10px] font-bold">%</span></span>
    </span>
  );
}
