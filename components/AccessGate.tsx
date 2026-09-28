"use client";
import { useEffect, useState, useCallback } from "react";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/dict";
import { clearProvidersCache } from "@/lib/providers";
import { getOrCreateDeviceId } from "@/lib/device-id";

// Obtener código de referencia persistente en local si existe
function getStoredRefCode(): string {
  try {
    const ref = localStorage.getItem("tvshow_ref_code");
    if (ref && /^TV-[A-F0-9]{4,8}-[A-F0-9]{4,8}$/i.test(ref.trim())) {
      return ref.trim().toUpperCase();
    }
    return ref ? ref.trim().toUpperCase() : "";
  } catch {
    return "";
  }
}

// Modal / Gate: pide el código de acceso o muestra el modo renovación
export default function AccessGate({ onOk }: { onOk: () => void }) {
  const { lang } = useLang();
  const d = t(lang);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [storedRef, setStoredRef] = useState("");
  const [initialChecked, setInitialChecked] = useState(false);
  const [isRenewal, setIsRenewal] = useState(false);
  const [canEnterCode, setCanEnterCode] = useState(true);
  const [renewalReason, setRenewalReason] = useState<"expired" | "revoked" | "">("");
  const [checking, setChecking] = useState(false);

  // Consulta el estado del dispositivo en el servidor
  const checkStatus = useCallback(async () => {
    try {
      setChecking(true);
      const deviceId = getOrCreateDeviceId();
      const localRef = getStoredRefCode();
      const params = new URLSearchParams();
      if (deviceId) params.set("deviceId", deviceId);
      if (localRef) params.set("refCode", localRef);

      const r = await fetch(`/api/access?${params.toString()}`, { cache: "no-store" });
      const j = await r.json().catch(() => null);

      // Si el servidor indica que la clave ya está activa (ej: recién renovada por el admin)
      if (r.ok && j?.ok && j?.status === "active") {
        clearProvidersCache();
        onOk();
        return;
      }

      // Si el dispositivo está en modo renovación (clave vencida o desactivada en el servidor)
      if (j?.status === "renewal" || j?.canEnterCode === false) {
        setIsRenewal(true);
        setCanEnterCode(false);
        setRenewalReason(j?.reason === "revoked" ? "revoked" : "expired");
        const ref = j?.ref_code || localRef;
        if (ref) {
          setStoredRef(ref);
          try { localStorage.setItem("tvshow_ref_code", ref); } catch {}
        }
      } else {
        // Dispositivo nuevo o la clave ya no existe en el servidor (fue eliminada)
        setIsRenewal(false);
        setCanEnterCode(true);
        setRenewalReason("");
        // Si la clave fue borrada del servidor, limpiar la referencia local obsoleta
        if (j?.status === "new_or_deleted" || j?.reason === "not_found") {
          try { localStorage.removeItem("tvshow_ref_code"); } catch {}
          setStoredRef("");
        }
      }
    } catch {
      // Si falla la red, permitir ingresar código como fallback
      setCanEnterCode(true);
    } finally {
      setChecking(false);
      setInitialChecked(true);
    }
  }, [onOk]);

  useEffect(() => {
    const localRef = getStoredRefCode();
    if (localRef) setStoredRef(localRef);

    const onSessionUpdated = () => {
      onOk();
    };
    window.addEventListener("tvshow_session_updated", onSessionUpdated);

    // Verificación inicial de estado
    checkStatus();

    // Comprobar código por URL si viene como query param (?code=...)
    try {
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get("code");
      if (urlCode && urlCode.trim()) {
        const clean = urlCode.trim();
        setCode(clean);
        submitCode(clean);
      }
    } catch {}

    return () => {
      window.removeEventListener("tvshow_session_updated", onSessionUpdated);
    };
  }, [onOk, checkStatus]);

  // Sondeo periódico cada 10s cuando está en modo renovación para auto-desbloquear
  useEffect(() => {
    if (!isRenewal) return;
    const interval = setInterval(() => {
      checkStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, [isRenewal, checkStatus]);

  const submitCode = async (c: string) => {
    if (!c.trim() || loading) return;
    setLoading(true);
    setErr("");
    try {
      const deviceId = getOrCreateDeviceId();
      const r = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c.trim(), deviceId }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        if (j.error === "device_blocked_inactive") {
          const boundRef = j.bound_ref || j.ref_code || "";
          if (boundRef) {
            try { localStorage.setItem("tvshow_ref_code", boundRef); } catch {}
            setStoredRef(boundRef);
          }
          setIsRenewal(true);
          setCanEnterCode(false);
          setRenewalReason("expired");
          setErr(d.gate_device_blocked(boundRef));
        } else if (j.error === "max_devices") {
          if (j.ref_code) {
            try { localStorage.setItem("tvshow_ref_code", j.ref_code); } catch {}
            setStoredRef(j.ref_code);
          }
          setErr(`Límite de ${j.max || 3} dispositivos alcanzado para este código. Cierra sesión en otro equipo o contacta al administrador.`);
        } else if (j.ref_code) {
          try { localStorage.setItem("tvshow_ref_code", j.ref_code); } catch {}
          setStoredRef(j.ref_code);
          setIsRenewal(true);
          setCanEnterCode(false);
          setRenewalReason(j.error === "revoked" ? "revoked" : "expired");
          setErr(`${j.error === "revoked" ? d.gate_revoked : d.gate_expired} ${d.gate_contact}`);
        } else {
          setErr(r.status === 429 ? d.gate_rate : d.gate_invalid);
        }
      } else {
        try {
          if (j.ref_code) localStorage.setItem("tvshow_ref_code", j.ref_code);
          localStorage.setItem("tvshow_code", c.trim());
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitCode(code);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center max-w-md mx-auto w-full shadow-2xl backdrop-blur-md">
      <p className="text-3xl mb-2">🔒</p>
      <h2 className="text-xl font-black">{d.gate_title}</h2>

      {!initialChecked ? (
        <div className="py-8 flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#008CFF] border-t-transparent animate-spin" />
          <p className="text-xs text-zinc-400">{d.gate_checking}</p>
        </div>
      ) : isRenewal && !canEnterCode ? (
        /* MODO RENOVACIÓN: La clave existe en servidor pero está vencida o desactivada */
        <div className="mt-2 animate-fadeIn">
          <p className="text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg py-1 px-2.5 inline-block mb-3">
            {renewalReason === "revoked" ? d.gate_status_revoked : d.gate_status_expired}
          </p>

          {storedRef && (
            <div className="mb-4 p-3.5 rounded-xl bg-black/60 border border-white/10">
              <p className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">{d.gate_ref}</p>
              <p className="text-2xl font-black tracking-widest text-[#008CFF] mt-1 select-all font-mono">{storedRef}</p>
              <p className="text-xs text-zinc-300 mt-2 font-medium">{d.gate_contact}</p>
            </div>
          )}

          {/* Botón para comprobar renovación sin pedir nuevo código */}
          <button
            type="button"
            onClick={checkStatus}
            disabled={checking}
            className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-bold text-white flex items-center justify-center gap-2 active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-[#008CFF] disabled:opacity-50"
          >
            {checking ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>{d.gate_checking}</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>{d.gate_check_renewal}</span>
              </>
            )}
          </button>
          {err && <p className="text-xs text-red-400 mt-3">{err}</p>}
        </div>
      ) : (
        /* MODO NUEVO DISPOSITIVO O CLAVE ELIMINADA: Puede ingresar código */
        <div className="mt-1 animate-fadeIn">
          <p className="text-sm text-zinc-400 mb-4">{d.gate_hint}</p>

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
      )}
    </div>
  );
}

