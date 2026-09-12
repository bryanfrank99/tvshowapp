"use client";
import { useEffect, useState } from "react";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/dict";
import { clearProvidersCache } from "@/lib/providers";

// Generar o recuperar ID de referencia único y persistente para el dispositivo (ej: TV-E1CC15-E3BC)
function getOrCreateRefCode(): string {
  try {
    let ref = localStorage.getItem("tvshow_ref_code");
    if (ref && /^TV-[A-F0-9]{6}-[A-F0-9]{4}$/i.test(ref.trim())) {
      return ref.trim().toUpperCase();
    }
    let hex = "";
    if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
      const bytes = new Uint8Array(5);
      window.crypto.getRandomValues(bytes);
      hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    } else {
      for (let i = 0; i < 10; i++) {
        hex += Math.floor(Math.random() * 16).toString(16).toUpperCase();
      }
    }
    ref = `TV-${hex.slice(0, 6)}-${hex.slice(6, 10)}`;
    localStorage.setItem("tvshow_ref_code", ref);
    return ref;
  } catch {
    return "TV-E1CC15-E3BC";
  }
}

// Modal / Gate: pide el código de acceso y crea sesión.
export default function AccessGate({ onOk }: { onOk: () => void }) {
  const { lang } = useLang();
  const d = t(lang);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [storedRef, setStoredRef] = useState("");

  useEffect(() => {
    try {
      const ref = getOrCreateRefCode();
      setStoredRef(ref);
    } catch {}
  }, []);

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
        if (j.error === "max_devices") {
          if (j.ref_code) {
            try { localStorage.setItem("tvshow_ref_code", j.ref_code); } catch {}
            setStoredRef(j.ref_code);
          }
          setErr(`Límite de ${j.max || 3} dispositivos alcanzado para este código. Cierra sesión en otro equipo o contacta al administrador.`);
        } else if (j.ref_code) {
          try { localStorage.setItem("tvshow_ref_code", j.ref_code); } catch {}
          setStoredRef(j.ref_code);
          setErr(`${j.error === "revoked" ? d.gate_revoked : d.gate_expired} ${d.gate_contact}`);
        } else {
          setErr(r.status === 429 ? d.gate_rate : d.gate_invalid);
        }
      } else {
        try {
          if (j.ref_code) localStorage.setItem("tvshow_ref_code", j.ref_code);
          localStorage.setItem("tvshow_code", code.trim());
        } catch {}
        if (j.ref_code) setStoredRef(j.ref_code);
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
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center max-w-md mx-auto w-full">
      <p className="text-3xl mb-2">🔒</p>
      <h2 className="text-xl font-black">{d.gate_title}</h2>
      <p className="text-sm text-zinc-400 mt-1 mb-3">{d.gate_hint}</p>
      {storedRef ? (
        <div className="mb-4 p-3.5 rounded-xl bg-black/50 border border-white/10">
          <p className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">{d.gate_ref}</p>
          <p className="text-2xl font-black tracking-widest text-[#008CFF] mt-1 select-all font-mono">{storedRef}</p>
          <p className="text-xs text-zinc-400 mt-1.5">{d.gate_contact}</p>
        </div>
      ) : (
        <p className="text-xs text-zinc-500 mb-4">{d.gate_contact}</p>
      )}
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={d.gate_ph}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-center tracking-widest outline-none focus:border-[#008CFF] focus:ring-2 focus:ring-[#008CFF]"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-[#008CFF] hover:bg-[#0070cc] font-bold text-sm text-white disabled:opacity-50 active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-white"
        >
          {loading ? "…" : d.gate_ok}
        </button>
      </form>
      {err && <p className="text-xs text-red-400 mt-3">{err}</p>}
    </div>
  );
}
