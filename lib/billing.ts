// @ts-nocheck
import { supa } from "@/lib/supa";
import { resetSessionsForCode } from "@/lib/access";

export type BillingSettings = {
  pricePerDay: number;
  cycleType: "weekly" | "monthly";
  closingDay: number; // 0 = Domingo, 1 = Lunes... o día del mes (1-31)
  currency: string;
};

export type CodeTransaction = {
  id: string;
  code_id: string;
  ref_code: string;
  admin_id: string;
  admin_username: string;
  type: "create" | "renew" | "extend";
  days: number;
  unit_price: number;
  total_amount: number;
  period_id?: string | null;
  created_at: string;
};

export type BillingPeriod = {
  id: string;
  period_type: "weekly" | "monthly";
  start_date: string;
  end_date: string;
  status: "open" | "closed";
  closed_at?: string | null;
  created_at: string;
};

export type AdminInvoice = {
  id: string;
  period_id: string;
  admin_id: string;
  admin_username: string;
  total_codes: number;
  total_days: number;
  total_amount: number;
  status: "pending" | "paid";
  is_suspended: boolean;
  paid_at?: string | null;
  notes?: string | null;
  created_at: string;
  period?: BillingPeriod;
};

// 1. Obtener ajustes financieros de la tabla config con valores por defecto seguros
export async function getBillingSettings(): Promise<BillingSettings> {
  const sb = supa();
  try {
    const { data } = await sb
      .from("config")
      .select("key, value")
      .in("key", [
        "billing_price_per_day",
        "billing_cycle_type",
        "billing_closing_day",
        "billing_currency",
      ]);

    const map = new Map<string, string>();
    (data || []).forEach((row) => map.set(row.key, row.value));

    const pricePerDay = parseFloat(map.get("billing_price_per_day") || "0.10") || 0.10;
    const cycleType = (map.get("billing_cycle_type") === "monthly" ? "monthly" : "weekly") as "weekly" | "monthly";
    const closingDay = parseInt(map.get("billing_closing_day") || "0", 10) || 0;
    const currency = map.get("billing_currency") || "$";

    return { pricePerDay, cycleType, closingDay, currency };
  } catch {
    return {
      pricePerDay: 0.10,
      cycleType: "weekly",
      closingDay: 0,
      currency: "$",
    };
  }
}

// 2. Guardar ajustes financieros
export async function updateBillingSettings(settings: Partial<BillingSettings>): Promise<BillingSettings> {
  const sb = supa();
  const current = await getBillingSettings();
  const merged: BillingSettings = {
    pricePerDay: settings.pricePerDay !== undefined ? Math.max(0.0001, settings.pricePerDay) : current.pricePerDay,
    cycleType: settings.cycleType || current.cycleType,
    closingDay: settings.closingDay !== undefined ? settings.closingDay : current.closingDay,
    currency: settings.currency || current.currency,
  };

  const rows = [
    { key: "billing_price_per_day", value: merged.pricePerDay.toString() },
    { key: "billing_cycle_type", value: merged.cycleType },
    { key: "billing_closing_day", value: merged.closingDay.toString() },
    { key: "billing_currency", value: merged.currency },
  ];

  try {
    await sb.from("config").upsert(rows);
  } catch (e) {
    console.error("[Billing] Error guardando configuración:", e);
  }

  return merged;
}

// 3. Calcular las fechas teóricas del período activo actual
export function calculatePeriodDates(cycleType: "weekly" | "monthly", closingDay: number): { startDate: Date; endDate: Date } {
  const now = new Date();

  if (cycleType === "weekly") {
    // closingDay: 0 = Domingo, 1 = Lunes, etc.
    const currentDay = now.getUTCDay();
    let daysUntilEnd = (closingDay - currentDay + 7) % 7;
    if (daysUntilEnd === 0 && now.getUTCHours() >= 23 && now.getUTCMinutes() >= 59) {
      daysUntilEnd = 7;
    }

    const endDate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysUntilEnd,
      23, 59, 59, 999
    ));

    const startDate = new Date(endDate.getTime() - 7 * 86400 * 1000 + 1);
    return { startDate, endDate };
  } else {
    // Ciclo mensual
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const targetDay = Math.min(Math.max(1, closingDay || 28), 28);

    const endDate = new Date(Date.UTC(year, month, targetDay, 23, 59, 59, 999));
    if (now > endDate) {
      endDate.setUTCMonth(endDate.getUTCMonth() + 1);
    }
    const startDate = new Date(endDate);
    startDate.setUTCMonth(startDate.getUTCMonth() - 1);
    startDate.setUTCMilliseconds(startDate.getUTCMilliseconds() + 1);
    return { startDate, endDate };
  }
}

// 4. Obtener o crear el período de facturación abierto actual
export async function getOrCreateCurrentPeriod(): Promise<BillingPeriod | null> {
  const sb = supa();
  try {
    const { data: openPeriod } = await sb
      .from("billing_periods")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (openPeriod) return openPeriod as BillingPeriod;

    // Si no hay período abierto, creamos el inicial
    const settings = await getBillingSettings();
    const { startDate, endDate } = calculatePeriodDates(settings.cycleType, settings.closingDay);

    const { data: newPeriod, error } = await sb
      .from("billing_periods")
      .insert({
        period_type: settings.cycleType,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: "open",
      })
      .select("*")
      .single();

    if (error) throw error;
    return newPeriod as BillingPeriod;
  } catch (e) {
    // Si la tabla no existe aún en Supabase, manejamos con degradación limpia
    return null;
  }
}

// 5. Registrar una transacción contable inmutable por venta o renovación
export async function recordCodeTransaction(params: {
  codeId: string;
  refCode: string;
  adminId?: string | null;
  adminUsername: string;
  type: "create" | "renew" | "extend";
  days: number;
}): Promise<boolean> {
  const sb = supa();
  try {
    const settings = await getBillingSettings();
    const currentPeriod = await getOrCreateCurrentPeriod();

    const unitPrice = settings.pricePerDay;
    const totalAmount = Number((params.days * unitPrice).toFixed(2));

    const { error } = await sb.from("code_transactions").insert({
      code_id: params.codeId,
      ref_code: params.refCode,
      admin_id: params.adminId || null,
      admin_username: params.adminUsername || "admin",
      type: params.type,
      days: params.days,
      unit_price: unitPrice,
      total_amount: totalAmount,
      period_id: currentPeriod?.id || null,
    });

    if (error) {
      console.warn("[Billing] No se pudo guardar la transacción en Supabase:", error.message);
      return false;
    }

    // Actualizar el último período en la clave de acceso si existe la columna
    if (currentPeriod?.id) {
      await sb
        .from("access_codes")
        .update({ last_billing_period_id: currentPeriod.id })
        .eq("id", params.codeId);
    }

    return true;
  } catch (err: any) {
    console.warn("[Billing] Fallback: tabla code_transactions aún no disponible:", err?.message);
    return false;
  }
}

// 6. Obtener resumen de facturación y finanzas (según rol superadmin o subadmin)
export async function getBillingSummary(adminUser: { id: string; username: string; role: string }) {
  const sb = supa();
  const settings = await getBillingSettings();
  const currentPeriod = await getOrCreateCurrentPeriod();
  const isSuperAdmin = adminUser.role === "superadmin";

  let transactions: any[] = [];
  let invoices: any[] = [];
  let periods: any[] = [];
  let adminUsersList: any[] = [];

  try {
    // Cargar períodos
    const { data: periodsData } = await sb
      .from("billing_periods")
      .select("*")
      .order("start_date", { ascending: false });
    if (periodsData) periods = periodsData;
  } catch {}

  try {
    // Cargar facturas/liquidaciones
    let invQuery = sb.from("admin_invoices").select("*, billing_periods(*)");
    if (!isSuperAdmin) {
      invQuery = invQuery.eq("admin_id", adminUser.id);
    }
    const { data: invData } = await invQuery.order("created_at", { ascending: false });
    if (invData) invoices = invData;
  } catch {}

  try {
    // Cargar transacciones del período actual o recientes
    let txQuery = sb.from("code_transactions").select("*");
    if (!isSuperAdmin) {
      txQuery = txQuery.or(`admin_id.eq.${adminUser.id},admin_username.eq.${adminUser.username}`);
    }
    const { data: txData } = await txQuery.order("created_at", { ascending: false }).limit(200);
    if (txData) transactions = txData;
  } catch {}

  if (isSuperAdmin) {
    try {
      const { data: uData } = await sb.from("admin_users").select("id,username,name,role,is_active");
      if (uData) adminUsersList = uData;
    } catch {}
  }

  // Si code_transactions no tiene registros (por ejemplo antes de ejecutar la migración),
  // calculamos una estimación a partir de access_codes para no mostrar valores en cero
  if (transactions.length === 0) {
    try {
      let codeQuery = sb.from("access_codes").select("id,ref_code,label,created_at,expires_at,created_by,creator_username");
      if (!isSuperAdmin) {
        codeQuery = codeQuery.or(`created_by.eq.${adminUser.id},creator_username.eq.${adminUser.username}`);
      }
      const { data: cData } = await codeQuery.order("created_at", { ascending: false });
      if (cData && cData.length > 0) {
        transactions = cData.map((c: any) => {
          const start = new Date(c.created_at).getTime();
          const end = new Date(c.expires_at).getTime();
          const days = Math.max(1, Math.round((end - start) / (86400 * 1000)));
          const totalAmount = Number((days * settings.pricePerDay).toFixed(2));
          return {
            id: c.id,
            code_id: c.id,
            ref_code: c.ref_code,
            admin_id: c.created_by || adminUser.id,
            admin_username: c.creator_username || "admin",
            type: "create",
            days,
            unit_price: settings.pricePerDay,
            total_amount: totalAmount,
            created_at: c.created_at,
          };
        });
      }
    } catch {}
  }

  // Filtrar transacciones del ciclo actual (si hay período abierto)
  const currentPeriodStart = currentPeriod ? new Date(currentPeriod.start_date).getTime() : 0;
  const currentCycleTxs = transactions.filter((t) => {
    if (t.period_id && currentPeriod) return t.period_id === currentPeriod.id;
    return new Date(t.created_at).getTime() >= currentPeriodStart;
  });

  // Cálculo de deuda del ciclo actual por admin
  const currentDebtByAdmin: Record<string, {
    adminId: string;
    username: string;
    name: string;
    codesCount: number;
    totalDays: number;
    totalAmount: number;
  }> = {};

  for (const tx of currentCycleTxs) {
    const usr = (tx.admin_username || "admin").toLowerCase();
    if (!currentDebtByAdmin[usr]) {
      const match = adminUsersList.find((u) => u.username.toLowerCase() === usr);
      currentDebtByAdmin[usr] = {
        adminId: tx.admin_id || match?.id || "",
        username: tx.admin_username,
        name: match?.name || tx.admin_username,
        codesCount: 0,
        totalDays: 0,
        totalAmount: 0,
      };
    }
    currentDebtByAdmin[usr].codesCount++;
    currentDebtByAdmin[usr].totalDays += Number(tx.days) || 0;
    currentDebtByAdmin[usr].totalAmount = Number(
      (currentDebtByAdmin[usr].totalAmount + (Number(tx.total_amount) || 0)).toFixed(2)
    );
  }

  // KPIs globales para el Superadmin
  const currentCycleTotal = Object.values(currentDebtByAdmin).reduce((acc, a) => acc + a.totalAmount, 0);
  const pendingInvoices = invoices.filter((i) => i.status === "pending");
  const pendingDebtTotal = pendingInvoices.reduce((acc, i) => acc + (Number(i.total_amount) || 0), 0);
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const paidTotal = paidInvoices.reduce((acc, i) => acc + (Number(i.total_amount) || 0), 0);
  const suspendedAdminsCount = invoices.filter((i) => i.is_suspended).length;

  // Si es subadmin, obtener su balance específico
  const myCurrentBalance = Object.values(currentDebtByAdmin).find(
    (a) => a.username.toLowerCase() === adminUser.username.toLowerCase() || (adminUser.id && a.adminId === adminUser.id)
  ) || {
    adminId: adminUser.id,
    username: adminUser.username,
    name: adminUser.username,
    codesCount: 0,
    totalDays: 0,
    totalAmount: 0,
  };

  return {
    settings,
    currentPeriod,
    isSuperAdmin,
    kpis: {
      currentCycleTotal: Number(currentCycleTotal.toFixed(2)),
      pendingDebtTotal: Number(pendingDebtTotal.toFixed(2)),
      paidTotal: Number(paidTotal.toFixed(2)),
      suspendedAdminsCount,
      myCurrentBalance,
    },
    currentDebtByAdmin: Object.values(currentDebtByAdmin),
    invoices,
    periods,
    recentTransactions: transactions.slice(0, 50),
  };
}

// 7. Ejecutar cierre del período actual y generar las facturas por administrador
export async function executePeriodClose(superAdmin: { id: string; username: string }, notes = "") {
  const sb = supa();
  const settings = await getBillingSettings();
  const currentPeriod = await getOrCreateCurrentPeriod();

  if (!currentPeriod) {
    throw new Error("No se pudo obtener el período abierto para cerrar.");
  }

  const periodId = currentPeriod.id;
  const nowStr = new Date().toISOString();

  // 1. Obtener todas las transacciones vinculadas a este período
  let txs: any[] = [];
  try {
    const { data } = await sb
      .from("code_transactions")
      .select("*")
      .or(`period_id.eq.${periodId},created_at.gte.${currentPeriod.start_date}`);
    if (data) txs = data;
  } catch {}

  // 2. Agrupar totales por administrador
  const grouped: Record<string, {
    adminId: string;
    username: string;
    totalCodes: number;
    totalDays: number;
    totalAmount: number;
  }> = {};

  for (const t of txs) {
    const usr = (t.admin_username || "admin").toLowerCase();
    if (!grouped[usr]) {
      grouped[usr] = {
        adminId: t.admin_id || "",
        username: t.admin_username,
        totalCodes: 0,
        totalDays: 0,
        totalAmount: 0,
      };
    }
    grouped[usr].totalCodes++;
    grouped[usr].totalDays += Number(t.days) || 0;
    grouped[usr].totalAmount = Number(
      (grouped[usr].totalAmount + (Number(t.total_amount) || 0)).toFixed(2)
    );
  }

  // 3. Generar una factura para cada administrador con ventas en el ciclo
  const invoicesToInsert = Object.values(grouped).map((g) => ({
    period_id: periodId,
    admin_id: g.adminId || null,
    admin_username: g.username,
    total_codes: g.totalCodes,
    total_days: g.totalDays,
    total_amount: g.totalAmount,
    status: "pending",
    is_suspended: false,
    notes: notes || `Cierre ${settings.cycleType} al ${new Date().toLocaleDateString("es-ES")}`,
  }));

  if (invoicesToInsert.length > 0) {
    const { error: invErr } = await sb.from("admin_invoices").insert(invoicesToInsert);
    if (invErr) console.error("[Billing] Error insertando facturas:", invErr.message);
  }

  // 4. Cerrar el período actual
  await sb
    .from("billing_periods")
    .update({
      status: "closed",
      closed_at: nowStr,
    })
    .eq("id", periodId);

  // 5. Crear el nuevo período abierto subsiguiente
  const nextDates = calculatePeriodDates(settings.cycleType, settings.closingDay);
  const { data: newPeriod } = await sb
    .from("billing_periods")
    .insert({
      period_type: settings.cycleType,
      start_date: nowStr,
      end_date: nextDates.endDate.toISOString(),
      status: "open",
    })
    .select("*")
    .single();

  return {
    ok: true,
    closedPeriodId: periodId,
    invoicesCount: invoicesToInsert.length,
    newPeriodId: newPeriod?.id,
  };
}

// 8. Suspender códigos por falta de pago (morosidad) y purgar sesiones
export async function suspendPeriodCodesForAdmin(invoiceId: string) {
  const sb = supa();

  // 1. Obtener la factura
  const { data: invoice, error: invErr } = await sb
    .from("admin_invoices")
    .select("*, billing_periods(*)")
    .eq("id", invoiceId)
    .single();

  if (invErr || !invoice) {
    throw new Error("Factura no encontrada.");
  }

  const adminId = invoice.admin_id;
  const adminUsername = invoice.admin_username;
  const period = invoice.billing_periods;
  const periodStart = period?.start_date || invoice.created_at;
  const periodEnd = period?.end_date || new Date().toISOString();

  // 2. Localizar códigos generados o renovados por este admin en el período
  let codeIdsToSuspend: string[] = [];

  // Buscar por transacciones del período
  try {
    const { data: txs } = await sb
      .from("code_transactions")
      .select("code_id")
      .eq("admin_username", adminUsername)
      .gte("created_at", periodStart)
      .lte("created_at", periodEnd);

    if (txs && txs.length > 0) {
      codeIdsToSuspend = txs.map((t) => t.code_id).filter(Boolean);
    }
  } catch {}

  // Si no se encontraron por transacciones, buscar por access_codes directamente
  if (codeIdsToSuspend.length === 0) {
    try {
      let q = sb
        .from("access_codes")
        .select("id")
        .gte("created_at", periodStart)
        .lte("created_at", periodEnd);

      if (adminId) {
        q = q.eq("created_by", adminId);
      } else {
        q = q.eq("creator_username", adminUsername);
      }
      const { data: codes } = await q;
      if (codes) codeIdsToSuspend = codes.map((c) => c.id);
    } catch {}
  }

  // 3. Suspender las claves: revoked = true, suspended_by_billing = true
  let suspendedCount = 0;
  if (codeIdsToSuspend.length > 0) {
    const { error: updErr } = await sb
      .from("access_codes")
      .update({
        revoked: true,
        suspended_by_billing: true,
      })
      .in("id", codeIdsToSuspend);

    if (!updErr) {
      suspendedCount = codeIdsToSuspend.length;
    }

    // 4. Purgar las sesiones activas en dispositivos clientes para cortar la señal en vivo
    for (const cId of codeIdsToSuspend) {
      await resetSessionsForCode(cId);
    }
  }

  // 5. Marcar la factura como suspendida
  await sb
    .from("admin_invoices")
    .update({ is_suspended: true })
    .eq("id", invoiceId);

  return { ok: true, suspendedCount, totalCodes: codeIdsToSuspend.length };
}

// 9. Reactivar códigos tras registrar el pago del período
export async function reactivatePeriodCodesForAdmin(invoiceId: string) {
  const sb = supa();

  // 1. Obtener la factura
  const { data: invoice, error: invErr } = await sb
    .from("admin_invoices")
    .select("*, billing_periods(*)")
    .eq("id", invoiceId)
    .single();

  if (invErr || !invoice) {
    throw new Error("Factura no encontrada.");
  }

  const adminId = invoice.admin_id;
  const adminUsername = invoice.admin_username;
  const now = new Date().toISOString();

  // 2. Localizar códigos marcados como suspended_by_billing = true para este admin
  // que sigan teniendo vigencia (expires_at > now)
  let q = sb
    .from("access_codes")
    .select("id, expires_at")
    .eq("suspended_by_billing", true)
    .gt("expires_at", now);

  if (adminId) {
    q = q.eq("created_by", adminId);
  } else {
    q = q.eq("creator_username", adminUsername);
  }

  const { data: codesToReactivate } = await q;
  let reactivatedCount = 0;

  if (codesToReactivate && codesToReactivate.length > 0) {
    const ids = codesToReactivate.map((c) => c.id);
    const { error: reactErr } = await sb
      .from("access_codes")
      .update({
        revoked: false,
        suspended_by_billing: false,
      })
      .in("id", ids);

    if (!reactErr) {
      reactivatedCount = ids.length;
    }
  }

  // 3. Marcar la factura como pagada y no suspendida
  await sb
    .from("admin_invoices")
    .update({
      status: "paid",
      is_suspended: false,
      paid_at: now,
    })
    .eq("id", invoiceId);

  return { ok: true, reactivatedCount };
}
