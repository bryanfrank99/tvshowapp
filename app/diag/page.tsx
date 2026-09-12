"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStoredCode } from "@/hooks/useSession";

type TestResult = {
  name: string;
  endpoint: string;
  status: "idle" | "running" | "ok" | "error";
  httpCode?: number;
  durationMs?: number;
  summary?: string;
  data?: any;
};

export default function DiagPage() {
  const [deviceInfo, setDeviceInfo] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [runningAll, setRunningAll] = useState(false);
  const [testKey, setTestKey] = useState("");
  const [keyFeedback, setKeyFeedback] = useState("");
  const [activeEmbedUrl, setActiveEmbedUrl] = useState("");

  const updateDeviceInfo = () => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent || "";
    const storedCode = getStoredCode();
    const cookies = document.cookie || "(ninguna cookie accesible vía JS)";
    const dateStr = new Date().toString();
    const online = navigator.onLine ? "Online 🟢" : "Offline 🔴";

    setDeviceInfo({
      "User-Agent": ua,
      "Key en Storage": storedCode || "(vacío - sin clave en localStorage)",
      "Cookies": cookies,
      "Fecha / Hora del TV": dateStr,
      "Conexión": online,
      "Origen Web": window.location.origin,
    });
    if (storedCode && !testKey) {
      setTestKey(storedCode);
    }
  };

  const runAllTests = async () => {
    setRunningAll(true);
    updateDeviceInfo();

    const newResults: Record<string, TestResult> = {
      config: { name: "1. Conexión Básica API (/api/config)", endpoint: "/api/config", status: "running" },
      access: { name: "2. Estado de Sesión / Auth (/api/access)", endpoint: "/api/access", status: "running" },
      providers: { name: "3. Lista de Proveedores (/api/providers)", endpoint: "/api/providers", status: "running" },
      embed: { name: "4. Generador de Stream (/api/embed-url)", endpoint: "/api/embed-url", status: "running" },
      external: { name: "5. Conectividad Externa (Cinemeta)", endpoint: "https://v3-cinemeta.strem.io/meta/movie/tt0137523.json", status: "running" },
    };
    setResults({ ...newResults });

    // 1. /api/config
    const t0 = performance.now();
    try {
      const r = await fetch("/api/config", { cache: "no-store" });
      const t1 = performance.now();
      const j = await r.json().catch(() => ({}));
      newResults.config = {
        name: "1. Conexión Básica API (/api/config)",
        endpoint: "/api/config",
        status: r.ok ? "ok" : "error",
        httpCode: r.status,
        durationMs: Math.round(t1 - t0),
        summary: r.ok ? `Conexión con Vercel OK (Versión lista: ${j.providers_version || "N/A"})` : `Fallo con código ${r.status}`,
        data: j,
      };
    } catch (e: any) {
      newResults.config = {
        name: "1. Conexión Básica API (/api/config)",
        endpoint: "/api/config",
        status: "error",
        summary: `Error de red / DNS: ${e.message}`,
      };
    }
    setResults({ ...newResults });

    // 2. /api/access
    const t2 = performance.now();
    try {
      const r = await fetch("/api/access", { cache: "no-store" });
      const t3 = performance.now();
      const j = await r.json().catch(() => ({}));
      newResults.access = {
        name: "2. Estado de Sesión / Auth (/api/access)",
        endpoint: "/api/access",
        status: r.ok ? "ok" : "error",
        httpCode: r.status,
        durationMs: Math.round(t3 - t2),
        summary: r.ok ? "Sesión Válida y Autenticada" : `Acceso bloqueado (${j.error || r.status})`,
        data: j,
      };
    } catch (e: any) {
      newResults.access = {
        name: "2. Estado de Sesión / Auth (/api/access)",
        endpoint: "/api/access",
        status: "error",
        summary: `Error de conexión: ${e.message}`,
      };
    }
    setResults({ ...newResults });

    // 3. /api/providers
    const t4 = performance.now();
    let firstProviderId = "";
    try {
      const r = await fetch("/api/providers", { cache: "no-store" });
      const t5 = performance.now();
      const j = await r.json().catch(() => ({}));
      if (r.ok && Array.isArray(j.providers)) {
        firstProviderId = j.providers[0]?.id || "";
        newResults.providers = {
          name: "3. Lista de Proveedores (/api/providers)",
          endpoint: "/api/providers",
          status: "ok",
          httpCode: r.status,
          durationMs: Math.round(t5 - t4),
          summary: `ÉXITO: Se recibieron ${j.providers.length} servidores de streaming.`,
          data: j.providers.map((p: any) => `${p.name} (${p.id})`),
        };
      } else {
        newResults.providers = {
          name: "3. Lista de Proveedores (/api/providers)",
          endpoint: "/api/providers",
          status: "error",
          httpCode: r.status,
          durationMs: Math.round(t5 - t4),
          summary: `No cargó la lista (${j.error || "Código HTTP " + r.status})`,
          data: j,
        };
      }
    } catch (e: any) {
      newResults.providers = {
        name: "3. Lista de Proveedores (/api/providers)",
        endpoint: "/api/providers",
        status: "error",
        summary: `Fallo al pedir proveedores: ${e.message}`,
      };
    }
    setResults({ ...newResults });

    // 4. /api/embed-url
    const pid = firstProviderId || "vidcore";
    const t6 = performance.now();
    try {
      const r = await fetch(`/api/embed-url?provider=${pid}&type=movie&id=550&s=1&e=1`, { cache: "no-store" });
      const t7 = performance.now();
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.url) {
        setActiveEmbedUrl(j.url);
        newResults.embed = {
          name: "4. Generador de Stream (/api/embed-url)",
          endpoint: `/api/embed-url?provider=${pid}`,
          status: "ok",
          httpCode: r.status,
          durationMs: Math.round(t7 - t6),
          summary: `URL generada para ${j.name || pid}`,
          data: j.url,
        };
      } else {
        newResults.embed = {
          name: "4. Generador de Stream (/api/embed-url)",
          endpoint: `/api/embed-url?provider=${pid}`,
          status: "error",
          httpCode: r.status,
          durationMs: Math.round(t7 - t6),
          summary: `Error generando enlace: ${j.error || r.status}`,
          data: j,
        };
      }
    } catch (e: any) {
      newResults.embed = {
        name: "4. Generador de Stream (/api/embed-url)",
        endpoint: `/api/embed-url?provider=${pid}`,
        status: "error",
        summary: `Error de red: ${e.message}`,
      };
    }
    setResults({ ...newResults });

    // 5. Red externa (Cinemeta)
    const t8 = performance.now();
    try {
      const r = await fetch("https://v3-cinemeta.strem.io/meta/movie/tt0137523.json");
      const t9 = performance.now();
      const j = await r.json().catch(() => ({}));
      newResults.external = {
        name: "5. Conectividad Externa (Cinemeta)",
        endpoint: "https://v3-cinemeta.strem.io",
        status: r.ok ? "ok" : "error",
        httpCode: r.status,
        durationMs: Math.round(t9 - t8),
        summary: r.ok ? `Acceso externo a Internet OK (Título: ${j.meta?.name || "Fight Club"})` : `Fallo ${r.status}`,
      };
    } catch (e: any) {
      newResults.external = {
        name: "5. Conectividad Externa (Cinemeta)",
        endpoint: "https://v3-cinemeta.strem.io",
        status: "error",
        summary: `No hay salida externa a CDNs / Internet: ${e.message}`,
      };
    }

    setResults({ ...newResults });
    setRunningAll(false);
  };

  const handleApplyKey = async () => {
    if (!testKey.trim()) return;
    setKeyFeedback("Probando autenticación...");
    try {
      const r = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: testKey.trim() }),
      });
      const j = await r.json();
      if (r.ok && j.ok) {
        localStorage.setItem("tvshow_code", testKey.trim());
        document.cookie = `tv_apk_key=${testKey.trim()}; path=/; max-age=31536000; SameSite=Lax`;
        setKeyFeedback("✅ Clave válida y guardada. Repitiendo pruebas...");
        runAllTests();
      } else {
        setKeyFeedback(`❌ Clave rechazada: ${j.error || "error desconocido"}`);
      }
    } catch (e: any) {
      setKeyFeedback(`❌ Error al conectar: ${e.message}`);
    }
  };

  useEffect(() => {
    runAllTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 text-zinc-200">
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
            <span>🩺</span> Diagnóstico de Conexión & API
          </h1>
          <p className="text-sm text-zinc-400">
            Prueba de enlace entre este dispositivo (Android TV) y los servidores de la aplicación.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={runAllTests}
            disabled={runningAll}
            autoFocus
            className="px-6 py-3 rounded-xl bg-[#008CFF] hover:bg-[#0070cc] text-white font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-95 transition focus:ring-4 focus:ring-white disabled:opacity-50"
          >
            {runningAll ? "⏳ Ejecutando pruebas…" : "🔄 Repetir Pruebas"}
          </button>
          <Link
            href="/"
            className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm active:scale-95 transition focus:ring-4 focus:ring-white"
          >
            ← Volver al Inicio
          </Link>
        </div>
      </div>

      {/* Tarjeta de Información del Dispositivo */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span>📺</span> Información del Entorno y Dispositivo
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {Object.entries(deviceInfo).map(([k, v]) => (
            <div key={k} className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">{k}</span>
              <p className="font-mono text-zinc-200 break-all">{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Probar Clave Directamente */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span>🔑</span> Comprobar / Guardar Clave de Acceso
        </h2>
        <p className="text-xs text-zinc-400">
          Si el televisor no detectó la clave automáticamente, puedes escribirla aquí para autenticarte y verificar si se desbloquean los servidores.
        </p>
        <div className="flex gap-2 max-w-md">
          <input
            type="text"
            value={testKey}
            onChange={(e) => setTestKey(e.target.value.toUpperCase())}
            placeholder="Ej: 50DAFC04"
            className="flex-1 min-w-0 bg-black/50 border border-white/15 focus:border-[#008CFF] rounded-xl px-4 py-2.5 font-mono text-lg text-center tracking-widest text-white outline-none"
          />
          <button
            onClick={handleApplyKey}
            className="px-5 py-2.5 rounded-xl bg-[#008CFF] hover:bg-[#0070cc] text-white font-bold text-sm active:scale-95 transition focus:ring-2 focus:ring-white"
          >
            Probar Clave
          </button>
        </div>
        {keyFeedback && <p className="text-xs font-semibold">{keyFeedback}</p>}
      </div>

      {/* Resultados de las Pruebas */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span>🧪</span> Resultados de las Pruebas de API
        </h2>
        <div className="space-y-3">
          {Object.values(results).map((res) => {
            const isOk = res.status === "ok";
            const isErr = res.status === "error";
            const isRunning = res.status === "running";

            return (
              <div
                key={res.name}
                className={`p-4 rounded-xl border transition-all ${
                  isOk
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : isErr
                    ? "bg-red-500/10 border-red-500/30"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                  <span className="font-bold text-sm text-white flex items-center gap-2">
                    <span>{isOk ? "✅" : isErr ? "❌" : isRunning ? "⏳" : "⚪"}</span>
                    <span>{res.name}</span>
                  </span>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    {res.httpCode && (
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          res.httpCode === 200 ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                        }`}
                      >
                        HTTP {res.httpCode}
                      </span>
                    )}
                    {res.durationMs !== undefined && (
                      <span className="text-zinc-400">{res.durationMs} ms</span>
                    )}
                  </div>
                </div>
                <p className={`text-xs ${isOk ? "text-emerald-200" : isErr ? "text-red-200" : "text-zinc-400"}`}>
                  {res.summary || "En espera…"}
                </p>

                {res.data && (
                  <div className="mt-2 p-2.5 rounded-lg bg-black/50 text-[11px] font-mono text-zinc-300 max-h-40 overflow-y-auto border border-white/5">
                    {typeof res.data === "object" ? JSON.stringify(res.data, null, 2) : String(res.data)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Reproductor de Prueba en Vivo (Iframe Test) */}
      {activeEmbedUrl && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>🎬</span> Prueba de Renderizado de Iframe en Vivo
          </h2>
          <p className="text-xs text-zinc-400">
            Si la URL se generó correctamente, el iframe de abajo debe cargar el reproductor de video sin pantalla negra ni bloqueos.
          </p>
          <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/10">
            <iframe
              src={activeEmbedUrl}
              className="w-full h-full"
              allowFullScreen
              allow="autoplay; encrypted-media; fullscreen"
            />
          </div>
          <p className="text-[11px] font-mono text-zinc-500 break-all">{activeEmbedUrl}</p>
        </div>
      )}
    </div>
  );
}
