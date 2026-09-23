"use client";
import { useCallback, useEffect, useState } from "react";
import { getProviderLangMeta, PROVIDER_LANGS, SUBTITLE_LANGS } from "@/lib/providers";
import { useLang } from "@/hooks/useLang";
import { getAdminDict, type AdminDict } from "@/lib/admin-dict";
import LangMenu from "@/components/LangMenu";

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

function formatRelativeTime(dateStr?: string | null, d?: AdminDict, lang: string = "es") {
  if (!dateStr) return d?.time_no_connections || "Sin conexiones";
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return d?.time_just_now || "Hace un momento";
  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    return d?.time_mins_ago ? d.time_mins_ago(mins) : `Hace ${mins} min`;
  }
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return d?.time_hours_ago ? d.time_hours_ago(hours) : `Hace ${hours} h`;
  }
  const diffDays = Math.floor(diffSec / 86400);
  if (diffDays === 1) return d?.time_yesterday || "Ayer";
  if (diffDays < 7) {
    return d?.time_days_ago ? d.time_days_ago(diffDays) : `Hace ${diffDays} días`;
  }
  const locale = lang === "en" ? "en-US" : lang === "pt" ? "pt-BR" : "es-ES";
  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isLifetime(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).getFullYear() >= 2099;
}

export default function AdminPage() {
  const { lang } = useLang();
  const d = getAdminDict(lang);
  const locale = lang === "en" ? "en-US" : lang === "pt" ? "pt-BR" : "es-ES";

  const [auth, setAuth] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<CurrentAdminProfile | null>(null);
  const [usernameInput, setUsernameInput] = useState("admin");
  const [passInput, setPassInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Tabs: codes | admins | prov | live | billing
  const [tab, setTab] = useState<"codes" | "admins" | "prov" | "live" | "billing">("codes");
  const [codes, setCodes] = useState<Code[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [adminsSummary, setAdminsSummary] = useState<Record<string, { total: number; active: number; expired: number }> | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUserItem[]>([]);
  const [filterAdmin, setFilterAdmin] = useState<string>("all");

  // Facturación y finanzas (Spec 025 - Modelo por Paquetes de 30 Días)
  const [billingData, setBillingData] = useState<any>(null);
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);
  const [pricePerMonthInput, setPricePerMonthInput] = useState("10.00");
  const [cycleTypeInput, setCycleTypeInput] = useState<"weekly" | "monthly">("weekly");
  const [closingDayInput, setClosingDayInput] = useState<number>(0);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isClosingPeriod, setIsClosingPeriod] = useState(false);
  const [suspendModal, setSuspendModal] = useState<{ open: boolean; invoice: any | null; isProcessing: boolean }>({
    open: false,
    invoice: null,
    isProcessing: false,
  });
  const [reactivateModal, setReactivateModal] = useState<{ open: boolean; invoice: any | null; isProcessing: boolean }>({
    open: false,
    invoice: null,
    isProcessing: false,
  });

  const [provs, setProvs] = useState<Prov[]>([]);
  const [live, setLive] = useState<Live[]>([]);
  const [version, setVersion] = useState("");
  const [label, setLabel] = useState("");
  const [isLifetimeInput, setIsLifetimeInput] = useState(false);
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
    setMsg(d.prov_diagnosing);
    try {
      const r = await api("providers/health-check");
      if (!r.ok) {
        setMsg(lang === "en" ? "Error running diagnostics" : lang === "pt" ? "Erro ao executar diagnóstico" : "Error ejecutando diagnóstico");
        return;
      }
      const j = await r.json();
      const map: Record<string, any> = {};
      for (const res of j.results || []) {
        map[res.id] = res;
      }
      setHealthData(map);
      const hCount = j.summary?.healthy || 0;
      const dCount = j.summary?.down || 0;
      setMsg(
        lang === "en"
          ? `Diagnostics completed: ${hCount} healthy, ${dCount} with issues.`
          : lang === "pt"
          ? `Diagnóstico concluído: ${hCount} operando, ${dCount} com instabilidade.`
          : `Diagnóstico completado: ${hCount} óptimos, ${dCount} con incidencia.`
      );
    } catch {
      setMsg(lang === "en" ? "Failed to connect to diagnostic endpoint" : lang === "pt" ? "Falha ao conectar ao ponto de diagnóstico" : "Fallo al conectar con el endpoint de diagnóstico");
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
        api("billing").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ];

      if (isSuper) {
        promises.push(api("users").then((r) => (r.ok ? r.json() : null)).catch(() => null));
        promises.push(api("providers").then((r) => (r.ok ? r.json() : null)).catch(() => null));
        promises.push(api("live").then((r) => (r.ok ? r.json() : null)).catch(() => null));
      }

      const [c, b, u, p, l] = await Promise.all(promises);

      if (c) {
        setCodes(c.codes || []);
        if (c.kpis) setKpis(c.kpis);
        if (c.adminsSummary) setAdminsSummary(c.adminsSummary);
      }

      if (b) {
        setBillingData(b);
        if (b.settings) {
          setPricePerMonthInput(b.settings.pricePerMonth?.toString() || "10.00");
          setCycleTypeInput(b.settings.cycleType);
          setClosingDayInput(b.settings.closingDay);
        }
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

  const loadBilling = useCallback(async () => {
    setIsLoadingBilling(true);
    try {
      const r = await api("billing");
      if (r.ok) {
        const j = await r.json();
        setBillingData(j);
        if (j.settings) {
          setPricePerMonthInput(j.settings.pricePerMonth?.toString() || "10.00");
          setCycleTypeInput(j.settings.cycleType);
          setClosingDayInput(j.settings.closingDay);
        }
      }
    } catch {}
    finally {
      setIsLoadingBilling(false);
    }
  }, []);

  const handleSaveBillingSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setMsg("");
    try {
      const pMonth = parseFloat(pricePerMonthInput) || 10.00;
      const r = await api("billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_settings",
          settings: {
            pricePerMonth: pMonth,
            cycleType: cycleTypeInput,
            closingDay: Number(closingDayInput),
          },
        }),
      });
      const j = await r.json();
      if (r.ok) {
        setMsg(
          lang === "en"
            ? "30-day package rate and closing cycle updated successfully."
            : lang === "pt"
            ? "Tarifa por pacote de 30 dias e ciclo de corte atualizados com sucesso."
            : "Tarifa por paquete de 30 días y ciclo de corte actualizados correctamente."
        );
        await loadBilling();
      } else {
        setMsg(j.message || (lang === "en" ? "Error saving billing settings" : lang === "pt" ? "Erro ao salvar configurações" : "Error guardando ajustes de facturación"));
      }
    } catch {
      setMsg(lang === "en" ? "Connection error while saving settings" : lang === "pt" ? "Erro de conexão ao salvar configurações" : "Error de conexión al guardar configuración");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleExecutePeriodClose = async () => {
    const confirmText =
      lang === "en"
        ? "Close the current period and generate billing settlements for all administrators?"
        : lang === "pt"
        ? "Deseja fechar o período atual e gerar as faturas para todos os administradores?"
        : "¿Deseas cerrar el período actual y generar las liquidaciones de cobro para todos los administradores?";
    if (!confirm(confirmText)) return;

    setIsClosingPeriod(true);
    setMsg(d.bill_btn_closing);
    try {
      const r = await api("billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close_period" }),
      });
      const j = await r.json();
      if (r.ok) {
        setMsg(
          lang === "en"
            ? `Period closing completed! Generated ${j.invoicesCount} settlements.`
            : lang === "pt"
            ? `Fechamento de período concluído! Foram geradas ${j.invoicesCount} liquidações.`
            : `¡Cierre de período completado con éxito! Se generaron ${j.invoicesCount} liquidaciones.`
        );
        await loadBilling();
        await load();
      } else {
        setMsg(j.message || (lang === "en" ? "Error executing period close" : lang === "pt" ? "Erro ao fechar período" : "Error al ejecutar cierre de período"));
      }
    } catch {
      setMsg(lang === "en" ? "Connection error during period closing" : lang === "pt" ? "Erro de conexão ao fechar período" : "Error de conexión al ejecutar cierre");
    } finally {
      setIsClosingPeriod(false);
    }
  };

  const handleConfirmSuspend = async () => {
    if (!suspendModal.invoice) return;
    setSuspendModal((prev) => ({ ...prev, isProcessing: true }));
    try {
      const r = await api("billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suspend_codes",
          invoiceId: suspendModal.invoice.id,
        }),
      });
      const j = await r.json();
      if (r.ok) {
        setMsg(
          lang === "en"
            ? `Suspended ${j.suspendedCount} codes for @${suspendModal.invoice.admin_username} and terminated active sessions.`
            : lang === "pt"
            ? `Foram suspensas ${j.suspendedCount} chaves de @${suspendModal.invoice.admin_username} e encerradas as sessões ativas.`
            : `Se suspendieron ${j.suspendedCount} códigos de @${suspendModal.invoice.admin_username} y se expulsaron sus sesiones activas.`
        );
        setSuspendModal({ open: false, invoice: null, isProcessing: false });
        await loadBilling();
        await load();
      } else {
        setMsg(j.message || (lang === "en" ? "Error suspending codes" : lang === "pt" ? "Erro ao suspender chaves" : "Error suspendiendo códigos"));
        setSuspendModal((prev) => ({ ...prev, isProcessing: false }));
      }
    } catch {
      setMsg(lang === "en" ? "Connection error while suspending codes" : lang === "pt" ? "Erro de conexão ao suspender chaves" : "Error de conexión al suspender códigos");
      setSuspendModal((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  const handleConfirmReactivate = async () => {
    if (!reactivateModal.invoice) return;
    setReactivateModal((prev) => ({ ...prev, isProcessing: true }));
    try {
      const r = await api("billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_paid",
          invoiceId: reactivateModal.invoice.id,
        }),
      });
      const j = await r.json();
      if (r.ok) {
        setMsg(
          lang === "en"
            ? `Settlement marked as paid! Reactivated ${j.reactivatedCount || 0} valid codes.`
            : lang === "pt"
            ? `Fatura marcada como paga! Foram reativadas ${j.reactivatedCount || 0} chaves válidas.`
            : `¡Liquidación marcada como pagada! Se reactivaron ${j.reactivatedCount || 0} códigos vigentes.`
        );
        setReactivateModal({ open: false, invoice: null, isProcessing: false });
        await loadBilling();
        await load();
      } else {
        setMsg(j.message || (lang === "en" ? "Error reactivating codes" : lang === "pt" ? "Erro ao reativar chaves" : "Error al reactivar códigos"));
        setReactivateModal((prev) => ({ ...prev, isProcessing: false }));
      }
    } catch {
      setMsg(lang === "en" ? "Connection error while reactivating codes" : lang === "pt" ? "Erro de conexão ao reativar chaves" : "Error de conexión al reactivar códigos");
      setReactivateModal((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  const handleDirectMarkPaid = async (invoiceId: string, username: string) => {
    const confirmPrompt =
      lang === "en"
        ? `Mark settlement for @${username} as paid?`
        : lang === "pt"
        ? `Marcar a fatura de @${username} como paga?`
        : `¿Marcar la liquidación de @${username} como pagada?`;
    if (!confirm(confirmPrompt)) return;

    try {
      const r = await api("billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_paid", invoiceId }),
      });
      if (r.ok) {
        setMsg(
          lang === "en"
            ? `Settlement for @${username} marked as paid.`
            : lang === "pt"
            ? `Fatura de @${username} marcada como paga.`
            : `Liquidación de @${username} marcada como pagada.`
        );
        await loadBilling();
      } else {
        setMsg(lang === "en" ? "Error registering payment" : lang === "pt" ? "Erro ao registrar pagamento" : "Error al registrar pago");
      }
    } catch {
      setMsg(lang === "en" ? "Connection error while marking as paid" : lang === "pt" ? "Erro de conexão ao marcar pagamento" : "Error de conexión al marcar pago");
    }
  };

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
        setLoginError(j.message || d.login_err_default);
      }
    } catch {
      setLoginError(d.login_err_conn);
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
    const isSuper = currentAdmin?.role === "superadmin";
    const r = await api("codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        isLifetime: isSuper && isLifetimeInput,
        days: isSuper && isLifetimeInput ? 0 : 3,
      }),
    });
    const j = await r.json();
    if (r.ok) {
      setNewCode(j);
      setLabel("");
      setIsLifetimeInput(false);
      setCopiedLink(false);
      setCopiedCode(false);
      load();
    } else {
      setMsg(j.message || d.msg_gen_error);
    }
  };

  const extendCode = async (codeId: string, daysToAdd: 30 | 90 | 360) => {
    const r = await api("codes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: codeId, extendDays: daysToAdd }),
    });
    const j = await r.json();
    if (r.ok) {
      setMsg(d.msg_extend_success(daysToAdd));
      load();
    } else {
      setMsg(j.message || d.msg_extend_error);
    }
  };

  const resetSessions = async (codeId: string, codeLabel: string) => {
    if (!confirm(d.confirm_reset_sessions(codeLabel))) return;
    const r = await api(`codes?resetSessions=${codeId}`, { method: "DELETE" });
    if (r.ok) {
      setMsg(d.msg_slots_released);
      load();
    } else {
      setMsg(lang === "en" ? "Error unlinking devices." : lang === "pt" ? "Erro ao desvincular dispositivos." : "Error al desvincular dispositivos.");
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
      setMsg(
        lang === "en"
          ? `Administrator @${j.user.username} created successfully.`
          : lang === "pt"
          ? `Administrador @${j.user.username} criado com sucesso.`
          : `Administrador @${j.user.username} creado exitosamente.`
      );
      load();
    } else {
      setCreateAdminError(j.message || (lang === "en" ? "Error creating administrator" : lang === "pt" ? "Erro ao criar administrador" : "Error al crear administrador"));
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
      setMsg(
        lang === "en"
          ? `Password for @${targetPasswordUser.username} updated successfully.`
          : lang === "pt"
          ? `Senha de @${targetPasswordUser.username} atualizada com sucesso.`
          : `Contraseña de @${targetPasswordUser.username} actualizada correctamente.`
      );
      load();
    } else {
      setPasswordModalMsg(j.message || (lang === "en" ? "Error updating password" : lang === "pt" ? "Erro ao atualizar senha" : "Error al actualizar contraseña"));
    }
  };

  // Administradores: Cambiar Estado Activo/Suspendido
  const toggleAdminActive = async (userItem: AdminUserItem) => {
    const nextState = !userItem.is_active;
    const actionText = nextState
      ? lang === "en" ? "reactivate" : lang === "pt" ? "reativar" : "reactivar"
      : lang === "en" ? "suspend" : lang === "pt" ? "suspender" : "suspender";
    const warning = !nextState
      ? lang === "en" ? "All active sessions will be terminated immediately." : lang === "pt" ? "Todas as sessões ativas serão encerradas imediatamente." : "Se revocarán todas sus sesiones activas inmediatamente."
      : "";

    if (!confirm(d.confirm_toggle_admin(actionText, userItem.username, warning))) return;

    const r = await api("users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userItem.id, is_active: nextState }),
    });
    if (r.ok) {
      setMsg(
        lang === "en"
          ? `Account @${userItem.username} ${nextState ? "reactivated" : "suspended"}.`
          : lang === "pt"
          ? `Conta de @${userItem.username} ${nextState ? "reativada" : "suspensa"}.`
          : `Cuenta de @${userItem.username} ${nextState ? "reactivada" : "suspendida"}.`
      );
      load();
    } else {
      const j = await r.json().catch(() => ({}));
      setMsg(j.message || (lang === "en" ? "Error updating administrator status" : lang === "pt" ? "Erro ao atualizar status do administrador" : "Error al modificar estado del administrador"));
    }
  };

  // Administradores: Eliminar
  const deleteAdmin = async (userItem: AdminUserItem) => {
    if (!confirm(d.confirm_delete_admin(userItem.username))) return;

    const r = await api(`users?id=${userItem.id}`, { method: "DELETE" });
    if (r.ok) {
      setMsg(
        lang === "en"
          ? `Administrator @${userItem.username} deleted.`
          : lang === "pt"
          ? `Administrador @${userItem.username} excluído.`
          : `Administrador @${userItem.username} eliminado.`
      );
      load();
    } else {
      const j = await r.json().catch(() => ({}));
      setMsg(j.message || (lang === "en" ? "Error deleting administrator" : lang === "pt" ? "Erro ao excluir administrador" : "Error al eliminar administrador"));
    }
  };

  const saveProv = async () => {
    if (!edit?.id || !edit?.name || !edit?.movie_tpl || !edit?.tv_tpl) {
      setMsg(lang === "en" ? "Please fill in id, name, and templates" : lang === "pt" ? "Preencha id, nome e modelos" : "Completa id, nombre y plantillas");
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
    } else setMsg(lang === "en" ? "Error saving server" : lang === "pt" ? "Erro ao salvar servidor" : "Error guardando servidor");
  };

  const saveLive = async () => {
    if (!editLive?.id || !editLive?.name || !editLive?.format || !editLive?.list) {
      setMsg(lang === "en" ? "Please complete all fields" : lang === "pt" ? "Preencha todos os campos" : "Completa todos los campos");
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
    } else setMsg(lang === "en" ? "Error saving Live source" : lang === "pt" ? "Erro ao salvar fonte Live" : "Error guardando fuente Live");
  };

  const inp =
    "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#008CFF] transition-all text-white placeholder-zinc-500";
  const btn =
    "px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs hover:border-[#008CFF] transition-colors cursor-pointer";

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

    const isCodeLifetime = isLifetime(c.expires_at);
    const exp = !isCodeLifetime && new Date(c.expires_at).getTime() <= Date.now();
    const daysLeft = isCodeLifetime ? 99999 : Math.ceil((new Date(c.expires_at).getTime() - Date.now()) / 86400000);

    if (filterStatus === "active") return !c.revoked && !exp;
    if (filterStatus === "expiring") return !c.revoked && !exp && !isCodeLifetime && daysLeft <= 7;
    if (filterStatus === "full") return (c.deviceCount || 0) >= (c.maxDevices || 3);
    if (filterStatus === "expired") return c.revoked || exp;
    return true;
  });

  // Pantalla de Inicio de Sesión
  if (!auth) {
    return (
      <div className="max-w-md mx-auto py-8 sm:py-16 px-4">
        <div className="bg-[#0e0f17] border border-white/10 rounded-3xl p-5 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#008CFF]/15 border border-[#008CFF]/30 flex items-center justify-center text-[#008CFF] font-black text-xl">
                TV
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{d.login_title}</h1>
                <p className="text-xs text-zinc-400">{d.login_subtitle}</p>
              </div>
            </div>
            <LangMenu />
          </div>

          {health && <p className="text-xs text-amber-400 mb-4 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">{health}</p>}

          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {loginError}
            </div>
          )}

          <form onSubmit={login} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">{d.login_user}</label>
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
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">{d.login_pass}</label>
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
              className="w-full py-3 rounded-xl bg-[#008CFF] hover:bg-[#0077db] text-white font-bold text-sm transition-all shadow-lg shadow-[#008CFF]/20 mt-2 cursor-pointer disabled:opacity-60"
            >
              {isLoggingIn ? d.login_verifying : d.login_btn}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Header & Identificación del Administrador */}
      <div className="flex items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6 flex-wrap pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#008CFF]/20 border border-[#008CFF]/40 flex items-center justify-center text-[#008CFF] font-black shrink-0">
            TV
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white leading-tight">{d.console_title}</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-zinc-400">
                {d.connected_as} <strong className="text-zinc-200">@{currentAdmin?.username}</strong>
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                  isSuperAdmin
                    ? "bg-[#008CFF]/20 text-[#008CFF] border-[#008CFF]/30"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                }`}
              >
                {isSuperAdmin ? d.role_super : d.role_manager}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t border-white/5 sm:border-0">
          <LangMenu />
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
            className="px-3 py-1.5 rounded-xl text-xs bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 transition-colors cursor-pointer"
          >
            {d.btn_my_pass}
          </button>
          <button
            onClick={logout}
            className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-red-400 border border-white/10 hover:border-red-400/40 transition-colors cursor-pointer"
          >
            {d.btn_logout}
          </button>
        </div>
      </div>

      {/* Tabs Selector con scroll horizontal táctil y sin desbordes */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar whitespace-nowrap pb-1.5">
        <button
          onClick={() => {
            setTab("codes");
            setMsg("");
          }}
          className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
            tab === "codes"
              ? "bg-[#008CFF] border-[#008CFF] text-white"
              : "border-white/15 text-zinc-400 hover:border-white/30"
          }`}
        >
          {isSuperAdmin ? `${d.tab_codes} (${codes.length})` : `${d.tab_my_codes} (${codes.length})`}
        </button>

        {isSuperAdmin && (
          <>
            <button
              onClick={() => {
                setTab("admins");
                setMsg("");
              }}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                tab === "admins"
                  ? "bg-[#008CFF] border-[#008CFF] text-white"
                  : "border-white/15 text-zinc-400 hover:border-white/30"
              }`}
            >
              <span>{d.tab_admins}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                {adminUsers.length}
              </span>
            </button>

            <button
              onClick={() => {
                setTab("prov");
                setMsg("");
              }}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                tab === "prov"
                  ? "bg-[#008CFF] border-[#008CFF] text-white"
                  : "border-white/15 text-zinc-400 hover:border-white/30"
              }`}
            >
              {d.tab_prov} (v{version || "?"})
            </button>

            <button
              onClick={() => {
                setTab("live");
                setMsg("");
              }}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                tab === "live"
                  ? "bg-[#008CFF] border-[#008CFF] text-white"
                  : "border-white/15 text-zinc-400 hover:border-white/30"
              }`}
            >
              {d.tab_live} ({live.length})
            </button>
          </>
        )}

        <button
          onClick={() => {
            setTab("billing");
            setMsg("");
            loadBilling();
          }}
          className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
            tab === "billing"
              ? "bg-[#008CFF] border-[#008CFF] text-white"
              : "border-white/15 text-zinc-400 hover:border-white/30"
          }`}
        >
          <span>{isSuperAdmin ? d.tab_billing_super : d.tab_billing_reseller}</span>
          {isSuperAdmin && billingData?.kpis?.pendingDebtTotal > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">
              ${billingData.kpis.pendingDebtTotal}
            </span>
          )}
          {!isSuperAdmin && billingData?.kpis?.myCurrentBalance?.totalAmount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">
              ${billingData.kpis.myCurrentBalance.totalAmount}
            </span>
          )}
        </button>
      </div>

      {msg && (
        <div className="p-3 mb-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300 flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg("")} className="text-zinc-400 hover:text-white ml-2 text-sm cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* PESTAÑA 1: CLAVES DE ACCESO */}
      {tab === "codes" && (
        <>
          {/* Status KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4">
              <span className="text-[11px] sm:text-xs text-zinc-400 font-medium">{d.kpi_active_codes}</span>
              <div className="text-xl sm:text-2xl font-black text-white mt-1">
                {kpis?.activeCodes ?? 0}{" "}
                <span className="text-xs font-normal text-zinc-500">/ {kpis?.totalCodes ?? 0}</span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                {d.kpi_operating_normal}
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4">
              <span className="text-[11px] sm:text-xs text-zinc-400 font-medium">{d.kpi_connected_devices}</span>
              <div className="text-xl sm:text-2xl font-black text-[#008CFF] mt-1">
                {kpis?.totalDevices ?? 0}
              </div>
              <span className="text-[10px] sm:text-[11px] text-zinc-400 mt-1 block">{d.kpi_limit_devices}</span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4">
              <span className="text-[11px] sm:text-xs text-zinc-400 font-medium">{d.kpi_expiring_soon}</span>
              <div
                className={`text-xl sm:text-2xl font-black mt-1 ${
                  (kpis?.expiringSoon ?? 0) > 0 ? "text-amber-400" : "text-zinc-200"
                }`}
              >
                {kpis?.expiringSoon ?? 0}
              </div>
              <span className="text-[10px] sm:text-[11px] text-zinc-400 mt-1 block">{d.kpi_require_renewal}</span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4">
              <span className="text-[11px] sm:text-xs text-zinc-400 font-medium">{d.kpi_full_capacity}</span>
              <div
                className={`text-xl sm:text-2xl font-black mt-1 ${
                  (kpis?.fullCapacityCodes ?? 0) > 0 ? "text-orange-400" : "text-zinc-200"
                }`}
              >
                {kpis?.fullCapacityCodes ?? 0}
              </div>
              <span className="text-[10px] sm:text-[11px] text-zinc-400 mt-1 block">{d.kpi_quota_full}</span>
            </div>
          </div>

          {/* Formulario Crear Código */}
          <form
            onSubmit={createCode}
            className="bg-white/5 border border-white/10 rounded-2xl p-3.5 sm:p-4 mb-5 space-y-3"
          >
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
              <div className="flex-1 min-w-0">
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={d.code_label_ph}
                  className={inp}
                  required
                />
              </div>

              {/* Indicador de vigencia para la primera clave */}
              <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs shrink-0">
                {isSuperAdmin && isLifetimeInput ? (
                  <span className="text-purple-300 font-bold flex items-center gap-1.5">
                    <span className="text-sm">♾️</span> {d.code_lifetime_badge}
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <span className="text-sm">🎁</span> {d.code_trial_badge}
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#008CFF] hover:bg-[#0070cc] text-white font-bold text-sm transition-all shadow-lg shadow-[#008CFF]/20 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <span>+</span>
                <span>{d.code_generate_btn}</span>
              </button>
            </div>

            {/* Marcador exclusivo para el Administrador General */}
            {isSuperAdmin && (
              <div className="pt-2 border-t border-white/5 flex items-center justify-between flex-wrap gap-2">
                <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isLifetimeInput}
                    onChange={(e) => setIsLifetimeInput(e.target.checked)}
                    className="w-4 h-4 rounded bg-white/10 border-white/20 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="text-purple-400">♾️</span>
                    <span>{d.code_lifetime_checkbox}</span>
                  </span>
                </label>
                <span className="text-[11px] text-zinc-500">
                  {isLifetimeInput ? d.code_lifetime_hint : d.code_trial_hint}
                </span>
              </div>
            )}
          </form>

          {/* Notificación de nuevo código generado con Copiado Rápido */}
          {newCode && (
            <div className="mb-5 p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold text-sm text-emerald-400">
                  {d.new_code_title}
                </span>
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                  {d.new_code_max_devices}
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                {d.new_code_desc}
              </p>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap pt-1">
                <div className="bg-black/40 border border-emerald-500/30 rounded-xl px-3 py-1.5 font-mono text-base sm:text-lg font-black tracking-widest text-white">
                  {newCode.code || newCode}
                </div>
                {newCode.ref_code && (
                  <span className="text-xs text-zinc-400 font-mono">Ref: {newCode.ref_code}</span>
                )}
                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => copyOnlyCode(newCode.code || newCode)}
                    className="flex-1 sm:flex-none px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white text-center cursor-pointer"
                  >
                    {copiedCode ? d.copied_code : d.copy_code}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyDirectLink(newCode.code || newCode)}
                    className="flex-1 sm:flex-none px-3 py-2 rounded-lg bg-[#008CFF] hover:bg-[#0070cc] text-xs font-semibold text-white text-center cursor-pointer"
                  >
                    {copiedLink ? d.copied_link : d.copy_link}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Filtros por Administrador (Solo Super Admin) + Búsqueda */}
          <div className="flex flex-col md:flex-row gap-3 mb-4 items-stretch md:items-center justify-between">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap pb-1 md:pb-0">
              <button
                onClick={() => setFilterStatus("all")}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                  filterStatus === "all"
                    ? "bg-white/15 border-white/30 text-white"
                    : "border-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                {d.filter_all} ({codes.length})
              </button>
              <button
                onClick={() => setFilterStatus("active")}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                  filterStatus === "active"
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                    : "border-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                {d.filter_active} ({kpis?.activeCodes ?? 0})
              </button>
              <button
                onClick={() => setFilterStatus("expiring")}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                  filterStatus === "expiring"
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "border-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                {d.filter_expiring} ({kpis?.expiringSoon ?? 0})
              </button>
              <button
                onClick={() => setFilterStatus("full")}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                  filterStatus === "full"
                    ? "bg-orange-500/20 border-orange-500/40 text-orange-300"
                    : "border-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                {d.filter_full} ({kpis?.fullCapacityCodes ?? 0})
              </button>
              <button
                onClick={() => setFilterStatus("expired")}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                  filterStatus === "expired"
                    ? "bg-red-500/20 border-red-500/40 text-red-300"
                    : "border-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                {d.filter_expired} ({(kpis?.expiredCodes ?? 0) + (kpis?.revokedCodes ?? 0)})
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Filtro por Creador (Super Admin) */}
              {isSuperAdmin && adminsSummary && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 shrink-0">
                  <span>{d.filter_admin_label}</span>
                  <select
                    value={filterAdmin}
                    onChange={(e) => setFilterAdmin(e.target.value)}
                    className="flex-1 sm:flex-none bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#008CFF]"
                  >
                    <option value="all" className="bg-[#0e0f17]">
                      {d.filter_all_admins} ({codes.length})
                    </option>
                    {Object.entries(adminsSummary).map(([adm, stat]) => (
                      <option key={adm} value={adm} className="bg-[#0e0f17]">
                        @{adm} ({stat.total})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="w-full sm:w-60">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={d.search_ph}
                  className={inp}
                />
              </div>
            </div>
          </div>

          {/* Listado de Códigos */}
          <div className="space-y-3">
            {filteredCodes.map((c) => {
              const isCodeLifetime = isLifetime(c.expires_at);
              const exp = !isCodeLifetime && new Date(c.expires_at).getTime() < Date.now();
              const daysLeft = isCodeLifetime ? 99999 : Math.ceil((new Date(c.expires_at).getTime() - Date.now()) / 86400000);
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
                      : isCodeLifetime
                      ? "border-purple-500/30 bg-purple-500/5 hover:border-purple-500/50"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  } p-3.5 sm:p-4`}
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4">
                    {/* Info del Código */}
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-white break-words">
                          {c.label || d.no_label}
                        </span>
                        {isSuperAdmin && c.creator_username && (
                          <span className="text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-mono">
                            @{c.creator_username}
                          </span>
                        )}
                        {c.revoked && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                            {d.status_revoked}
                          </span>
                        )}
                        {isCodeLifetime && !c.revoked && (
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <span>♾️</span> {d.status_lifetime}
                          </span>
                        )}
                        {exp && !c.revoked && (
                          <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded-full">
                            {d.status_expired}
                          </span>
                        )}
                        {!isCodeLifetime && !exp && !c.revoked && daysLeft <= 7 && (
                          <span className="text-[10px] bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-2 py-0.5 rounded-full">
                            {d.status_expires_in(daysLeft)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-400">
                        <span className="font-mono bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-zinc-300">
                          {c.ref_code}
                        </span>
                        {isCodeLifetime ? (
                          <span className="text-purple-300 font-semibold flex items-center gap-1">
                            <span>♾️</span> {d.code_lifetime_hint}
                          </span>
                        ) : (
                          <>
                            <span>· {d.status_expires_date} {new Date(c.expires_at).toLocaleDateString(locale)}</span>
                            {!exp && !c.revoked && <span className="text-zinc-500">{d.status_days_left(daysLeft)}</span>}
                          </>
                        )}
                      </div>

                      {/* Estado de Dispositivos y Última Conexión */}
                      <div className="flex items-center gap-2 sm:gap-3 mt-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setExpandedCodeId(isExpanded ? null : c.id)}
                          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                            isFull
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold"
                              : deviceCount > 0
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-white/5 text-zinc-400 border-white/10"
                          }`}
                        >
                          <span>{d.status_devices_badge(deviceCount, maxDevices)}</span>
                          <span className="text-[10px] text-zinc-400">{isExpanded ? "▲" : "▼"}</span>
                        </button>

                        <span className="text-[11px] text-zinc-400">
                          {d.status_last_seen}{" "}
                          <b className="text-zinc-300 font-medium">{formatRelativeTime(c.lastSeen, d, lang)}</b>
                        </span>
                      </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex items-center gap-1.5 flex-wrap w-full lg:w-auto justify-start lg:justify-end pt-2 lg:pt-0 border-t border-white/5 lg:border-0">
                      {deviceCount > 0 && (
                        <button
                          type="button"
                          title="Desvincular todos los dispositivos"
                          onClick={() => resetSessions(c.id, c.label)}
                          className={`${btn} bg-orange-500/10 border-orange-500/30 text-orange-300 hover:bg-orange-500/20`}
                        >
                          {d.btn_release_slots(maxDevices)}
                        </button>
                      )}

                      {isCodeLifetime ? (
                        <span className="text-xs text-purple-300/90 bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1">
                          <span>♾️</span> {d.badge_permanent}
                        </span>
                      ) : (
                        /* Extensiones de paquetes múltiplos de 30 días */
                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                          <button
                            type="button"
                            title="Adicionar 30 días"
                            onClick={() => extendCode(c.id, 30)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                          >
                            +30d
                          </button>
                          <button
                            type="button"
                            title="Adicionar 90 días"
                            onClick={() => extendCode(c.id, 90)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                          >
                            +90d
                          </button>
                          <button
                            type="button"
                            title="Adicionar 360 días"
                            onClick={() => extendCode(c.id, 360)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                          >
                            +360d
                          </button>
                        </div>
                      )}

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
                        {c.revoked ? d.btn_reactivate : d.btn_revoke}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(d.confirm_delete_code(c.label || c.ref_code))) {
                            api(`codes?id=${c.id}`, { method: "DELETE" }).then(load);
                          }
                        }}
                        className={`${btn} hover:!border-red-500 hover:text-red-400`}
                      >
                        {d.btn_delete}
                      </button>
                    </div>
                  </div>

                  {/* Panel Desplegable de Dispositivos Conectados */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <h4 className="text-xs font-semibold text-zinc-300 mb-2">
                        {d.devices_linked_title(deviceCount, maxDevices)}
                      </h4>
                      {deviceCount === 0 ? (
                        <p className="text-xs text-zinc-500 italic">
                          {d.devices_none}
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
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
                                {d.device_seen} {formatRelativeTime(dev.lastSeen, d, lang)}
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
              <h2 className="text-lg font-bold text-white">{d.admins_title}</h2>
              <p className="text-xs text-zinc-400">
                {d.admins_subtitle}
              </p>
            </div>
            <button
              onClick={() => {
                setCreateAdminError("");
                setShowCreateAdminModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#008CFF] hover:bg-[#0077db] text-white font-bold text-xs shadow-lg shadow-[#008CFF]/20 transition-all cursor-pointer"
            >
              {d.btn_new_admin}
            </button>
          </div>

          {/* Vista móvil para Administradores (Cards) */}
          <div className="md:hidden space-y-3">
            {adminUsers.map((u) => {
              const isSelf = u.id === currentAdmin?.id;
              return (
                <div key={u.id} className="p-4 rounded-2xl border border-white/10 bg-white/5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5 text-sm">
                        <span>{u.name}</span>
                        {isSelf && (
                          <span className="text-[10px] bg-white/10 text-zinc-300 px-1.5 py-0.2 rounded">
                            {d.badge_you}
                          </span>
                        )}
                      </div>
                      <div className="text-zinc-500 font-mono text-xs">@{u.username}</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        u.role === "superadmin"
                          ? "bg-[#008CFF]/20 text-[#008CFF] border-[#008CFF]/40"
                          : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      }`}
                    >
                      {u.role === "superadmin" ? d.role_super : d.role_manager}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-white/5 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase">{d.th_active_codes}</span>
                      <strong className="text-emerald-400 font-bold">{u.stats.activeCodes}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase">{d.th_total_codes}</span>
                      <strong className="text-white font-bold">{u.stats.totalCodes}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase">{d.th_devices}</span>
                      <strong className="text-zinc-300">{u.stats.totalDevices}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>{d.th_last_login}: <strong className="text-zinc-300 font-normal">{formatRelativeTime(u.last_login_at, d, lang)}</strong></span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
                    <button
                      type="button"
                      disabled={isSelf}
                      onClick={() => toggleAdminActive(u)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        u.is_active
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                          : "bg-red-500/15 border-red-500/30 text-red-300"
                      } ${isSelf ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {u.is_active ? d.btn_active : d.btn_suspended}
                    </button>

                    <div className="flex items-center gap-1.5">
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
                        title={d.btn_key_pass}
                      >
                        {d.btn_key_pass}
                      </button>

                      {!isSelf && u.username !== "admin" && (
                        <button
                          type="button"
                          onClick={() => deleteAdmin(u)}
                          className={`${btn} hover:!border-red-500 hover:text-red-400`}
                          title="Eliminar"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabla de Administradores (Desktop) */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-white/5 border-b border-white/10 text-[11px] uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="px-4 py-3">{d.th_admin}</th>
                  <th className="px-4 py-3">{d.th_role}</th>
                  <th className="px-4 py-3 text-center">{d.th_active_codes}</th>
                  <th className="px-4 py-3 text-center">{d.th_total_codes}</th>
                  <th className="px-4 py-3 text-center">{d.th_devices}</th>
                  <th className="px-4 py-3">{d.th_last_login}</th>
                  <th className="px-4 py-3 text-center">{d.th_status}</th>
                  <th className="px-4 py-3 text-right">{d.th_actions}</th>
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
                              {d.badge_you}
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
                          {u.role === "superadmin" ? d.role_super : d.role_manager}
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
                        {formatRelativeTime(u.last_login_at, d, lang)}
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
                          {u.is_active ? d.btn_active : d.btn_suspended}
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
                            title={d.btn_key_pass}
                          >
                            {d.btn_key_pass}
                          </button>

                          {!isSelf && u.username !== "admin" && (
                            <button
                              type="button"
                              onClick={() => deleteAdmin(u)}
                              className={`${btn} hover:!border-red-500 hover:text-red-400`}
                              title="Eliminar"
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
              className="px-4 py-2 rounded-xl bg-[#008CFF] font-bold text-sm text-white shadow-lg shadow-[#008CFF]/20 cursor-pointer"
            >
              {d.prov_new}
            </button>
            <button
              onClick={runHealthCheck}
              disabled={isCheckingHealth}
              className={`${btn} bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 font-semibold flex items-center gap-1.5`}
            >
              <span>{isCheckingHealth ? "⏳" : "⚡"}</span>
              <span>{isCheckingHealth ? d.prov_diagnosing : d.prov_diagnose}</span>
            </button>
          </div>
          <div className="space-y-2">
            {provs.map((p) => {
              const langs = p.languages || (p.lang ? [p.lang] : ["multi"]);
              const h = healthData?.[p.id];
              return (
                <div
                  key={p.id}
                  className="p-3.5 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-between gap-3 flex-wrap"
                >
                  <div className="flex items-center gap-2.5 flex-wrap min-w-0">
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
                          <span>{d.prov_healthy(h.latencyMs)}</span>
                        </span>
                      ) : h.status === "slow" ? (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span>{d.prov_slow(h.latencyMs)}</span>
                        </span>
                      ) : h.status === "degraded" ? (
                        <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                          <span>{d.prov_waf(h.latencyMs)}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1" title={h.error}>
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          <span>{d.prov_down}</span>
                        </span>
                      )
                    )}
                    {p.is_beta && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-bold">
                        {d.prov_beta_title.split(" ")[0]} BETA
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
                        {d.prov_inactive}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t border-white/5 sm:border-0">
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
                      {p.active ? d.prov_deactivate : d.prov_activate}
                    </button>
                    <button onClick={() => setEdit({ ...p })} className={btn}>
                      {d.prov_edit}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(lang === "en" ? `Delete ${p.name}?` : lang === "pt" ? `Excluir ${p.name}?` : `¿Borrar ${p.name}?`))
                          api(`providers?id=${p.id}`, { method: "DELETE" }).then(load);
                      }}
                      className={`${btn} hover:!border-red-500 hover:text-red-400`}
                    >
                      {d.prov_delete}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {edit && (
            <div className="mt-4 p-4 sm:p-5 rounded-2xl border border-[#008CFF]/40 bg-black/70 space-y-4 shadow-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={edit.id || ""}
                  disabled={!edit._new}
                  onChange={(e) => setEdit({ ...edit, id: e.target.value })}
                  placeholder={d.prov_id_ph}
                  className={inp}
                />
                <input
                  value={edit.name || ""}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  placeholder={d.prov_name_ph}
                  className={inp}
                />
              </div>

              {/* Idiomas */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  {d.prov_audio_langs}
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
                        className={`p-2 rounded-xl text-xs font-medium border text-left flex items-center gap-2 transition-all cursor-pointer ${
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
                  {d.prov_subs_langs}
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
                        className={`p-2 rounded-xl text-xs font-medium border text-left flex items-center gap-2 transition-all cursor-pointer ${
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
                placeholder={d.prov_movie_tpl}
                className={`${inp} font-mono`}
              />
              <input
                value={edit.tv_tpl || ""}
                onChange={(e) => setEdit({ ...edit, tv_tpl: e.target.value })}
                placeholder={d.prov_tv_tpl}
                className={`${inp} font-mono`}
              />
              <input
                value={edit.entry_key || ""}
                onChange={(e) => setEdit({ ...edit, entry_key: e.target.value })}
                placeholder={d.prov_entry_key}
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
                    <span>{d.prov_beta_title}</span>
                  </label>
                  <p className="text-[11px] text-zinc-400 mt-1 ml-6">
                    {d.prov_beta_desc}
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
                  tvOk
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={edit.active !== false}
                    onChange={(e) => setEdit({ ...edit, active: e.target.checked })}
                  />{" "}
                  {d.filter_active}
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
                  className="px-5 py-2.5 rounded-xl bg-[#008CFF] font-bold text-sm text-white shadow-lg shadow-[#008CFF]/20 cursor-pointer"
                >
                  {d.prov_save}
                </button>
                <button
                  onClick={() => {
                    setEdit(null);
                    setMsg("");
                  }}
                  className={btn}
                >
                  {d.prov_cancel}
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
            className="mb-4 px-4 py-2 rounded-xl bg-[#008CFF] font-bold text-sm text-white shadow-lg shadow-[#008CFF]/20 cursor-pointer"
          >
            {d.live_new}
          </button>
          <div className="space-y-2">
            {live.map((l) => (
              <div
                key={l.id}
                className="p-3.5 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-between gap-3 flex-wrap"
              >
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <b className="text-sm text-white">{l.name}</b>
                  <code className="text-xs text-zinc-400">
                    {l.id} · {l.format}
                  </code>
                  {!l.active && (
                    <span className="text-xs bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">
                      {d.prov_inactive}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t border-white/5 sm:border-0">
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
                    {l.active ? d.prov_deactivate : d.prov_activate}
                  </button>
                  <button onClick={() => setEditLive({ ...l })} className={btn}>
                    {d.prov_edit}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(lang === "en" ? `Delete ${l.name}?` : lang === "pt" ? `Excluir ${l.name}?` : `¿Borrar ${l.name}?`))
                        api(`live?id=${l.id}`, { method: "DELETE" }).then(load);
                    }}
                    className={`${btn} hover:!border-red-500 hover:text-red-400`}
                  >
                    {d.prov_delete}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {editLive && (
            <div className="mt-4 p-4 sm:p-5 rounded-2xl border border-[#008CFF]/40 bg-black/70 space-y-3 shadow-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                placeholder={d.live_url_ph}
                className={`${inp} font-mono`}
              />
              <div className="flex gap-2 pt-2">
                <button
                  onClick={saveLive}
                  className="px-5 py-2.5 rounded-xl bg-[#008CFF] font-bold text-sm text-white shadow-lg shadow-[#008CFF]/20 cursor-pointer"
                >
                  {d.live_save}
                </button>
                <button
                  onClick={() => {
                    setEditLive(null);
                    setMsg("");
                  }}
                  className={btn}
                >
                  {d.cancel}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB: FINANZAS Y CONTROL DE VENTAS (Spec 025) */}
      {tab === "billing" && (
        <div className="space-y-6">
          {/* Cabecera de la sección */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>💰</span>
                <span>{isSuperAdmin ? d.bill_title_super : d.bill_title_reseller}</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                {isSuperAdmin ? d.bill_sub_super : d.bill_sub_reseller}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={loadBilling}
                disabled={isLoadingBilling}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <span>🔄</span>
                <span>{isLoadingBilling ? d.bill_btn_refreshing : d.bill_btn_refresh}</span>
              </button>

              {isSuperAdmin && (
                <button
                  onClick={handleExecutePeriodClose}
                  disabled={isClosingPeriod}
                  className="px-4 py-2 rounded-xl bg-[#008CFF] hover:bg-[#0077db] text-white text-xs font-bold transition-all shadow-lg shadow-[#008CFF]/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <span>⚡</span>
                  <span>{isClosingPeriod ? d.bill_btn_closing : d.bill_btn_close_period}</span>
                </button>
              )}
            </div>
          </div>

          {/* KPI CARDS */}
          {isSuperAdmin ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="p-3 sm:p-4 rounded-2xl bg-[#0e0f17] border border-white/5 space-y-1">
                <span className="text-[10px] sm:text-[11px] text-zinc-400 uppercase font-semibold">{d.bill_kpi_open_cycle}</span>
                <p className="text-xl sm:text-2xl font-black text-white">
                  ${billingData?.kpis?.currentCycleTotal?.toFixed(2) || "0.00"}
                </p>
                <span className="text-[10px] text-zinc-500">{d.bill_kpi_open_cycle_sub}</span>
              </div>

              <div className="p-3 sm:p-4 rounded-2xl bg-[#0e0f17] border border-white/5 space-y-1">
                <span className="text-[10px] sm:text-[11px] text-zinc-400 uppercase font-semibold">{d.bill_kpi_pending_debt}</span>
                <p className={`text-xl sm:text-2xl font-black ${(billingData?.kpis?.pendingDebtTotal || 0) > 0 ? "text-amber-400" : "text-zinc-300"}`}>
                  ${billingData?.kpis?.pendingDebtTotal?.toFixed(2) || "0.00"}
                </p>
                <span className="text-[10px] text-zinc-500">{d.bill_kpi_pending_debt_sub}</span>
              </div>

              <div className="p-3 sm:p-4 rounded-2xl bg-[#0e0f17] border border-white/5 space-y-1">
                <span className="text-[10px] sm:text-[11px] text-zinc-400 uppercase font-semibold">{d.bill_kpi_total_paid}</span>
                <p className="text-xl sm:text-2xl font-black text-emerald-400">
                  ${billingData?.kpis?.paidTotal?.toFixed(2) || "0.00"}
                </p>
                <span className="text-[10px] text-zinc-500">{d.bill_kpi_total_paid_sub}</span>
              </div>

              <div className="p-3 sm:p-4 rounded-2xl bg-[#0e0f17] border border-white/5 space-y-1">
                <span className="text-[10px] sm:text-[11px] text-zinc-400 uppercase font-semibold">{d.bill_kpi_cuts}</span>
                <p className={`text-xl sm:text-2xl font-black ${(billingData?.kpis?.suspendedAdminsCount || 0) > 0 ? "text-red-400" : "text-zinc-300"}`}>
                  {billingData?.kpis?.suspendedAdminsCount || 0}
                </p>
                <span className="text-[10px] text-zinc-500">{d.bill_kpi_cuts_sub}</span>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-[#0e0f17] to-[#0e0f17] border border-blue-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs uppercase font-bold text-blue-400 tracking-wider">{d.bill_reseller_title}</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-white">
                    ${billingData?.kpis?.myCurrentBalance?.totalAmount?.toFixed(2) || "0.00"}
                  </span>
                  <span className="text-xs text-zinc-400">{d.bill_reseller_due_desc}</span>
                </div>
                <p className="text-xs text-zinc-400">
                  {d.bill_reseller_sold_summary(
                    billingData?.kpis?.myCurrentBalance?.codesCount || 0,
                    billingData?.kpis?.myCurrentBalance?.packagesCount || Math.round((billingData?.kpis?.myCurrentBalance?.totalDays || 0) / 30)
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-4 text-xs border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-6">
                <div>
                  <span className="text-zinc-500 block">{d.bill_rate_package_label}</span>
                  <strong className="text-emerald-400 font-mono text-sm">${billingData?.settings?.pricePerMonth ?? "10.00"} USD</strong>
                </div>
                <div>
                  <span className="text-zinc-500 block">{d.bill_frequency_label}</span>
                  <strong className="text-white capitalize">
                    {billingData?.settings?.cycleType === "weekly" ? d.bill_weekly : d.bill_monthly}
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-500 block">{d.bill_closing_day_label}</span>
                  <strong className="text-white">
                    {billingData?.settings?.cycleType === "weekly"
                      ? d.bill_day_names[billingData?.settings?.closingDay || 0]
                      : `${d.bill_day_prefix} ${billingData?.settings?.closingDay || 28}`}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* AJUSTES FINANCIEROS (SUPER ADMIN) */}
          {isSuperAdmin && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0e0f17] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>⚙️</span>
                    <span>{d.bill_settings_title}</span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {d.bill_settings_sub}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveBillingSettings} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center justify-between">
                    <span>{d.bill_price_30d_label}</span>
                    <span className="text-[10px] text-emerald-400 font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">Base</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-mono font-bold">$</span>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      placeholder="10.00"
                      value={pricePerMonthInput}
                      onChange={(e) => setPricePerMonthInput(e.target.value)}
                      required
                      className={`${inp} pl-7 font-mono font-bold text-white`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    {d.bill_cycle_label}
                  </label>
                  <select
                    value={cycleTypeInput}
                    onChange={(e) => setCycleTypeInput(e.target.value as any)}
                    className={inp}
                  >
                    <option value="weekly" className="bg-[#0e0f17]">{d.bill_weekly}</option>
                    <option value="monthly" className="bg-[#0e0f17]">{d.bill_monthly}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    {d.bill_closing_day_label}
                  </label>
                  {cycleTypeInput === "weekly" ? (
                    <select
                      value={closingDayInput}
                      onChange={(e) => setClosingDayInput(Number(e.target.value))}
                      className={inp}
                    >
                      <option value={0} className="bg-[#0e0f17]">{d.bill_day_names[0]} (23:59 UTC)</option>
                      <option value={1} className="bg-[#0e0f17]">{d.bill_day_names[1]} (23:59 UTC)</option>
                      <option value={2} className="bg-[#0e0f17]">{d.bill_day_names[2]} (23:59 UTC)</option>
                      <option value={3} className="bg-[#0e0f17]">{d.bill_day_names[3]} (23:59 UTC)</option>
                      <option value={4} className="bg-[#0e0f17]">{d.bill_day_names[4]} (23:59 UTC)</option>
                      <option value={5} className="bg-[#0e0f17]">{d.bill_day_names[5]} (23:59 UTC)</option>
                      <option value={6} className="bg-[#0e0f17]">{d.bill_day_names[6]} (23:59 UTC)</option>
                    </select>
                  ) : (
                    <select
                      value={closingDayInput}
                      onChange={(e) => setClosingDayInput(Number(e.target.value))}
                      className={inp}
                    >
                      <option value={1} className="bg-[#0e0f17]">{d.bill_day_prefix} 1</option>
                      <option value={15} className="bg-[#0e0f17]">{d.bill_day_prefix} 15</option>
                      <option value={28} className="bg-[#0e0f17]">{d.bill_day_prefix} 28 / End</option>
                    </select>
                  )}
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="w-full py-2.5 rounded-xl bg-[#008CFF] hover:bg-[#0070cc] text-white font-bold text-xs shadow-lg shadow-[#008CFF]/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSavingSettings ? d.bill_btn_saving_rate : d.bill_btn_save_rate}
                  </button>
                </div>
              </form>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200/90 flex items-start gap-2.5">
                <span className="text-base shrink-0">📦</span>
                <p>{d.bill_model_expl(pricePerMonthInput)}</p>
              </div>
            </div>
          )}

          {/* DESGLOSE EN TIEMPO REAL DEL CICLO ABIERTO (SUPER ADMIN) */}
          {isSuperAdmin && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0e0f17] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>📊</span>
                    <span>{d.bill_curr_balance_title}</span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {d.bill_curr_balance_sub}
                  </p>
                </div>
              </div>

              {(!billingData?.currentDebtByAdmin || billingData.currentDebtByAdmin.length === 0) ? (
                <div className="text-center py-6 text-xs text-zinc-500">
                  {d.bill_curr_empty}
                </div>
              ) : (
                <>
                  {/* Vista móvil */}
                  <div className="md:hidden space-y-2.5">
                    {billingData.currentDebtByAdmin.map((row: any) => (
                      <div key={row.username} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-white text-xs block">@{row.username}</span>
                          {row.name && row.name !== row.username && (
                            <span className="text-zinc-500 text-[11px]">{row.name}</span>
                          )}
                          <span className="text-[10px] text-zinc-400 mt-0.5 block">
                            {row.codesCount} cod · {row.packagesCount ?? Math.round((row.totalDays || 0) / 30)} pkg
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-[#008CFF] font-mono text-base block">
                            ${row.totalAmount?.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tabla escritorio */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-zinc-400">
                          <th className="py-2.5 px-3">{d.th_admin}</th>
                          <th className="py-2.5 px-3 text-center">{d.tab_codes}</th>
                          <th className="py-2.5 px-3 text-center">Paquetes (30d)</th>
                          <th className="py-2.5 px-3 text-right">Total Acumulado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {billingData.currentDebtByAdmin.map((row: any) => (
                          <tr key={row.username} className="hover:bg-white/[0.02]">
                            <td className="py-3 px-3">
                              <span className="font-bold text-white">@{row.username}</span>
                              {row.name && row.name !== row.username && (
                                <span className="text-zinc-500 block text-[11px]">{row.name}</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center font-mono">{row.codesCount}</td>
                            <td className="py-3 px-3 text-center font-mono font-semibold text-emerald-400">
                              {row.packagesCount ?? Math.round((row.totalDays || 0) / 30)} pkg
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-[#008CFF] font-mono text-sm">
                              ${row.totalAmount?.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* HISTORIAL DE LIQUIDACIONES / FACTURAS POR PERÍODO */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0e0f17] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>📑</span>
                  <span>{isSuperAdmin ? d.bill_history_title_super : d.bill_history_title_reseller}</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  {isSuperAdmin ? d.bill_history_sub_super : d.bill_history_sub_reseller}
                </p>
              </div>
            </div>

            {(!billingData?.invoices || billingData.invoices.length === 0) ? (
              <div className="text-center py-8 text-xs text-zinc-500">
                {d.bill_history_empty}
              </div>
            ) : (
              <>
                {/* Vista móvil para Liquidaciones */}
                <div className="md:hidden space-y-3">
                  {billingData.invoices.map((inv: any) => {
                    const period = inv.billing_periods;
                    const periodText = period
                      ? `${new Date(period.start_date).toLocaleDateString(locale, { day: "2-digit", month: "short" })} - ${new Date(period.end_date).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" })}`
                      : new Date(inv.created_at).toLocaleDateString(locale);

                    return (
                      <div key={inv.id} className="p-3.5 rounded-2xl border border-white/10 bg-white/5 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="font-semibold text-white text-xs block">{periodText}</span>
                            {isSuperAdmin && (
                              <span className="font-bold text-[#008CFF] text-xs">@{inv.admin_username}</span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-base font-black text-white font-mono block">
                              ${Number(inv.total_amount || 0).toFixed(2)}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {inv.total_codes} cod · {Math.round((inv.total_days || 0) / 30)} pkg
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
                          {inv.is_suspended ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                              {d.bill_status_suspended}
                            </span>
                          ) : inv.status === "paid" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {d.bill_status_paid}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {d.bill_status_pending}
                            </span>
                          )}

                          {isSuperAdmin && (
                            <div className="flex items-center gap-1.5 ml-auto">
                              {inv.status === "pending" && !inv.is_suspended && (
                                <>
                                  <button
                                    onClick={() => handleDirectMarkPaid(inv.id, inv.admin_username)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition-colors cursor-pointer"
                                  >
                                    {d.bill_btn_mark_paid}
                                  </button>
                                  <button
                                    onClick={() => setSuspendModal({ open: true, invoice: inv, isProcessing: false })}
                                    className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-[11px] font-semibold transition-colors cursor-pointer"
                                  >
                                    {d.bill_btn_suspend_codes}
                                  </button>
                                </>
                              )}

                              {inv.is_suspended && (
                                <button
                                  onClick={() => setReactivateModal({ open: true, invoice: inv, isProcessing: false })}
                                  className="px-2.5 py-1 rounded-lg bg-[#008CFF]/20 hover:bg-[#008CFF]/30 text-[#008CFF] border border-[#008CFF]/30 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <span>🔄</span>
                                  <span>{d.bill_btn_reactivate_paid}</span>
                                </button>
                              )}

                              {inv.status === "paid" && (
                                <span className="text-[10px] text-zinc-500">
                                  {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString(locale) : "Liquidado"}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tabla escritorio */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-zinc-400">
                        <th className="py-2.5 px-3">Período de Facturación</th>
                        {isSuperAdmin && <th className="py-2.5 px-3">{d.th_admin}</th>}
                        <th className="py-2.5 px-3 text-center">Códigos</th>
                        <th className="py-2.5 px-3 text-center">Paquetes</th>
                        <th className="py-2.5 px-3 text-right">Monto Total</th>
                        <th className="py-2.5 px-3 text-center">{d.th_status}</th>
                        {isSuperAdmin && <th className="py-2.5 px-3 text-right">{d.th_actions}</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {billingData.invoices.map((inv: any) => {
                        const period = inv.billing_periods;
                        const periodText = period
                          ? `${new Date(period.start_date).toLocaleDateString(locale, { day: "2-digit", month: "short" })} - ${new Date(period.end_date).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" })}`
                          : new Date(inv.created_at).toLocaleDateString(locale);

                        return (
                          <tr key={inv.id} className="hover:bg-white/[0.02]">
                            <td className="py-3 px-3">
                              <span className="font-semibold text-white">{periodText}</span>
                              {inv.notes && (
                                <span className="text-[10px] text-zinc-500 block">{inv.notes}</span>
                              )}
                            </td>

                            {isSuperAdmin && (
                              <td className="py-3 px-3">
                                <span className="font-bold text-white">@{inv.admin_username}</span>
                              </td>
                            )}

                            <td className="py-3 px-3 text-center font-mono">{inv.total_codes}</td>
                            <td className="py-3 px-3 text-center font-mono font-semibold text-emerald-400">
                              {Math.round((inv.total_days || 0) / 30)} pkg
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-white font-mono text-sm">
                              ${Number(inv.total_amount || 0).toFixed(2)}
                            </td>

                            <td className="py-3 px-3 text-center">
                              {inv.is_suspended ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                                  {d.bill_status_suspended}
                                </span>
                              ) : inv.status === "paid" ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  {d.bill_status_paid}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  {d.bill_status_pending}
                                </span>
                              )}
                            </td>

                            {isSuperAdmin && (
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {inv.status === "pending" && !inv.is_suspended && (
                                    <>
                                      <button
                                        onClick={() => handleDirectMarkPaid(inv.id, inv.admin_username)}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition-colors cursor-pointer"
                                      >
                                        {d.bill_btn_mark_paid}
                                      </button>

                                      <button
                                        onClick={() => setSuspendModal({ open: true, invoice: inv, isProcessing: false })}
                                        className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-[11px] font-semibold transition-colors cursor-pointer"
                                      >
                                        {d.bill_btn_suspend_codes}
                                      </button>
                                    </>
                                  )}

                                  {inv.is_suspended && (
                                    <button
                                      onClick={() => setReactivateModal({ open: true, invoice: inv, isProcessing: false })}
                                      className="px-2.5 py-1 rounded-lg bg-[#008CFF]/20 hover:bg-[#008CFF]/30 text-[#008CFF] border border-[#008CFF]/30 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      <span>🔄</span>
                                      <span>{d.bill_btn_reactivate_paid}</span>
                                    </button>
                                  )}

                                  {inv.status === "paid" && (
                                    <span className="text-[11px] text-zinc-500">
                                      {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString(locale) : "Liquidado"}
                                    </span>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* TRANSACCIONES RECIENTES DE CÓDIGOS */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0e0f17] border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>🧾</span>
              <span>{isSuperAdmin ? d.bill_tx_title_super : d.bill_tx_title_reseller}</span>
            </h3>

            {(!billingData?.recentTransactions || billingData.recentTransactions.length === 0) ? (
              <div className="text-center py-6 text-xs text-zinc-500">
                {d.bill_tx_empty}
              </div>
            ) : (
              <>
                {/* Vista móvil para transacciones */}
                <div className="md:hidden space-y-2">
                  {billingData.recentTransactions.map((tx: any) => (
                    <div key={tx.id} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-white font-mono">{tx.ref_code}</span>
                          {isSuperAdmin && <span className="text-[11px] text-zinc-400">@{tx.admin_username}</span>}
                          {tx.type === "create" ? (
                            <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 text-[10px]">{d.bill_tx_create}</span>
                          ) : tx.type === "renew" ? (
                            <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px]">{d.bill_tx_renew}</span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">{d.bill_tx_extend}</span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-1">
                          {new Date(tx.created_at).toLocaleString(locale, {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-400 font-mono text-sm block">
                          ${Number(tx.total_amount || 0).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-zinc-400">{tx.days} d</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tabla escritorio */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-zinc-400">
                        <th className="py-2.5 px-3">Fecha</th>
                        <th className="py-2.5 px-3">Clave Ref</th>
                        {isSuperAdmin && <th className="py-2.5 px-3">{d.th_admin}</th>}
                        <th className="py-2.5 px-3 text-center">Tipo</th>
                        <th className="py-2.5 px-3 text-center">Días</th>
                        <th className="py-2.5 px-3 text-right">Costo Calculado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                      {billingData.recentTransactions.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-3 text-zinc-400 font-sans">
                            {new Date(tx.created_at).toLocaleString(locale, {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-white font-bold">{tx.ref_code}</td>
                          {isSuperAdmin && <td className="py-2.5 px-3 text-zinc-300 font-sans">@{tx.admin_username}</td>}
                          <td className="py-2.5 px-3 text-center font-sans">
                            {tx.type === "create" ? (
                              <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px]">{d.bill_tx_create}</span>
                            ) : tx.type === "renew" ? (
                              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px]">{d.bill_tx_renew}</span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">{d.bill_tx_extend}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">{tx.days} d</td>
                          <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                            ${Number(tx.total_amount || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR SUSPENSIÓN POR MOROSIDAD (CORTE DE SEÑAL) */}
      {suspendModal.open && suspendModal.invoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0f17] border border-red-500/30 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 text-red-400">
              <span className="text-2xl">🛑</span>
              <h3 className="text-base font-bold text-white">
                {d.modal_suspend_title}
              </h3>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              {d.modal_suspend_desc(
                suspendModal.invoice.admin_username,
                Number(suspendModal.invoice.total_amount || 0).toFixed(2)
              )}
            </p>

            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 space-y-1">
              <strong className="block font-bold">{d.modal_suspend_warning_title}</strong>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-red-200/80">
                <li>{d.modal_suspend_li1}</li>
                <li>{d.modal_suspend_li2}</li>
                <li>{d.modal_suspend_li3}</li>
              </ul>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={suspendModal.isProcessing}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all shadow-lg shadow-red-600/20 cursor-pointer disabled:opacity-50"
              >
                {suspendModal.isProcessing ? d.modal_suspend_processing : d.modal_suspend_confirm}
              </button>
              <button
                type="button"
                onClick={() => setSuspendModal({ open: false, invoice: null, isProcessing: false })}
                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                {d.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REACTIVAR CÓDIGOS Y MARCAR PAGADO */}
      {reactivateModal.open && reactivateModal.invoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0f17] border border-emerald-500/30 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 text-emerald-400">
              <span className="text-2xl">🔄</span>
              <h3 className="text-base font-bold text-white">
                {d.modal_reactivate_title}
              </h3>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              {d.modal_reactivate_desc(
                reactivateModal.invoice.admin_username,
                Number(reactivateModal.invoice.total_amount || 0).toFixed(2)
              )}
            </p>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
              <strong className="block font-bold">{d.modal_reactivate_auto_title}</strong>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-200/80">
                <li>{d.modal_reactivate_li1}</li>
                <li>{d.modal_reactivate_li2}</li>
                <li>{d.modal_reactivate_li3}</li>
              </ul>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmReactivate}
                disabled={reactivateModal.isProcessing}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
              >
                {reactivateModal.isProcessing ? d.modal_reactivate_processing : d.modal_reactivate_confirm}
              </button>
              <button
                type="button"
                onClick={() => setReactivateModal({ open: false, invoice: null, isProcessing: false })}
                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                {d.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO ADMINISTRADOR */}
      {showCreateAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0f17] border border-white/10 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{d.modal_new_admin_title}</h3>
              <button
                onClick={() => setShowCreateAdminModal(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
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
                  {d.modal_admin_name}
                </label>
                <input
                  type="text"
                  value={newAdminUser.name}
                  onChange={(e) => setNewAdminUser({ ...newAdminUser, name: e.target.value })}
                  placeholder={d.modal_admin_name_ph}
                  required
                  className={inp}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  {d.modal_admin_user}
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
                  {d.modal_admin_user_hint}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  {d.modal_admin_pass}
                </label>
                <input
                  type="password"
                  value={newAdminUser.password}
                  onChange={(e) => setNewAdminUser({ ...newAdminUser, password: e.target.value })}
                  placeholder={d.modal_admin_pass_ph}
                  required
                  className={inp}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  {d.modal_admin_role}
                </label>
                <select
                  value={newAdminUser.role}
                  onChange={(e) =>
                    setNewAdminUser({ ...newAdminUser, role: e.target.value as any })
                  }
                  className={inp}
                >
                  <option value="admin" className="bg-[#0e0f17]">
                    {d.modal_role_admin}
                  </option>
                  <option value="superadmin" className="bg-[#0e0f17]">
                    {d.modal_role_super}
                  </option>
                </select>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#008CFF] hover:bg-[#0077db] text-white font-bold text-sm transition-all shadow-lg shadow-[#008CFF]/20 cursor-pointer"
                >
                  {d.modal_btn_create_admin}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateAdminModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-400 hover:text-white cursor-pointer"
                >
                  {d.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CAMBIAR CONTRASEÑA */}
      {showPasswordModal && targetPasswordUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0f17] border border-white/10 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {d.modal_change_pass_title(targetPasswordUser.username)}
              </h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
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
                  {d.modal_new_pass}
                </label>
                <input
                  type="password"
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  placeholder={d.modal_admin_pass_ph}
                  required
                  className={inp}
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  {d.modal_new_pass_hint}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#008CFF] hover:bg-[#0077db] text-white font-bold text-sm transition-all shadow-lg shadow-[#008CFF]/20 cursor-pointer"
                >
                  {d.modal_btn_update_pass}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-400 hover:text-white cursor-pointer"
                >
                  {d.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
