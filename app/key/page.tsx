"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AccessGate from "@/components/AccessGate";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/dict";
import { ensureSession, getStoredCode, clearStoredCode } from "@/hooks/useSession";
import { clearProvidersCache } from "@/lib/providers";

export default function KeyPage() {
  const { lang } = useLang();
  const d = t(lang);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [storedCode, setStoredCode] = useState("");
  const [storedRef, setStoredRef] = useState("");

  const checkStatus = async () => {
    try {
      setStoredCode(getStoredCode());
      setStoredRef(localStorage.getItem("tvshow_ref_code") || "");
      const ok = await ensureSession();
      setHasSession(ok);
    } catch {
      setHasSession(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleUnlink = async () => {
    try {
      await fetch("/api/access", { method: "DELETE" });
    } catch {}
    clearStoredCode();
    try { localStorage.removeItem("tvshow_ref_code"); } catch {}
    clearProvidersCache();
    setStoredCode("");
    setStoredRef("");
    setHasSession(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-4 sm:py-8 px-2 sm:px-4">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-3">
            <span>🔑</span>
            <span>{d.vincular_tv || "Key"}</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {lang === "pt"
              ? "Gerencie seu código de acesso para assistir filmes, séries e canais ao vivo."
              : "Administra tu código de acceso para ver películas, series y canales en vivo."}
          </p>
        </div>
        {hasSession && (
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-2 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{lang === "pt" ? "Ativo" : "Activo"}</span>
          </span>
        )}
      </div>

      {hasSession && (storedCode || storedRef) ? (
        <div className="rounded-2xl border border-white/10 bg-[#12121a]/95 p-6 shadow-2xl backdrop-blur-md mb-6 space-y-5">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-sm font-bold">
                {lang === "pt" ? "Código vinculado com sucesso!" : "¡Código vinculado con éxito!"}
              </p>
              <p className="text-xs text-emerald-300/80 mt-0.5">
                {lang === "pt"
                  ? "Seu dispositivo está ativo e pronto para reproduzir todos os conteúdos."
                  : "Tu dispositivo está activo y listo para reproducir todos los contenidos."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {storedCode && (
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10">
                <p className="text-[11px] text-zinc-400 uppercase tracking-wider">{d.gate_current}</p>
                <p className="text-lg font-mono font-bold text-white mt-1 tracking-widest">{storedCode}</p>
              </div>
            )}
            {storedRef && (
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10">
                <p className="text-[11px] text-zinc-400 uppercase tracking-wider">{d.gate_ref}</p>
                <p className="text-lg font-mono font-bold text-[#008CFF] mt-1 tracking-widest">{storedRef}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/"
              className="flex-1 min-w-[140px] py-3 px-6 rounded-xl bg-[#008CFF] hover:bg-[#0070cc] text-white text-sm font-bold text-center active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-white"
            >
              {lang === "pt" ? "Ir ao Início" : "Ir al Inicio"}
            </Link>
            <button
              type="button"
              onClick={handleUnlink}
              className="py-3 px-5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-sm font-bold active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              {d.gate_unlink}
            </button>
          </div>
        </div>
      ) : (
        <AccessGate
          onOk={() => {
            checkStatus();
          }}
        />
      )}
    </div>
  );
}
