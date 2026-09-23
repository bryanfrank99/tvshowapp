"use client";
import { useEffect, useState } from "react";
import { useLang } from "@/hooks/useLang";
import { clearProvidersCache } from "@/lib/providers";

export default function AutoAccessHandler() {
  const { lang } = useLang();
  const [toast, setToast] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let codeParam = "";
    try {
      const params = new URLSearchParams(window.location.search);
      codeParam = params.get("code") || "";
    } catch {
      return;
    }

    if (!codeParam || !codeParam.trim()) return;
    const cleanCode = codeParam.trim();

    (async () => {
      try {
        const res = await fetch("/api/access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: cleanCode }),
        });
        const data = await res.json();

        if (res.ok && data.ok) {
          try {
            localStorage.setItem("tvshow_code", cleanCode);
            if (data.ref_code) {
              localStorage.setItem("tvshow_ref_code", data.ref_code);
            }
          } catch {}

          clearProvidersCache();
          window.dispatchEvent(
            new CustomEvent("tvshow_session_updated", { detail: { code: cleanCode, data } })
          );

          const title =
            lang === "pt"
              ? "Acesso Ativado!"
              : lang === "en"
              ? "Access Granted!"
              : "¡Acceso Activado!";

          const message =
            lang === "pt"
              ? `Chave vinculada com sucesso${data.label ? ` (${data.label})` : ""}. Aproveite o catálogo!`
              : lang === "en"
              ? `Key activated successfully${data.label ? ` (${data.label})` : ""}. Enjoy TVShow!`
              : `Clave activada con éxito${data.label ? ` (${data.label})` : ""}. ¡Disfruta del catálogo!`;

          setToast({ type: "success", title, message });
        } else {
          let title =
            lang === "pt"
              ? "Erro de Acesso"
              : lang === "en"
              ? "Access Error"
              : "Error de Acceso";

          let message =
            lang === "pt"
              ? "Chave de acesso inválida."
              : lang === "en"
              ? "Invalid access key."
              : "Clave de acceso inválida.";

          if (data.error === "max_devices") {
            title =
              lang === "pt"
                ? "Limite Excedido"
                : lang === "en"
                ? "Device Limit Reached"
                : "Límite Excedido";
            message =
              lang === "pt"
                ? `Limite de dispositivos atingido para esta chave (${data.max || 3} aparelhos).`
                : lang === "en"
                ? `Maximum devices limit reached (${data.max || 3} devices).`
                : `Límite de dispositivos alcanzado para esta clave (${data.max || 3} equipos).`;
          } else if (data.error === "expired") {
            message =
              lang === "pt"
                ? "Esta chave de acesso já expirou. Contate o administrador."
                : lang === "en"
                ? "This access key has expired. Please contact support."
                : "Esta clave de acceso ha caducado. Contacta al administrador.";
          } else if (data.error === "revoked") {
            message =
              lang === "pt"
                ? "Esta chave de acesso foi cancelada pelo administrador."
                : lang === "en"
                ? "This access key was revoked by administrator."
                : "Esta clave de acceso fue cancelada por el administrador.";
          }

          setToast({ type: "error", title, message });
        }
      } catch (err) {
        console.error("AutoAccessHandler error:", err);
      } finally {
        try {
          const currentParams = new URLSearchParams(window.location.search);
          currentParams.delete("code");
          const newQuery = currentParams.toString() ? `?${currentParams.toString()}` : "";
          const newUrl = `${window.location.pathname}${newQuery}${window.location.hash}`;
          window.history.replaceState({}, "", newUrl);
        } catch {}

        setTimeout(() => {
          setToast(null);
        }, 5000);
      }
    })();
  }, [lang]);

  if (!toast) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full mx-auto px-4 sm:px-0 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
      <div
        className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl ${
          toast.type === "success"
            ? "bg-[#0c1a16]/95 border-emerald-500/40 text-emerald-200 shadow-emerald-950/50"
            : "bg-[#1f0d0d]/95 border-red-500/40 text-red-200 shadow-red-950/50"
        }`}
      >
        <div className="text-2xl shrink-0 mt-0.5">
          {toast.type === "success" ? "✨" : "⚠️"}
        </div>
        <div className="flex-1 min-w-0">
          <h4
            className={`font-bold text-sm ${
              toast.type === "success" ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {toast.title}
          </h4>
          <p className="text-xs opacity-90 mt-0.5 leading-relaxed">{toast.message}</p>
        </div>
        <button
          type="button"
          onClick={() => setToast(null)}
          className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 text-xs shrink-0 cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
