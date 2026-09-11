"use client";
import { useCallback, useEffect, useState } from "react";
import { getProviderLangMeta, PROVIDER_LANGS, SUBTITLE_LANGS, parseLangs, parseSubs } from "@/lib/providers";

// Panel admin moderno: KPIs de estado, dispositivos (máx 3), sesiones, servidores + live.
type DeviceInfo = {
  hint: string;
  lastSeen: string | null;
  createdAt: string;
};

type Code = {
  id: string;
  label: string;
  ref_code: string;
  expires_at: string;
  revoked: boolean;
  created_at: string;
  deviceCount?: number;
  maxDevices?: number;
  lastSeen?: string | null;
  devices?: DeviceInfo[];
};

type KPIs = {
  totalCodes: number;
  activeCodes: number;
  expiringSoon: number;
  totalDevices: number;
  revokedCodes: number;
  expiredCodes: number;
  fullCapacityCodes: number;
  maxDevicesPerCode: number;
};

type Prov = {
  id: string;
  name: string;
  lang?: string;
  languages?: string[];
  subtitles?: string[];
  is_beta?: boolean;
  movie_tpl: string;
  tv_tpl: string;
  needs_tmdb: boolean;
  tv_ok: boolean;
  entry_key: string;
  active: boolean;
  ord: number;
};
type Live = { id: string; name: string; format: string; list: string; active: boolean; ord: number };

const api = (p: string, init?: RequestInit) => fetch(`/api/admin/${p}`, { ...init, cache: "no-store" });

function formatRelativeTime(dateStr?: string | null) {
  if (!dateStr) return "Sin conexiones";
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return "Hace un momento";
  if (diffSec < 3600) return `Hace ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `Hace ${Math.floor(diffSec / 3600)} h`;
  const diffDays = Math.floor(diffSec / 86400);
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AdminPage() {
  const [auth, setAuth] = useState(false);
  const [pass, setPass] = useState("");
  const [tab, setTab] = useState<"codes" | "prov" | "live">("codes");
  const [codes, setCodes] = useState<Code[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [provs, setProvs] = useState<Prov[]>([]);
  const [live, setLive] = useState<Live[]>([]);
  const [version, setVersion] = useState("");
  const [label, setLabel] = useState("");
  const [days, setDays] = useState("30");
  const [newCode, setNewCode] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "expiring" | "full" | "expired">("all");
  const [expandedCodeId, setExpandedCodeId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<Prov> & { _new?: boolean } | null>(null);
  const [editLive, setEditLive] = useState<Partial<Live> & { _new?: boolean } | null>(null);

  const load = useCallback(async () => {
    const [c, p, l] = await Promise.all([
      api("codes").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      api("providers").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      api("live").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    if (!c || !p) { setAuth(false); return; }
    setAuth(true);
    setCodes(c.codes || []);
    if (c.kpis) setKpis(c.kpis);
    setProvs(p.providers || []);
    setVersion(p.version || "");
    setLive(l?.live || []);
  }, []);

  const [health, setHealth] = useState<string>("");
  useEffect(() => {
    fetch("/api/admin/health", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (!j.supabase) setHealth(`Supabase no configurado: pon SUPABASE_URL/SERVICE_KEY en .env.local y Vercel`); })
      .catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pass }) });
    if (r.ok) { setPass(""); load(); }
    else setMsg("Clave incorrecta");
  };

  if (!auth) {
    return (
      <div className="max-w-sm mx-auto py-16 px-4">
        <h1 className="text-2xl font-black mb-4">Administración</h1>
        {health && <p className="text-xs text-red-400 mb-3">{health}</p>}
        <form onSubmit={login} className="flex gap-2">
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Clave admin"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-[#008CFF]" />
          <button className="px-5 py-2.5 rounded-xl bg-[#008CFF] font-bold text-sm text-white">Entrar</button>
        </form>
        {msg && <p className="text-xs text-red-400 mt-2">{msg}</p>}
      </div>
    );
  }

  const createCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api("codes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label, days: Number(days) || 30 }) });
    const j = await r.json();
    if (r.ok) { setNewCode(j); setLabel(""); setCopiedLink(false); setCopiedCode(false); load(); }
  };

  const resetSessions = async (codeId: string, codeLabel: string) => {
    if (!confirm(`¿Desvincular todos los dispositivos de "${codeLabel || 'este código'}"?\nSe liberarán los 3 cupos para permitir conectar nuevos dispositivos.`)) return;
    const r = await api(`codes?resetSessions=${codeId}`, { method: "DELETE" });
    if (r.ok) {
      setMsg("Dispositivos desvinculados correctamente. Cupos liberados (0/3).");
      load();
    } else {
      setMsg("Error al desvincular dispositivos.");
    }
  };

  const copyDirectLink = (codeStr: string) => {
    const url = `${window.location.origin}/?code=${codeStr}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const copyOnlyCode = (codeStr: string) => {
    navigator.clipboard.writeText(codeStr);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const saveProv = async () => {
    if (!edit?.id || !edit?.name || !edit?.movie_tpl || !edit?.tv_tpl) { setMsg("Completa id, nombre y plantillas"); return; }
    const r = await api("providers", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(edit) });
    if (r.ok) { setEdit(null); setMsg(""); load(); } else setMsg("Error guardando");
  };

  const saveLive = async () => {
    if (!editLive?.id || !editLive?.name || !editLive?.format || !editLive?.list) { setMsg("Completa todo"); return; }
    const r = await api("live", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editLive) });
    if (r.ok) { setEditLive(null); setMsg(""); load(); } else setMsg("Error guardando");
  };

  const inp = "w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-[#008CFF]";
  const btn = "px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs hover:border-[#008CFF] transition-colors";

  // Filtrado de códigos
  const filteredCodes = codes.filter((c) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || (c.label && c.label.toLowerCase().includes(q)) || (c.ref_code && c.ref_code.toLowerCase().includes(q));
    if (!matchesSearch) return false;

    const exp = new Date(c.expires_at).getTime() <= Date.now();
    const daysLeft = Math.ceil((new Date(c.expires_at).getTime() - Date.now()) / 86400000);

    if (filterStatus === "active") return !c.revoked && !exp;
    if (filterStatus === "expiring") return !c.revoked && !exp && daysLeft <= 7;
    if (filterStatus === "full") return (c.deviceCount || 0) >= (c.maxDevices || 3);
    if (filterStatus === "expired") return c.revoked || exp;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header & Tabs */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <h1 className="text-2xl font-black mr-2">Admin Dashboard</h1>
        {(["codes", "prov", "live"] as const).map((tb) => (
          <button key={tb} onClick={() => { setTab(tb); setMsg(""); }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${tab === tb ? "bg-[#008CFF] border-[#008CFF] text-white" : "border-white/15 text-zinc-400 hover:border-white/30"}`}>
            {tb === "codes" ? `Códigos (${codes.length})` : tb === "prov" ? `Servidores (v${version || "?"})` : "Live TV"}
          </button>
        ))}
        <button onClick={() => fetch("/api/admin/logout", { method: "DELETE" }).then(() => setAuth(false))}
          className="ml-auto px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-red-400 border border-white/10 hover:border-red-400/40">Salir</button>
      </div>

      {msg && (
        <div className="p-3 mb-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300 flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg("")} className="text-zinc-400 hover:text-white ml-2 text-sm">✕</button>
        </div>
      )}

      {tab === "codes" && (
        <>
          {/* Status KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <span className="text-xs text-zinc-400 font-medium">Códigos Activos</span>
              <div className="text-2xl font-black text-white mt-1">
                {kpis?.activeCodes ?? 0} <span className="text-xs font-normal text-zinc-500">/ {kpis?.totalCodes ?? 0}</span>
              </div>
              <span className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                Operando normalmente
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <span className="text-xs text-zinc-400 font-medium">Dispositivos Vinculados</span>
              <div className="text-2xl font-black text-[#008CFF] mt-1">
                {kpis?.totalDevices ?? 0}
              </div>
              <span className="text-[11px] text-zinc-400 mt-1 block">Límite: 3 por código</span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <span className="text-xs text-zinc-400 font-medium">Por Vencer (≤ 7 días)</span>
              <div className={`text-2xl font-black mt-1 ${(kpis?.expiringSoon ?? 0) > 0 ? "text-amber-400" : "text-zinc-200"}`}>
                {kpis?.expiringSoon ?? 0}
              </div>
              <span className="text-[11px] text-zinc-400 mt-1 block">Requieren renovación</span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <span className="text-xs text-zinc-400 font-medium">Capacidad Llena (3/3)</span>
              <div className={`text-2xl font-black mt-1 ${(kpis?.fullCapacityCodes ?? 0) > 0 ? "text-orange-400" : "text-zinc-200"}`}>
                {kpis?.fullCapacityCodes ?? 0}
              </div>
              <span className="text-[11px] text-zinc-400 mt-1 block">Cupo completo</span>
            </div>
          </div>

          {/* Formulario Crear Código */}
          <form onSubmit={createCode} className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-5 flex gap-2.5 flex-wrap items-center">
            <div className="flex-1 min-w-[200px]">
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Etiqueta / Cliente (ej. Familia Pérez, Habitación 2)" className={inp} />
            </div>
            <div className="w-24">
              <input value={days} onChange={(e) => setDays(e.target.value)} placeholder="Días" inputMode="numeric" className={inp} />
            </div>
            <button className="px-5 py-2 rounded-xl bg-[#008CFF] hover:bg-[#0070cc] text-white font-bold text-sm transition-colors shadow-lg shadow-[#008CFF]/20">
              + Generar Código
            </button>
          </form>

          {/* Notificación de nuevo código generado con Copiado Rápido */}
          {newCode && (
            <div className="mb-5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold text-sm text-emerald-400">¡Nuevo código generado con éxito!</span>
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">Máx. 3 dispositivos</span>
              </div>
              <p className="text-xs text-emerald-200/80">
                Por motivos de seguridad el código solo se muestra en este momento. Cópialo o comparte el enlace directo:
              </p>
              <div className="flex items-center gap-3 flex-wrap pt-1">
                <div className="bg-black/40 border border-emerald-500/30 rounded-xl px-3 py-1.5 font-mono text-lg font-black tracking-widest text-white">
                  {newCode.code || newCode}
                </div>
                {newCode.ref_code && (
                  <span className="text-xs text-zinc-400 font-mono">Ref: {newCode.ref_code}</span>
                )}
                <button type="button" onClick={() => copyOnlyCode(newCode.code || newCode)} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white">
                  {copiedCode ? "✓ Código Copiado" : "Copiar Código"}
                </button>
                <button type="button" onClick={() => copyDirectLink(newCode.code || newCode)} className="px-3 py-1.5 rounded-lg bg-[#008CFF] hover:bg-[#0070cc] text-xs font-semibold text-white">
                  {copiedLink ? "✓ Enlace Copiado" : "🔗 Copiar Enlace Rápido"}
                </button>
              </div>
            </div>
          )}

          {/* Filtros y Búsqueda */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4 items-stretch sm:items-center justify-between">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button onClick={() => setFilterStatus("all")}
                className={`px-3 py-1 rounded-lg text-xs font-medium border ${filterStatus === "all" ? "bg-white/15 border-white/30 text-white" : "border-white/5 text-zinc-400 hover:text-white"}`}>
                Todos ({codes.length})
              </button>
              <button onClick={() => setFilterStatus("active")}
                className={`px-3 py-1 rounded-lg text-xs font-medium border ${filterStatus === "active" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : "border-white/5 text-zinc-400 hover:text-white"}`}>
                Activos ({kpis?.activeCodes ?? 0})
              </button>
              <button onClick={() => setFilterStatus("expiring")}
                className={`px-3 py-1 rounded-lg text-xs font-medium border ${filterStatus === "expiring" ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "border-white/5 text-zinc-400 hover:text-white"}`}>
                Por Vencer ({kpis?.expiringSoon ?? 0})
              </button>
              <button onClick={() => setFilterStatus("full")}
                className={`px-3 py-1 rounded-lg text-xs font-medium border ${filterStatus === "full" ? "bg-orange-500/20 border-orange-500/40 text-orange-300" : "border-white/5 text-zinc-400 hover:text-white"}`}>
                Llenos 3/3 ({kpis?.fullCapacityCodes ?? 0})
              </button>
              <button onClick={() => setFilterStatus("expired")}
                className={`px-3 py-1 rounded-lg text-xs font-medium border ${filterStatus === "expired" ? "bg-red-500/20 border-red-500/40 text-red-300" : "border-white/5 text-zinc-400 hover:text-white"}`}>
                Caducados ({ (kpis?.expiredCodes ?? 0) + (kpis?.revokedCodes ?? 0) })
              </button>
            </div>

            <div className="w-full sm:w-64">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por etiqueta o ref..." className={inp} />
            </div>
          </div>

          {/* Listado de Códigos */}
          <div className="space-y-3">
            {filteredCodes.map((c) => {
              const exp = new Date(c.expires_at).getTime() < Date.now();
              const daysLeft = Math.ceil((new Date(c.expires_at).getTime() - Date.now()) / 86400000);
              const deviceCount = c.deviceCount || 0;
              const maxDevices = c.maxDevices || 3;
              const isFull = deviceCount >= maxDevices;
              const isExpanded = expandedCodeId === c.id;

              return (
                <div key={c.id} className={`rounded-2xl border transition-all ${
                  c.revoked
                    ? "border-amber-500/30 bg-amber-500/5"
                    : exp
                    ? "border-red-500/30 bg-red-500/5"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                } p-4`}>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    {/* Info del Código */}
                    <div className="flex flex-col gap-1 min-w-[240px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-white">{c.label || "(Sin etiqueta)"}</span>
                        {c.revoked && <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">Revocado</span>}
                        {exp && !c.revoked && <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded-full">Caducado</span>}
                        {!exp && !c.revoked && daysLeft <= 7 && <span className="text-[10px] bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-2 py-0.5 rounded-full">Vence en {daysLeft}d</span>}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-400">
                        <span className="font-mono bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-zinc-300">{c.ref_code}</span>
                        <span>· Expira: {new Date(c.expires_at).toLocaleDateString()}</span>
                        {!exp && !c.revoked && <span className="text-zinc-500">({daysLeft}d restantes)</span>}
                      </div>

                      {/* Estado de Dispositivos y Última Conexión */}
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setExpandedCodeId(isExpanded ? null : c.id)}
                          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
                            isFull
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold"
                              : deviceCount > 0
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-white/5 text-zinc-400 border-white/10"
                          }`}
                        >
                          <span>📱 {deviceCount}/{maxDevices} dispositivos</span>
                          <span className="text-[10px] text-zinc-400">{isExpanded ? "▲" : "▼"}</span>
                        </button>

                        <span className="text-[11px] text-zinc-400">
                          Última conexión: <b className="text-zinc-300 font-medium">{formatRelativeTime(c.lastSeen)}</b>
                        </span>
                      </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                      {deviceCount > 0 && (
                        <button
                          type="button"
                          title="Desvincular todos los dispositivos para permitir nuevas conexiones"
                          onClick={() => resetSessions(c.id, c.label)}
                          className={`${btn} bg-orange-500/10 border-orange-500/30 text-orange-300 hover:bg-orange-500/20`}
                        >
                          Liberar cupos (0/{maxDevices})
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={async () => {
                          const r = await api("codes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, renew: true, days: 30 }) });
                          const j = await r.json();
                          if (r.ok) {
                            setNewCode({ code: j.code, ref_code: j.ref_code });
                            setMsg(`Renovado: Nuevo código ${j.code} (30 días)`);
                            load();
                          } else setMsg("Error renovando código");
                        }}
                        className={`${btn} bg-[#008CFF]/20 border-[#008CFF]/30 text-[#008CFF] hover:bg-[#008CFF]/30 font-medium`}
                      >
                        Renovar 30d
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          const r = await api("codes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, extendDays: 30 }) });
                          if (r.ok) { setMsg("Extendido por 30 días adicionales"); load(); }
                          else setMsg("Error extendiendo plazo");
                        }}
                        className={btn}
                      >
                        +30d
                      </button>

                      <button
                        type="button"
                        onClick={() => api("codes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, revoked: !c.revoked }) }).then(load)}
                        className={btn}
                      >
                        {c.revoked ? "Reactivar" : "Revocar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`¿Eliminar código "${c.label || c.ref_code}"?\nEsto cancelará también todas sus sesiones activas.`)) {
                            api(`codes?id=${c.id}`, { method: "DELETE" }).then(load);
                          }
                        }}
                        className={`${btn} hover:!border-red-500 hover:text-red-400`}
                      >
                        Borrar
                      </button>
                    </div>
                  </div>

                  {/* Panel expandible de dispositivos conectados */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-300">
                          Dispositivos vinculados a este código ({deviceCount} de {maxDevices} máx):
                        </span>
                        {deviceCount > 0 && (
                          <button
                            type="button"
                            onClick={() => resetSessions(c.id, c.label)}
                            className="text-[11px] text-orange-400 hover:underline"
                          >
                            Desvincular todos los dispositivos
                          </button>
                        )}
                      </div>

                      {c.devices && c.devices.length > 0 ? (
                        <div className="grid sm:grid-cols-3 gap-2">
                          {c.devices.map((d, idx) => (
                            <div key={idx} className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs flex flex-col gap-1">
                              <div className="font-semibold text-white flex items-center gap-1.5">
                                <span>📱</span>
                                <span>{d.hint || "Dispositivo desconocido"}</span>
                              </div>
                              <span className="text-[11px] text-zinc-400">
                                Activo: <b className="text-zinc-300">{formatRelativeTime(d.lastSeen)}</b>
                              </span>
                              <span className="text-[10px] text-zinc-500">
                                Conectado: {new Date(d.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-500 italic py-1">
                          No hay dispositivos vinculados aún. El código está libre para usar en hasta 3 dispositivos.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {!filteredCodes.length && (
              <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl">
                <p className="text-sm text-zinc-400">No se encontraron códigos con los filtros actuales.</p>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "prov" && (
        <>
          <button onClick={() => setEdit({ _new: true, active: true, is_beta: false, lang: "multi", languages: ["multi"], subtitles: ["es", "en"], needs_tmdb: false, tv_ok: false, ord: provs.length } as any)}
            className="mb-4 px-4 py-2 rounded-xl bg-[#008CFF] font-bold text-sm text-white">+ Nuevo servidor</button>
          <div className="space-y-2">
            {provs.map((p) => {
              const audios = p.languages && p.languages.length ? p.languages : parseLangs(p.lang, p.id);
              const subs = p.subtitles && p.subtitles.length ? p.subtitles : parseSubs(p.subtitles, p.id);
              return (
                <div key={p.id} className="p-3 rounded-xl border border-white/10 bg-white/5 flex items-center gap-2.5 flex-wrap">
                  <b className="text-sm text-white">{p.name}</b>
                  {p.is_beta && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1" title="Servidor Beta: nunca sale por defecto al reproducir">
                      <span>🧪</span>
                      <span>BETA</span>
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] bg-white/10 border border-white/15 px-2 py-0.5 rounded-full text-zinc-200 font-medium inline-flex items-center gap-1">
                      <span>🔊</span>
                      <span>{audios.map((a) => getProviderLangMeta(a).badge).join("/")}</span>
                    </span>
                    {subs.length > 0 && (
                      <span className="text-[10px] bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 rounded-full text-sky-300 font-medium inline-flex items-center gap-1">
                        <span>💬</span>
                        <span>{subs.map((s) => s.toUpperCase()).join("/")}</span>
                      </span>
                    )}
                  </div>
                  <code className="text-xs text-zinc-400">{p.id}</code>
                  {!p.active && <span className="text-xs bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">inactivo</span>}
                  {p.tv_ok && <span className="text-xs bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">tv ok</span>}
                  <span className="ml-auto flex gap-2">
                    <button
                      onClick={() => api("providers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, is_beta: !p.is_beta }) }).then(load)}
                      className={`${btn} ${p.is_beta ? "text-amber-300 border-amber-500/40 bg-amber-500/10" : ""}`}
                      title={p.is_beta ? "Quitar marca de Beta" : "Marcar como Beta (nunca saldrá por defecto)"}
                    >
                      {p.is_beta ? "🧪 Quitar Beta" : "🧪 Marcar Beta"}
                    </button>
                    <button onClick={() => api("providers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, active: !p.active }) }).then(load)} className={btn}>
                      {p.active ? "Desactivar" : "Activar"}
                    </button>
                    <button onClick={() => setEdit({ ...p, is_beta: !!p.is_beta, languages: audios, subtitles: subs, lang: audios.join(",") })} className={btn}>Editar</button>
                    <button onClick={() => { if (confirm(`¿Borrar ${p.name}?`)) api(`providers?id=${p.id}`, { method: "DELETE" }).then(load); }} className={`${btn} hover:!border-red-500 hover:text-red-400`}>Borrar</button>
                  </span>
                </div>
              );
            })}
          </div>
          {edit && (
            <div className="mt-4 p-4 rounded-2xl border border-[#008CFF]/40 bg-black/60 space-y-3">
              <h3 className="font-bold text-sm text-white">{edit._new ? "Nuevo servidor" : `Editar ${edit.id}`}</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                <input value={edit.id || ""} disabled={!edit._new} onChange={(e) => setEdit({ ...edit, id: e.target.value })} placeholder="id (ej. vidcore)" className={inp} />
                <input value={edit.name || ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Nombre" className={inp} />
              </div>

              {/* Selector de múltiples audios */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1.5">
                  <span>🔊</span>
                  <span>Idiomas de Audio incluidos:</span>
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {PROVIDER_LANGS.map((pl) => {
                    const currentLangs: string[] = edit.languages || (edit.lang ? edit.lang.split(",").map((s) => s.trim()) : ["multi"]);
                    const isChecked = currentLangs.includes(pl.id);
                    return (
                      <button
                        type="button"
                        key={pl.id}
                        onClick={() => {
                          let next = isChecked ? currentLangs.filter((l) => l !== pl.id) : [...currentLangs, pl.id];
                          if (!next.length) next = ["multi"];
                          setEdit({ ...edit, languages: next, lang: next.join(",") });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs border font-medium transition-all ${
                          isChecked
                            ? "bg-[#008CFF]/25 border-[#008CFF] text-white shadow-sm"
                            : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {isChecked ? "✓ " : ""}{pl.flag} {pl.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector de subtítulos */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1.5">
                  <span>💬</span>
                  <span>Subtítulos disponibles:</span>
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {SUBTITLE_LANGS.map((sl) => {
                    const currentSubs: string[] = edit.subtitles || [];
                    const isChecked = currentSubs.includes(sl.id);
                    return (
                      <button
                        type="button"
                        key={sl.id}
                        onClick={() => {
                          const next = isChecked ? currentSubs.filter((s) => s !== sl.id) : [...currentSubs, sl.id];
                          setEdit({ ...edit, subtitles: next });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs border font-medium transition-all ${
                          isChecked
                            ? "bg-emerald-500/25 border-emerald-500 text-emerald-200 shadow-sm"
                            : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {isChecked ? "✓ " : ""}{sl.flag} {sl.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <input value={edit.movie_tpl || ""} onChange={(e) => setEdit({ ...edit, movie_tpl: e.target.value })} placeholder="Plantilla movie (…{id}…)" className={`${inp} font-mono`} />
              <input value={edit.tv_tpl || ""} onChange={(e) => setEdit({ ...edit, tv_tpl: e.target.value })} placeholder="Plantilla tv (…{id}…{s}…{e}…)" className={`${inp} font-mono`} />
              <input value={edit.entry_key || ""} onChange={(e) => setEdit({ ...edit, entry_key: e.target.value })} placeholder="key propia (opcional, ej. view_key)" className={`${inp} font-mono`} />
              {/* Opción Beta */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3">
                <div>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-amber-300">
                    <input
                      type="checkbox"
                      checked={!!edit.is_beta}
                      onChange={(e) => setEdit({ ...edit, is_beta: e.target.checked })}
                      className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <span>🧪 Servidor en fase Beta (Experimental)</span>
                  </label>
                  <p className="text-[11px] text-zinc-400 mt-1 ml-6">
                    Los servidores Beta <b>nunca saldrán por defecto</b> al reproducir ningún título. Solo se cargarán si el usuario hace clic en ellos en el reproductor.
                  </p>
                </div>
                {edit.is_beta && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide shrink-0">
                    🧪 BETA ACTIVO
                  </span>
                )}
              </div>

              <div className="flex gap-4 text-xs flex-wrap items-center">
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={!!edit.needs_tmdb} onChange={(e) => setEdit({ ...edit, needs_tmdb: e.target.checked })} /> needsTmdb</label>
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={!!edit.tv_ok} onChange={(e) => setEdit({ ...edit, tv_ok: e.target.checked })} /> tvOk (mando)</label>
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={edit.active !== false} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> activo</label>
                <div className="flex items-center gap-1">
                  <span>Orden:</span>
                  <input value={edit.ord ?? 0} onChange={(e) => setEdit({ ...edit, ord: Number(e.target.value) })} placeholder="orden" inputMode="numeric" className={`${inp} w-16 py-1`} />
                </div>
              </div>
              <p className="text-[11px] text-zinc-400">Placeholders: {"{id} {s} {e} {key} {idparam} {tmdbflag}"} · cada guardado incrementa la versión automáticamente.</p>
              <div className="flex gap-2">
                <button onClick={saveProv} className="px-4 py-2 rounded-xl bg-[#008CFF] font-bold text-sm text-white">Guardar</button>
                <button onClick={() => { setEdit(null); setMsg(""); }} className={btn}>Cancelar</button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "live" && (
        <>
          <button onClick={() => setEditLive({ _new: true, active: true, format: "tvf90", ord: live.length } as any)}
            className="mb-4 px-4 py-2 rounded-xl bg-[#008CFF] font-bold text-sm text-white">+ Nueva fuente Live</button>
          <div className="space-y-2">
            {live.map((l) => (
              <div key={l.id} className="p-3 rounded-xl border border-white/10 bg-white/5 flex items-center gap-2 flex-wrap">
                <b className="text-sm text-white">{l.name}</b>
                <code className="text-xs text-zinc-400">{l.id} · {l.format}</code>
                {!l.active && <span className="text-xs bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">inactivo</span>}
                <span className="ml-auto flex gap-2">
                  <button onClick={() => api("live", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: l.id, active: !l.active }) }).then(load)} className={btn}>
                    {l.active ? "Desactivar" : "Activar"}
                  </button>
                  <button onClick={() => setEditLive({ ...l })} className={btn}>Editar</button>
                  <button onClick={() => { if (confirm(`¿Borrar ${l.name}?`)) api(`live?id=${l.id}`, { method: "DELETE" }).then(load); }} className={`${btn} hover:!border-red-500 hover:text-red-400`}>Borrar</button>
                </span>
              </div>
            ))}
          </div>
          {editLive && (
            <div className="mt-4 p-4 rounded-2xl border border-[#008CFF]/40 bg-black/60 space-y-3">
              <div className="grid sm:grid-cols-2 gap-2">
                <input value={editLive.id || ""} disabled={!editLive._new} onChange={(e) => setEditLive({ ...editLive, id: e.target.value })} placeholder="id" className={inp} />
                <input value={editLive.name || ""} onChange={(e) => setEditLive({ ...editLive, name: e.target.value })} placeholder="Nombre" className={inp} />
                <input value={editLive.format || ""} onChange={(e) => setEditLive({ ...editLive, format: e.target.value })} placeholder="format: streambetter|tvf90" className={inp} />
                <input value={editLive.ord ?? 0} onChange={(e) => setEditLive({ ...editLive, ord: Number(e.target.value) })} placeholder="orden" inputMode="numeric" className={inp} />
              </div>
              <input value={editLive.list || ""} onChange={(e) => setEditLive({ ...editLive, list: e.target.value })} placeholder="URL del listado" className={`${inp} font-mono`} />
              <div className="flex gap-2">
                <button onClick={saveLive} className="px-4 py-2 rounded-xl bg-[#008CFF] font-bold text-sm text-white">Guardar</button>
                <button onClick={() => { setEditLive(null); setMsg(""); }} className={btn}>Cancelar</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
