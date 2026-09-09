"use client";
import { useState } from "react";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/dict";
import { clearProvidersCache } from "@/lib/providers";

// Modal: pide el código de acceso y crea sesión.
export default function AccessGate({ onOk }: { onOk: () => void }) {
  const { lang } = useLang();
  const d = t(lang);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || loading) return;
    setLoading(true);
    setErr("");
    try {
      const r = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        setErr(r.status === 429 ? d.gate_rate : d.gate_invalid);
      } else {
        clearProvidersCache();
        onOk();
        return;
      }
    } catch {
      setErr(d.gate_invalid);
    }
    setLoading(false);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center max-w-md mx-auto">
      <p className="text-3xl mb-2">🔒</p>
      <h2 className="text-xl font-black">{d.gate_title}</h2>
      <p className="text-sm text-zinc-400 mt-1 mb-4">{d.gate_hint}</p>
      <form onSubmit={submit} className="flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={d.gate_ph}
          autoFocus autoComplete="off" spellCheck={false}
          className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-center tracking-widest outline-none focus:border-[#008CFF]" />
        <button disabled={loading} className="px-5 py-2.5 rounded-xl bg-[#008CFF] font-bold text-sm disabled:opacity-50">
          {loading ? "…" : d.gate_ok}
        </button>
      </form>
      {err && <p className="text-xs text-red-400 mt-3">{err}</p>}
    </div>
  );
}
