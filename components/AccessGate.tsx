"use client";
import { useEffect, useState } from "react";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/dict";
import { clearProvidersCache } from "@/lib/providers";

const KEYS_ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "-"],
  ["Z", "X", "C", "V", "B", "N", "M", "_", "⌫"],
];

interface AccessGateProps {
  onOk: () => void;
  onCancel?: () => void;
}

export default function AccessGate({ onOk, onCancel }: AccessGateProps) {
  const { lang } = useLang();
  const d = t(lang);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [storedRef, setStoredRef] = useState("");
  const [storedCode, setStoredCode] = useState("");

  useEffect(() => {
    try {
      setStoredRef(localStorage.getItem("tvshow_ref_code") || "");
      setStoredCode(localStorage.getItem("tvshow_code") || "");
    } catch {}
  }, []);

  const handleKeyClick = (char: string) => {
    setErr("");
    if (char === "⌫") {
      setCode((c) => c.slice(0, -1));
    } else {
      setCode((c) => (c + char).toUpperCase());
    }
  };

  const handleClear = () => {
    setCode("");
    setErr("");
  };

  const handleUnlink = async () => {
    try {
      await fetch("/api/access", { method: "DELETE" });
    } catch {}
    try {
      localStorage.removeItem("tvshow_code");
      localStorage.removeItem("tvshow_ref_code");
    } catch {}
    setStoredCode("");
    setStoredRef("");
    setCode("");
    clearProvidersCache();
  };

  const submitWithCode = async (codeToSubmit: string) => {
    const trimmed = codeToSubmit.trim().toUpperCase();
    if (!trimmed) {
      setErr(lang === "pt" ? "Por favor, digite seu código." : "Por favor, introduce tu código.");
      return;
    }
    if (loading) return;
    setLoading(true);
    setErr("");
    try {
      const r = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        if (j.error === "max_devices") {
          if (j.ref_code) {
            try { localStorage.setItem("tvshow_ref_code", j.ref_code); } catch {}
            setStoredRef(j.ref_code);
          }
          setErr(`Límite de ${j.max || 3} dispositivos alcanzado para este código.`);
        } else if (j.ref_code) {
          try { localStorage.setItem("tvshow_ref_code", j.ref_code); } catch {}
          setStoredRef(j.ref_code);
          setErr(`${j.error === "revoked" ? d.gate_revoked : d.gate_expired} ${d.gate_contact}`);
        } else {
          setErr(r.status === 429 ? d.gate_rate : d.gate_invalid);
        }
      } else {
        try {
          localStorage.setItem("tvshow_ref_code", j.ref_code || "");
          localStorage.setItem("tvshow_code", trimmed);
        } catch {}
        if (j.ref_code) setStoredRef(j.ref_code);
        setStoredCode(trimmed);
        clearProvidersCache();
        onOk();
        return;
      }
    } catch {
      setErr(d.gate_invalid);
    }
    setLoading(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    submitWithCode(code);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#12121a]/95 p-5 text-center max-w-xl w-full mx-auto shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">🔒</span>
        <h2 className="text-lg font-black text-white">{d.gate_title}</h2>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15"
          >
            ✕
          </button>
        ) : (
          <span className="w-6" />
        )}
      </div>

      <p className="text-xs text-zinc-400 mb-3">{d.gate_hint}</p>

      {storedRef && (
        <div className="mb-3 p-2.5 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between gap-2 text-left">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{d.gate_ref}</p>
            <p className="text-sm font-black font-mono tracking-widest text-[#008CFF]">{storedRef}</p>
            {storedCode && (
              <p className="text-[10px] text-zinc-400">
                {d.gate_current}: <span className="font-mono text-white font-bold">{storedCode}</span>
              </p>
            )}
          </div>
          {storedCode && (
            <button
              type="button"
              onClick={handleUnlink}
              className="text-[11px] px-3 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30"
            >
              {d.gate_unlink}
            </button>
          )}
        </div>
      )}

      {/* Visual display / input */}
      <form onSubmit={submit} className="mb-3">
        <div className="relative flex items-center">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={d.gate_ph}
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-black/60 border-2 border-white/15 focus:border-[#008CFF] rounded-xl px-4 py-3 text-center text-xl font-mono font-bold tracking-widest text-white outline-none placeholder:text-zinc-600 transition"
          />
          {code && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 text-zinc-400 hover:text-white text-sm px-2 py-1"
              title={d.gate_clear}
            >
              ✕
            </button>
          )}
        </div>
      </form>

      {/* On-screen virtual keypad for Android TV D-Pad */}
      <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 mb-3 select-none">
        <div className="flex flex-col gap-1.5">
          {KEYS_ROWS.map((row, rIdx) => (
            <div key={rIdx} className="flex justify-center gap-1.5 flex-wrap">
              {row.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleKeyClick(k)}
                  className={`min-w-[32px] sm:min-w-[42px] h-10 px-2 rounded-lg font-mono font-bold text-sm transition-all active:scale-95 touch-manipulation focus:outline-none focus:ring-2 focus:ring-[#008CFF] focus:bg-[#008CFF] focus:text-white ${
                    k === "⌫"
                      ? "bg-red-500/20 text-red-300 border border-red-500/30 flex-1 max-w-[60px]"
                      : "bg-white/10 text-white hover:bg-[#008CFF] hover:text-white"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Action row */}
        <div className="flex justify-center gap-2 mt-2 pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#008CFF]"
          >
            {d.gate_clear}
          </button>
          <button
            type="button"
            onClick={() => submitWithCode(code)}
            disabled={loading}
            className="flex-1 py-2 px-6 rounded-lg bg-[#008CFF] hover:bg-[#0070cc] text-white text-xs font-bold uppercase tracking-wider disabled:opacity-40 shadow-lg shadow-blue-500/20 active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-white"
          >
            {loading ? "…" : d.gate_ok}
          </button>
        </div>
      </div>

      {err && <p className="text-xs text-red-400 font-medium mt-1">{err}</p>}
      <p className="text-[11px] text-zinc-500 mt-2">{d.gate_contact}</p>
    </div>
  );
}
