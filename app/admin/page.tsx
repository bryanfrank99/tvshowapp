"use client";
import { useCallback, useEffect, useState } from "react";
import { getProviderLangMeta, PROVIDER_LANGS, SUBTITLE_LANGS, parseLangs, parseSubs } from "@/lib/providers";

// Panel admin moderno: KPIs de estado, dispositivos (máx 3), sesiones, servidores + live + multi-admin.
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
  created_by?: string;
  creator_username?: string;
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

type AdminUserItem = {
  id: string;
  username: string;
  name: string;
  role: "superadmin" | "admin";
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  stats: {
    totalCodes: number;
    activeCodes: number;
    expiredCodes: number;
    revokedCodes: number;
    totalDevices: number;
  };
};

type CurrentAdminProfile = {
  id: string;
  username: string;
  name: string;
  role: "superadmin" | "admin";
};

type Prov = {
  id: string;
  name: string;
  real_name?: string;
  simulated_name?: string;
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

type Live = {
  id: string;
  name: string;
  format: string;
  list: string;
  active: boolean;
  ord: number;
};

const api = (p: string, init?: RequestInit) =>
  fetch(`/api/admin/${p}`, { ...init, cache: "no-store" });

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
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminPage() {
  const [auth, setAuth] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<CurrentAdminProfile | null>(null);
  const [usernameInput, setUsernameInput] = useState("admin");
  const [passInput, setPassInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Tabs: codes | admins | prov | live
  const [tab, setTab] = useState<"codes" | "admins" | "prov" | "live">("codes");
  const [codes, setCodes] = useState<Code[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [adminsSummary, setAdminsSummary] = useState<Record<string, { total: number; active: number; expired: number }> | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUserItem[]>([]);
  const [filterAdmin, setFilterAdmin] = useState<string>("all");

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

  // Health check y monitoreo de servidores
  const [healthData, setHealthData] = useState<Record<string, { status: string; latencyMs: number; error?: string }> | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const runHealthCheck = async () => {
    setIsCheckingHealth(true);
    setMsg("Ejecutando diagnóstico de conectividad en servidores...");
    try {
      const r = await api("providers/health-check");
      if (!r.ok) {
        setMsg("Error ejecutando diagnóstico");
        return;
      }
      const j = await r.json();
      const map: Record<string, any> = {};
      for (const res of j.results || []) {
        map[res.id] = res;
      }
      setHealthData(map);
      setMsg(`Diagnóstico completado: ${j.summary?.healthy || 0} óptimos, ${j.summary?.down || 0} con incidencia.`);
    } catch {
      setMsg("Fallo al conectar con el endpoint de diagnóstico");
    } finally {
      setIsCheckingHealth(false);
    }
  };

  // Modales
  const [edit, setEdit] = useState<(Partial<Prov> & { _new?: boolean }) | null>(null);
  const [editLive, setEditLive] = useState<(Partial<Live> & { _new?: boolean }) | null>(null);

  // Modal Nuevo Admin
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [newAdminUser, setNewAdminUser] = useState({
    username: "",
    name: "",
    password: "",
    role: "admin" as "admin" | "superadmin",
  });
  const [createAdminError, setCreateAdminError] = useState("");

  // Modal Cambiar Contraseña
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [targetPasswordUser, setTargetPasswordUser] = useState<{ id: string; username: string; name: string } | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState("");
  const [passwordModalMsg, setPasswordModalMsg] = useState("");

  const isSuperAdmin = currentAdmin?.role === "superadmin";

  const load = useCallback(async () => {
    try {
      // 1. Verificar sesión activa
      const meRes = await api("").catch(() => null);
      if (!meRes || !meRes.ok) {
        setAuth(false);
        setCurrentAdmin(null);
        return;
      }
      const meData = await meRes.json();
      if (!meData.authenticated || !meData.user) {
        setAuth(false);
        setCurrentAdmin(null);
        return;
      }

      setAuth(true);
      setCurrentAdmin(meData.user);

      // 2. Cargar datos según rol
      const isSuper = meData.user.role === "superadmin";

      const promises: Promise<any>[] = [
        api("codes").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ];

      if (isSuper) {
        promises.push(api("users").then((r) => (r.ok ? r.json() : null)).catch(() => null));
        promises.push(api("providers").then((r) => (r.ok ? r.json() : null)).catch(() => null));
        promises.push(api("live").then((r) => (r.ok ? r.json() : null)).catch(() => null));
      }

      const [c, u, p, l] = await Promise.all(promises);

      if (c) {
        setCodes(c.codes || []);
        if (c.kpis) setKpis(c.kpis);
        if (c.adminsSummary) setAdminsSummary(c.adminsSummary);
      }

      if (isSuper) {
        if (u?.users) setAdminUsers(u.users);
        if (p) {
          setProvs(p.providers || []);
          setVersion(p.version || "");
        }
        if (l?.live) setLive(l.live);
      }
    } catch {
      setAuth(false);
    }
  }, []);

  const [health, setHealth] = useState<string>("");
  useEffect(() => {
    fetch("/api/admin/health", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!j.supabase) {
          setHealth("Supabase no configurado: revisa SUPABASE_URL/SERVICE_KEY.");
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const r = await api("", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameInput, password: passInput }),
      });
      const j = await r.json();

      if (r.ok && j.ok) {
        setPassInput("");
        setLoginError("");
        await load();
      } else {
        setLoginError(j.message || "Usuario o contraseña incorrectos");
      }
    } catch {
      setLoginError("Error de conexión al iniciar sesión");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "DELETE" }).catch(() => {});
    setAuth(false);
    setCurrentAdmin(null);
    setCodes([]);
    setAdminUsers([]);
    setTab("codes");
  };

  const createCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api("codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, days: Number(days) || 30 }),
    });
    const j = await r.json();
    if (r.ok) {
      setNewCode(j);
      setLabel("");
      setCopiedLink(false);
      setCopiedCode(false);
      load();
    } else {
      setMsg(j.message || "Error generando código");
    }
  };

  const resetSessions = async (codeId: string, codeLabel: string) => {
    if (
      !confirm(
        `¿Desvincular todos los dispositivos de "${codeLabel || "este código"}"?\nSe liberarán los 3 cupos para permitir conectar nuevos dispositivos.`
      )
    )
      return;
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

  // Administradores: Crear
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateAdminError("");
    const r = await api("users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAdminUser),
    });
    const j = await r.json();
    if (r.ok && j.ok) {
      setShowCreateAdminModal(false);
      setNewAdminUser({ username: "", name: "", password: "", role: "admin" });
      setMsg(`Administrador @${j.user.username} creado exitosamente.`);
      load();
    } else {
      setCreateAdminError(j.message || "Error al crear administrador");
    }
  };

  // Administradores: Cambiar Contraseña
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPasswordUser?.id || !newPasswordVal) return;
    setPasswordModalMsg("");

    const r = await api("users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: targetPasswordUser.id, password: newPasswordVal }),
    });
    const j = await r.json();
    if (r.ok && j.ok) {
      setShowPasswordModal(false);
      setNewPasswordVal("");
      setMsg(`Contraseña de @${targetPasswordUser.username} actualizada correctamente.`);
      load();
    } else {
      setPasswordModalMsg(j.message || "Error al actualizar contraseña");
    }
  };

  // Administradores: Cambiar Estado Activo/Suspendido
  const toggleAdminActive = async (userItem: AdminUserItem) => {
    const nextState = !userItem.is_active;
    const actionText = nextState ? "reactivar" : "suspender";
    if (
      !confirm(
        `¿Deseas ${actionText} la cuenta de @${userItem.username}?\n${
          !nextState ? "Se revocarán todas sus sesiones activas inmediatamente." : ""
        }`
      )
    )
      return;

    const r = await api("users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userItem.id, is_active: nextState }),
    });
    if (r.ok) {
      setMsg(`Cuenta de @${userItem.username} ${nextState ? "reactivada" : "suspendida"}.`);
      load();
    } else {
      const j = await r.json().catch(() => ({}));
      setMsg(j.message || "Error al modificar estado del administrador");
    }
  };

  // Administradores: Eliminar
  const deleteAdmin = async (userItem: AdminUserItem) => {
    if (
      !confirm(
        `¿Estás seguro de eliminar al administrador @${userItem.username}?\nEsta acción no se puede deshacer. Sus claves registradas serán reasignadas a tu cuenta principal.`
      )
    )
      return;

    const r = await api(`users?id=${userItem.id}`, { method: "DELETE" });
    if (r.ok) {
      setMsg(`Administrador @${userItem.username} eliminado.`);
      load();
    } else {
      const j = await r.json().catch(() => ({}));
      setMsg(j.message || "Error al eliminar administrador");
    }
  };

  const saveProv = async () => {
    if (!edit?.id || !edit?.name || !edit?.movie_tpl || !edit?.tv_tpl) {
      setMsg("Completa id, nombre y plantillas");
      return;
    }
    const r = await api("providers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edit),
    });
    if (r.ok) {
      setEdit(null);
      setMsg("");
      load();
    } else setMsg("Error guardando servidor");
  };

  const saveLive = async () => {
    if (!editLive?.id || !editLive?.name || !editLive?.format || !editLive?.list) {
      setMsg("Completa todos los campos");
      return;
    }
    const r = await api("live", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editLive),
    });
    if (r.ok) {
      setEditLive(null);
      setMsg("");
      load();
    } else setMsg("Error guardando fuente Live");
  };

  const inp =
    "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#008CFF] transition-all text-white placeholder-zinc-500";
  const btn =
    "px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs hover:border-[#008CFF] transition-colors";

  // Filtrado de códigos por búsqueda, estado y administrador creador
  const filteredCodes = codes.filter((c) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (c.label && c.label.toLowerCase().includes(q)) ||
      (c.ref_code && c.ref_code.toLowerCase().includes(q)) ||
      (c.creator_username && c.creator_username.toLowerCase().includes(q));
    if (!matchesSearch) return false;

    // Filtro por administrador (Super Admin)
    if (isSuperAdmin && filterAdmin !== "all") {
      const creator = (c.creator_username || "admin").toLowerCase();
      if (creator !== filterAdmin.toLowerCase()) return false;
    }

    const exp = new Date(c.expires_at).getTime() <= Date.now();
    const daysLeft = Math.ceil((new Date(c.expires_at).getTime() - Date.now()) / 86400000);

    if (filterStatus === "active") return !c.revoked && !exp;
    if (filterStatus === "expiring") return !c.revoked && !exp && daysLeft <= 7;
    if (filterStatus === "full") return (c.deviceCount || 0) >= (c.maxDevices || 3);
    if (filterStatus === "expired") return c.revoked || exp;
    return true;
  });

  // Pantalla de Inicio de Sesión
  if (!auth) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <div className="bg-[#0e0f17] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#008CFF]/15 border border-[#008CFF]/30 flex items-center justify-center text-[#008CFF] font-black text-xl">
              TV
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Panel de Administración</h1>
              <p className="text-xs text-zinc-400">Servidor y gestión de accesos</p>
            </div>
          </div>

          {health && <p className="text-xs text-amber-400 mb-4 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">{health}</p>}

          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {loginError}
            </div>
          )}

          <form onSubmit={login} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Usuario</label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="admin"
                required
                className={inp}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
                placeholder="••••••••"
                required
                className={inp}
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 rounded-xl bg-[#008CFF] hover:bg-[#0077db] text-white font-bold text-sm transition-all shadow-lg shadow-[#008CFF]/20 mt-2"
            >
              {isLoggingIn ? "Verificando credenciales..." : "Iniciar Sesión"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header & Identificación del Administrador */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#008CFF]/20 border border-[#008CFF]/40 flex items-center justify-center text-[#008CFF] font-black">
            TV
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">Admin Console</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-zinc-400">
                Conectado como: <strong className="text-zinc-200">@{currentAdmin?.username}</strong>
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                  isSuperAdmin
                    ? "bg-[#008CFF]/20 text-[#008CFF] border-[#008CFF]/30"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                }`}
              >
                {isSuperAdmin ? "Super Admin" : "Gestor de Claves"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (currentAdmin) {
                setTargetPasswordUser({
                  id: currentAdmin.id,
                  username: currentAdmin.username,
                  name: currentAdmin.name,
                });
                setNewPasswordVal("");
                setPasswordModalMsg("");
                setShowPasswordModal(true);
              }
            }}
            className="px-3 py-1.5 rounded-xl text-xs bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 transition-colors"
          >
            🔑 Mi Contraseña
          </button>
          <button
            onClick={logout}
            className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-red-400 border border-white/10 hover:border-red-400/40 transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => {
            setTab("codes");
            setMsg("");
          }}
          className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${
            tab === "codes"
              ? "bg-[#008CFF] border-[#008CFF] text-white"
              : "border-white/15 text-zinc-400 hover:border-white/30"
          }`}
        >
          {isSuperAdmin ? `Claves de Acceso (${codes.length})` : `Mis Claves (${codes.length})`}
        </button>

        {isSuperAdmin && (
          <>
            <button
              onClick={() => {
                setTab("admins");
                setMsg("");
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                tab === "admins"
                  ? "bg-[#008CFF] border-[#008CFF] text-white"
                  : "border-white/15 text-zinc-400 hover:border-white/30"
              }`}
            >
              <span>Administradores</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                {adminUsers.length}
              </span>
            </button>

            <button
              onClick={() => {
                setTab("prov");
                setMsg("");
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                tab === "prov"
                  ? "bg-[#008CFF] border-[#008CFF] text-white"
                  : "border-white/15 text-zinc-400 hover:border-white/30"
              }`}
            >
              Servidores (v{version || "?"})
            </button>

            <button
              onClick={() => {
                setTab("live");
                setMsg("");
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                tab === "live"
                  ? "bg-[#008CFF] border-[#008CFF] text-white"
                  : "border-white/15 text-zinc-400 hover:border-white/30"
              }`}
            >
              Live TV ({live.length})
            </button>
          </>
        )}
      </div>

      {msg && (
        <div className="p-3 mb-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300 flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg("")} className="text-zinc-400 hover:text-white ml-2 text-sm">
            ✕
          </button>
        </div>
      )}

      {/* PESTAÑA 1: CLAVES DE ACCESO */}
      {tab === "codes" && (
        <>
          {/* Status KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <span className="text-xs text-zinc-400 font-medium">Claves Activas</span>
              <div className="text-2xl font-black text-white mt-1">
                {kpis?.activeCodes ?? 0}{" "}
                <span className="text-xs font-normal text-zinc-500">/ {kpis?.totalCodes ?? 0}</span>
              </div>
              <span className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                Operando normalmente
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <span className="text-xs text-zinc-400 font-medium">Dispositivos Conectados</span>
              <div className="text-2xl font-black text-[#008CFF] mt-1">
                {kpis?.totalDevices ?? 0}
              </div>
              <span className="text-[11px] text-zinc-400 mt-1 block">Límite: 3 por código</span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <span className="text-xs text-zinc-400 font-medium">Por Vencer (≤ 7 días)</span>
              <div
                className={`text-2xl font-black mt-1 ${
                  (kpis?.expiringSoon ?? 0) > 0 ? "text-amber-400" : "text-zinc-200"
                }`}
              >
                {kpis?.expiringSoon ?? 0}
              </div>
              <span className="text-[11px] text-zinc-400 mt-1 block">Requieren renovación</span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <span className="text-xs text-zinc-400 font-medium">Capacidad Llena (3/3)</span>
              <div
                className={`text-2xl font-black mt-1 ${
                  (kpis?.fullCapacityCodes ?? 0) > 0 ? "text-orange-400" : "text-zinc-200"
                }`}
              >
                {kpis?.fullCapacityCodes ?? 0}
              </div>
              <span className="text-[11px] text-zinc-400 mt-1 block">Cupo completo</span>
            </div>
          </div>

          {/* Formulario Crear Código */}
          <form
            onSubmit={createCode}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-5 flex gap-2.5 flex-wrap items-center"
          >
            <div className="flex-1 min-w-[200px]">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Etiqueta / Cliente (ej. Familia Pérez, Habitación 2)"
                className={inp}
              />
            </div>
            <div className="w-24">
              <input
                value={days}
                onChange={(e) => setDays(e.target.value)}
                placeholder="Días"
                inputMode="numeric"
                className={inp}
              />
            </div>
            <button className="px-5 py-2.5 rounded-xl bg-[#008CFF] hover:bg-[#0070cc] text-white font-bold text-sm transition-colors shadow-lg shadow-[#008CFF]/20">
              + Generar Clave
            </button>
          </form>

          {/* Notificación de nuevo código generado con Copiado Rápido */}
          {newCode && (
            <div className="mb-5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold text-sm text-emerald-400">
                  ¡Nueva clave generada con éxito!
                </span>
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                  Máx. 3 dispositivos
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                Por motivos de seguridad el código solo se muestra en este momento. Cópialo o comparte
                el enlace directo:
              </p>
              <div className="flex items-center gap-3 flex-wrap pt-1">
                <div className="bg-black/40 border border-emerald-500/30 rounded-xl px-3 py-1.5 font-mono text-lg font-black tracking-widest text-white">
                  {newCode.code || newCode}
                </div>
                {newCode.ref_code && (
                  <span className="text-xs text-zinc-400 font-mono">Ref: {newCode.ref_code}</span>
                )}
                <button
                  type="button"
                  onClick={() => copyOnlyCode(newCode.code || newCode)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white"
                >
                  {copiedCode ? "✓ Código Copiado" : "Copiar Código"}
                </button>
                <button
                  type="button"
                  onClick={() => copyDirectLink(newCode.code || newCode)}
                  className="px-3 py-1.5 rounded-lg bg-[#008CFF] hover:bg-[#0070cc] text-xs font-semibold text-white"
                >
                  {copiedLink ? "✓ Enlace Copiado" : "🔗 Copiar Enlace Rápido"}
                </button>
              </div>
            </div>
          )}

          {/* Filtros por Administrador (Solo Super Admin) + Búsqueda */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4 items-stretch sm:items-center justify-between flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                  filterStatus === "all"
                    ? "bg-white/15 border-white/30 text-white"
                    : "border-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                Todos ({codes.length})
              </button>
              <button
                onClick={() => setFilterStatus("active")}
                className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                  filterStatus === "active"
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                    : "border-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                Activos ({kpis?.activeCodes ?? 0})
              </button>
              <button
                onClick={() => setFilterStatus("expiring")}
                className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                  filterStatus === "expiring"
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "border-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                Por Vencer ({kpis?.expiringSoon ?? 0})
              </button>
              <button
                onClick={() => setFilterStatus("full")}
                className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                  filterStatus === "full"
                    ? "bg-orange-500/20 border-orange-500/40 text-orange-300"
                    : "border-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                Llenos 3/3 ({kpis?.fullCapacityCodes ?? 0})
              </button>
              <button
                onClick={() => setFilterStatus("expired")}
                className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                  filterStatus === "expired"
                    ? "bg-red-500/20 border-red-500/40 text-red-300"
                    : "border-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                Caducados ({(kpis?.expiredCodes ?? 0) + (kpis?.revokedCodes ?? 0)})
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Filtro por Creador (Super Admin) */}
              {isSuperAdmin && adminsSummary && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <span>Admin:</span>
                  <select
                    value={filterAdmin}
                    onChange={(e) => setFilterAdmin(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#008CFF]"
                  >
                    <option value="all" className="bg-[#0e0f17]">
                      Todos los admins ({codes.length})
                    </option>
                    {Object.entries(adminsSummary).map(([adm, stat]) => (
                      <option key={adm} value={adm} className="bg-[#0e0f17]">
                        @{adm} ({stat.total})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex-1 sm:w-64">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar etiqueta, ref o admin..."
                  className={inp}
                />
              </div>
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
                <div
                  key={c.id}
                  className={`rounded-2xl border transition-all ${
                    c.revoked
                      ? "border-amber-500/30 bg-amber-500/5"
                      : exp
                      ? "border-red-500/30 bg-red-500/5"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  } p-4`}
                >
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    {/* Info del Código */}
                    <div className="flex flex-col gap-1 min-w-[240px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-white">
                          {c.label || "(Sin etiqueta)"}
                        </span>
                        {isSuperAdmin && c.creator_username && (
                          <span className="text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-mono">
                            @{c.creator_username}
                          </span>
                        )}
                        {c.revoked && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                            Revocado
                          </span>
                        )}
                        {exp && !c.revoked && (
                          <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded-full">
                            Caducado
                          </span>
                        )}
                        {!exp && !c.revoked && daysLeft <= 7 && (
                          <span className="text-[10px] bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-2 py-0.5 rounded-full">
                            Vence en {daysLeft}d
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-400">
                        <span className="font-mono bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-zinc-300">
                          {c.ref_code}
                        </span>
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
                          Última conexión:{" "}
                          <b className="text-zinc-300 font-medium">{formatRelativeTime(c.lastSeen)}</b>
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
                          const r = await api("codes", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: c.id, renew: true, days: 30 }),
                          });
                          const j = await r.json();
                          if (r.ok) {
                            setNewCode({ code: j.code, ref_code: j.ref_code });
                            setMsg(`Renovado: Nuevo código ${j.code} (30 días)`);
                            load();
                          } else setMsg(j.message || "Error renovando código");
                        }}
                        className={`${btn} bg-[#008CFF]/20 border-[#008CFF]/30 text-[#008CFF] hover:bg-[#008CFF]/30 font-medium`}
                      >
                        Renovar 30d
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          const r = await api("codes", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: c.id, extendDays: 30 }),
                          });
                          if (r.ok) {
                            setMsg("Extendido por 30 días adicionales");
                            load();
                          } else setMsg("Error extendiendo plazo");
                        }}
                        className={btn}
                      >
                        +30d
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          api("codes", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: c.id, revoked: !c.revoked }),
                          }).then(load)
                        }
                        className={btn}
                      >
                        {c.revoked ? "Reactivar" : "Revocar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (
                            confirm(
                              `¿Eliminar código "${c.label || c.ref_code}"?\nEsto cancelará también todas sus sesiones activas.`
                            )
                          ) {
                            api(`codes?id=${c.id}`, { method: "DELETE" }).then(load);
                          }
                        }}
                        className={`${btn} hover:!border-red-500 hover:text-red-400`}
                      >
                        Borrar
                      </button>
                    </div>
                  </div>

                  {/* Panel Desplegable de Dispositivos Conectados */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <h4 className="text-xs font-semibold text-zinc-300 mb-2">
                        Dispositivos vinculados ({deviceCount}/{maxDevices}):
                      </h4>
                      {deviceCount === 0 ? (
                        <p className="text-xs text-zinc-500 italic">
                          Aún no se ha conectado ningún dispositivo con este código.
                        </p>
                      ) : (
                        <div className="grid sm:grid-cols-3 gap-2">
                          {c.devices?.map((dev, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs flex flex-col justify-between"
                            >
                              <div className="font-semibold text-zinc-200 truncate flex items-center gap-1.5">
                                <span className="text-[#008CFF]">●</span>
                                <span>{dev.hint}</span>
                              </div>
                              <div className="text-[11px] text-zinc-400 mt-1">
                                Visto: {formatRelativeTime(dev.lastSeen)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* PESTAÑA 2: ADMINISTRADORES (Solo Super Admin) */}
      {tab === "admins" && isSuperAdmin && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-white">Gestión de Administradores</h2>
              <p className="text-xs text-zinc-400">
                Concede o suspende accesos al servidor y supervisa las claves de cada administrador.
              </p>
            </div>
            <button
              onClick={() => {
                setCreateAdminError("");
                setShowCreateAdminModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#008CFF] hover:bg-[#0077db] text-white font-bold text-xs shadow-lg shadow-[#008CFF]/20 transition-all"
            >
              + Nuevo Administrador
            </button>
          </div>

          {/* Tabla de Administradores */}
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-white/5 border-b border-white/10 text-[11px] uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Administrador</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3 text-center">Claves Activas</th>
                  <th className="px-4 py-3 text-center">Total Claves</th>
                  <th className="px-4 py-3 text-center">Dispositivos</th>
                  <th className="px-4 py-3">Último Acceso</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {adminUsers.map((u) => {
                  const isSelf = u.id === currentAdmin?.id;
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {isSelf && (
                            <span className="text-[10px] bg-white/10 text-zinc-300 px-1.5 py-0.2 rounded">
                              Tú
                            </span>
                          )}
                        </div>
                        <div className="text-zinc-500 font-mono text-[11px]">@{u.username}</div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            u.role === "superadmin"
                              ? "bg-[#008CFF]/20 text-[#008CFF] border-[#008CFF]/40"
                              : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          }`}
                        >
                          {u.role === "superadmin" ? "Super Admin" : "Gestor"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center font-bold text-emerald-400">
                        {u.stats.activeCodes}
                      </td>

                      <td className="px-4 py-3 text-center font-bold text-white">
                        {u.stats.totalCodes}
                      </td>

                      <td className="px-4 py-3 text-center text-zinc-400">
                        {u.stats.totalDevices}
                      </td>

                      <td className="px-4 py-3 text-zinc-400">
                        {formatRelativeTime(u.last_login_at)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() => toggleAdminActive(u)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                            u.is_active
                              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25"
                              : "bg-red-500/15 border-red-500/30 text-red-300 hover:bg-red-500/25"
                          } ${isSelf ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          {u.is_active ? "● Activo" : "○ Suspendido"}
                        </button>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setTargetPasswordUser({
                                id: u.id,
                                username: u.username,
                                name: u.name,
                              });
                              setNewPasswordVal("");
                              setPasswordModalMsg("");
                              setShowPasswordModal(true);
                            }}
                            className={btn}
                            title="Cambiar contraseña"
                          >
                            🔑 Clave
                          </button>

                          {!isSelf && u.username !== "admin" && (
                            <button
                              type="button"
                              onClick={() => deleteAdmin(u)}
                              className={`${btn} hover:!border-red-500 hover:text-red-400`}
                              title="Eliminar administrador"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: SERVIDORES / PROVEEDORES (Solo Super Admin) */}
      {tab === "prov" && isSuperAdmin && (
        <>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button
              onClick={() =>
                setEdit({
                  _new: true,
                  name: "",
                  movie_tpl: "",
                  tv_tpl: "",
                  lang: "multi",
                  languages: ["multi"],
                  subtitles: [],
                  needs_tmdb: true,
                  tv_ok: true,
                  active: true,
                  ord: provs.length + 1,
                  is_beta: false,
                } as any)
              }
              className="px-4 py-2 rounded-xl bg-[#008CFF] font-bold text-sm text-white shadow-lg shadow-[#008CFF]/20"
            >
              + Nuevo Servidor
            </button>
            <button
              onClick={runHealthCheck}
              disabled={isCheckingHealth}
              className={`${btn} bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 font-semibold flex items-center gap-1.5`}
            >
              <span>{isCheckingHealth ? "⏳" : "⚡"}</span>
              <span>{isCheckingHealth ? "Diagnosticando servidores..." : "Diagnosticar Servidores"}</span>
            </button>
          </div>
          <div className="space-y-2">
            {provs.map((p) => {
              const langs = p.languages || (p.lang ? [p.lang] : ["multi"]);
              const subs = p.subtitles || [];
              const h = healthData?.[p.id];
              return (
                <div
                  key={p.id}
                  className="p-3 rounded-xl border border-white/10 bg-white/5 flex items-center gap-3 flex-wrap"
                >
                  <span className="text-xs text-zinc-500 w-6">#{p.ord}</span>
                  <b className="text-sm text-white">
                    {p.real_name || p.name}{" "}
                    <span className="text-xs text-[#008CFF] font-mono font-normal">
                      ({p.simulated_name || "S-"})
                    </span>
                  </b>
                  {h && (
                    h.status === "healthy" ? (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>{h.latencyMs}ms</span>
                      </span>
                    ) : h.status === "slow" ? (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span>Lento ({h.latencyMs}ms)</span>
                      </span>
                    ) : h.status === "degraded" ? (
                      <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                        <span>WAF ({h.latencyMs}ms)</span>
                      </span>
                    ) : (
                      <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1" title={h.error}>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        <span>Caído</span>
                      </span>
                    )
                  )}
                  {p.is_beta && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-bold">
                      🧪 BETA
                    </span>
                  )}
                  <div className="flex items-center gap-1 flex-wrap">
                    {langs.map((l) => {
                      const m = getProviderLangMeta(l);
                      return (
                        <span
                          key={l}
                          className="text-[11px] px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 flex items-center gap-1"
                        >
                          <span>{m.flag}</span>
                          <span>{m.name}</span>
                        </span>
                      );
                    })}
                  </div>
                  {!p.active && (
                    <span className="text-xs bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">
                      inactivo
                    </span>
                  )}
                  <span className="ml-auto flex gap-2">
                    <button
                      onClick={() =>
                        api("providers", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: p.id, active: !p.active }),
                        }).then(load)
                      }
                      className={btn}
                    >
                      {p.active ? "Desactivar" : "Activar"}
                    </button>
                    <button onClick={() => setEdit({ ...p })} className={btn}>
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`¿Borrar ${p.name}?`))
                          api(`providers?id=${p.id}`, { method: "DELETE" }).then(load);
                      }}
                      className={`${btn} hover:!border-red-500 hover:text-red-400`}
                    >
                      Borrar
                    </button>
                  </span>
                </div>
              );
            })}
          </div>

          {edit && (
            <div className="mt-4 p-5 rounded-2xl border border-[#008CFF]/40 bg-black/70 space-y-4 shadow-2xl">
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  value={edit.id || ""}
                  disabled={!edit._new}
                  onChange={(e) => setEdit({ ...edit, id: e.target.value })}
                  placeholder="ID único (ej. megaembed)"
                  className={inp}
                />
                <input
                  value={edit.name || ""}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  placeholder="Nombre público"
                  className={inp}
                />
              </div>

              {/* Idiomas */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Idiomas de Audio Disponibles:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PROVIDER_LANGS.map((pl) => {
                    const currentLangs = edit.languages || (edit.lang ? [edit.lang] : ["multi"]);
                    const isChecked = currentLangs.includes(pl.id);
                    return (
                      <button
                        key={pl.id}
                        type="button"
                        onClick={() => {
                          let next: string[];
                          if (isChecked) {
                            next = currentLangs.filter((x) => x !== pl.id);
                            if (next.length === 0) next = ["multi"];
                          } else {
                            next = [...currentLangs.filter((x) => x !== "multi"), pl.id];
                          }
                          setEdit({ ...edit, languages: next, lang: next.join(",") });
                        }}
                        className={`p-2 rounded-xl text-xs font-medium border text-left flex items-center gap-2 transition-all ${
                          isChecked
                            ? "bg-[#008CFF]/25 border-[#008CFF] text-white shadow-sm"
                            : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {isChecked ? "✓ " : ""}
                        {pl.flag} {pl.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subtítulos */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Subtítulos Integrados (opcional):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SUBTITLE_LANGS.map((sl) => {
                    const currentSubs = edit.subtitles || [];
                    const isChecked = currentSubs.includes(sl.id);
                    return (
                      <button
                        key={sl.id}
                        type="button"
                        onClick={() => {
                          const next = isChecked
                            ? currentSubs.filter((x) => x !== sl.id)
                            : [...currentSubs, sl.id];
                          setEdit({ ...edit, subtitles: next });
                        }}
                        className={`p-2 rounded-xl text-xs font-medium border text-left flex items-center gap-2 transition-all ${
                          isChecked
                            ? "bg-emerald-500/25 border-emerald-500 text-emerald-200 shadow-sm"
                            : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {isChecked ? "✓ " : ""}
                        {sl.flag} {sl.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <input
                value={edit.movie_tpl || ""}
                onChange={(e) => setEdit({ ...edit, movie_tpl: e.target.value })}
                placeholder="Plantilla movie (…{id}…)"
                className={`${inp} font-mono`}
              />
              <input
                value={edit.tv_tpl || ""}
                onChange={(e) => setEdit({ ...edit, tv_tpl: e.target.value })}
                placeholder="Plantilla tv (…{id}…{s}…{e}…)"
                className={`${inp} font-mono`}
              />
              <input
                value={edit.entry_key || ""}
                onChange={(e) => setEdit({ ...edit, entry_key: e.target.value })}
                placeholder="key propia (opcional)"
                className={`${inp} font-mono`}
              />

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
                    Los servidores Beta nunca saldrán por defecto al reproducir. Solo se cargarán si el
                    usuario hace clic en ellos.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 text-xs flex-wrap items-center">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!edit.needs_tmdb}
                    onChange={(e) => setEdit({ ...edit, needs_tmdb: e.target.checked })}
                  />{" "}
                  needsTmdb
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!edit.tv_ok}
                    onChange={(e) => setEdit({ ...edit, tv_ok: e.target.checked })}
                  />{" "}
                  tvOk (mando)
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={edit.active !== false}
                    onChange={(e) => setEdit({ ...edit, active: e.target.checked })}
                  />{" "}
                  activo
                </label>
                <div className="flex items-center gap-1">
                  <span>Orden:</span>
                  <input
                    value={edit.ord ?? 0}
                    onChange={(e) => setEdit({ ...edit, ord: Number(e.target.value) })}
                    placeholder="orden"
                    inputMode="numeric"
                    className={`${inp} w-16 py-1`}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={saveProv}
                  className="px-5 py-2.5 rounded-xl bg-[#008CFF] font-bold text-sm text-white shadow-lg shadow-[#008CFF]/20"
                >
                  Guardar Servidor
                </button>
                <button
                  onClick={() => {
                    setEdit(null);
                    setMsg("");
                  }}
                  className={btn}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* PESTAÑA 4: LIVE TV (Solo Super Admin) */}
      {tab === "live" && isSuperAdmin && (
        <>
          <button
            onClick={() =>
              setEditLive({ _new: true, active: true, format: "tvf90", ord: live.length } as any)
            }
            className="mb-4 px-4 py-2 rounded-xl bg-[#008CFF] font-bold text-sm text-white shadow-lg shadow-[#008CFF]/20"
          >
            + Nueva fuente Live
          </button>
          <div className="space-y-2">
            {live.map((l) => (
              <div
                key={l.id}
                className="p-3 rounded-xl border border-white/10 bg-white/5 flex items-center gap-2 flex-wrap"
              >
                <b className="text-sm text-white">{l.name}</b>
                <code className="text-xs text-zinc-400">
                  {l.id} · {l.format}
                </code>
                {!l.active && (
                  <span className="text-xs bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">
                    inactivo
                  </span>
                )}
                <span className="ml-auto flex gap-2">
                  <button
                    onClick={() =>
                      api("live", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: l.id, active: !l.active }),
                      }).then(load)
                    }
                    className={btn}
                  >
                    {l.active ? "Desactivar" : "Activar"}
                  </button>
                  <button onClick={() => setEditLive({ ...l })} className={btn}>
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`¿Borrar ${l.name}?`))
                        api(`live?id=${l.id}`, { method: "DELETE" }).then(load);
                    }}
                    className={`${btn} hover:!border-red-500 hover:text-red-400`}
                  >
                    Borrar
                  </button>
                </span>
              </div>
            ))}
          </div>

          {editLive && (
            <div className="mt-4 p-5 rounded-2xl border border-[#008CFF]/40 bg-black/70 space-y-3 shadow-2xl">
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  value={editLive.id || ""}
                  disabled={!editLive._new}
                  onChange={(e) => setEditLive({ ...editLive, id: e.target.value })}
                  placeholder="id"
                  className={inp}
                />
                <input
                  value={editLive.name || ""}
                  onChange={(e) => setEditLive({ ...editLive, name: e.target.value })}
                  placeholder="Nombre"
                  className={inp}
                />
                <input
                  value={editLive.format || ""}
                  onChange={(e) => setEditLive({ ...editLive, format: e.target.value })}
                  placeholder="format: streambetter|tvf90"
                  className={inp}
                />
                <input
                  value={editLive.ord ?? 0}
                  onChange={(e) => setEditLive({ ...editLive, ord: Number(e.target.value) })}
                  placeholder="orden"
                  inputMode="numeric"
                  className={inp}
                />
              </div>
              <input
                value={editLive.list || ""}
                onChange={(e) => setEditLive({ ...editLive, list: e.target.value })}
                placeholder="URL del listado"
                className={`${inp} font-mono`}
              />
              <div className="flex gap-2 pt-2">
                <button
                  onClick={saveLive}
                  className="px-5 py-2.5 rounded-xl bg-[#008CFF] font-bold text-sm text-white shadow-lg shadow-[#008CFF]/20"
                >
                  Guardar
                </button>
                <button
                  onClick={() => {
                    setEditLive(null);
                    setMsg("");
                  }}
                  className={btn}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL: NUEVO ADMINISTRADOR */}
      {showCreateAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0f17] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Nuevo Administrador</h3>
              <button
                onClick={() => setShowCreateAdminModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {createAdminError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                {createAdminError}
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Nombre o Alias (Identificador)
                </label>
                <input
                  type="text"
                  value={newAdminUser.name}
                  onChange={(e) => setNewAdminUser({ ...newAdminUser, name: e.target.value })}
                  placeholder="ej. Carlos - Ventas Norte"
                  required
                  className={inp}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Nombre de Usuario (Login)
                </label>
                <input
                  type="text"
                  value={newAdminUser.username}
                  onChange={(e) =>
                    setNewAdminUser({
                      ...newAdminUser,
                      username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                    })
                  }
                  placeholder="ej. carlos"
                  required
                  className={inp}
                />
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Solo minúsculas, números, guiones y guiones bajos.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Contraseña Inicial
                </label>
                <input
                  type="password"
                  value={newAdminUser.password}
                  onChange={(e) => setNewAdminUser({ ...newAdminUser, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className={inp}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Rol y Permisos
                </label>
                <select
                  value={newAdminUser.role}
                  onChange={(e) =>
                    setNewAdminUser({ ...newAdminUser, role: e.target.value as any })
                  }
                  className={inp}
                >
                  <option value="admin" className="bg-[#0e0f17]">
                    Gestor de Claves (Solo administra sus propias claves)
                  </option>
                  <option value="superadmin" className="bg-[#0e0f17]">
                    Super Administrador (Control total del servidor)
                  </option>
                </select>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#008CFF] hover:bg-[#0077db] text-white font-bold text-sm transition-all shadow-lg shadow-[#008CFF]/20"
                >
                  Crear Administrador
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateAdminModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CAMBIAR CONTRASEÑA */}
      {showPasswordModal && targetPasswordUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0f17] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                Cambiar Contraseña: @{targetPasswordUser.username}
              </h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {passwordModalMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                {passwordModalMsg}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className={inp}
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Al cambiar la contraseña, las sesiones activas de este administrador se cerrarán
                  automáticamente.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#008CFF] hover:bg-[#0077db] text-white font-bold text-sm transition-all shadow-lg shadow-[#008CFF]/20"
                >
                  Actualizar Contraseña
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
