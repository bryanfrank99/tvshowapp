// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { needAdmin, getAdminUser, needSuperAdmin } from "@/lib/access";
import {
  getBillingSummary,
  updateBillingSettings,
  executePeriodClose,
  suspendPeriodCodesForAdmin,
  reactivatePeriodCodesForAdmin,
} from "@/lib/billing";
import { supa } from "@/lib/supa";

// GET: Resumen de facturación, tarifas y balances según el rol (superadmin o subadmin)
export async function GET(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;

  const currentAdmin = await getAdminUser(req);
  if (!currentAdmin) return NextResponse.json({ error: "admin" }, { status: 403 });

  try {
    const summary = await getBillingSummary(currentAdmin);
    return NextResponse.json(summary);
  } catch (err: any) {
    console.error("[API Billing] Error obteniendo resumen:", err);
    return NextResponse.json({ error: "server", message: err.message }, { status: 500 });
  }
}

// POST: Acciones financieras (ajustes, cierre de período, corte por morosidad, reactivación)
export async function POST(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;

  const currentAdmin = await getAdminUser(req);
  if (!currentAdmin) return NextResponse.json({ error: "admin" }, { status: 403 });

  const isSuperAdmin = currentAdmin.role === "superadmin";

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const action = body.action;

  // 1. Actualizar tarifas y ciclo (solo Super Admin)
  if (action === "update_settings") {
    if (!isSuperAdmin) {
      return NextResponse.json({ error: "forbidden", message: "Solo el Super Admin puede cambiar tarifas." }, { status: 403 });
    }
    const updated = await updateBillingSettings(body.settings || {});
    return NextResponse.json({ ok: true, settings: updated });
  }

  // 2. Ejecutar cierre de período (solo Super Admin)
  if (action === "close_period") {
    if (!isSuperAdmin) {
      return NextResponse.json({ error: "forbidden", message: "Solo el Super Admin puede ejecutar cierres." }, { status: 403 });
    }
    try {
      const res = await executePeriodClose(currentAdmin, body.notes);
      return NextResponse.json(res);
    } catch (err: any) {
      return NextResponse.json({ error: "close_failed", message: err.message }, { status: 500 });
    }
  }

  // 3. Suspender códigos por falta de pago (solo Super Admin)
  if (action === "suspend_codes") {
    if (!isSuperAdmin) {
      return NextResponse.json({ error: "forbidden", message: "Solo el Super Admin puede suspender códigos." }, { status: 403 });
    }
    const invoiceId = body.invoiceId;
    if (!invoiceId) return NextResponse.json({ error: "missing_invoice_id" }, { status: 400 });

    try {
      const res = await suspendPeriodCodesForAdmin(invoiceId);
      return NextResponse.json(res);
    } catch (err: any) {
      return NextResponse.json({ error: "suspend_failed", message: err.message }, { status: 500 });
    }
  }

  // 4. Reactivar códigos tras recibir pago (solo Super Admin)
  if (action === "reactivate_codes") {
    if (!isSuperAdmin) {
      return NextResponse.json({ error: "forbidden", message: "Solo el Super Admin puede reactivar códigos." }, { status: 403 });
    }
    const invoiceId = body.invoiceId;
    if (!invoiceId) return NextResponse.json({ error: "missing_invoice_id" }, { status: 400 });

    try {
      const res = await reactivatePeriodCodesForAdmin(invoiceId);
      return NextResponse.json(res);
    } catch (err: any) {
      return NextResponse.json({ error: "reactivate_failed", message: err.message }, { status: 500 });
    }
  }

  // 5. Marcar factura como pagada (y opcionalmente reactivar si estaba suspendida)
  if (action === "mark_paid") {
    if (!isSuperAdmin) {
      return NextResponse.json({ error: "forbidden", message: "Solo el Super Admin puede registrar pagos." }, { status: 403 });
    }
    const invoiceId = body.invoiceId;
    if (!invoiceId) return NextResponse.json({ error: "missing_invoice_id" }, { status: 400 });

    try {
      // Reactivar si estaba suspendida y marcar como pagada
      const res = await reactivatePeriodCodesForAdmin(invoiceId);
      return NextResponse.json({ ok: true, invoiceId, reactivatedCount: res.reactivatedCount });
    } catch (err: any) {
      // Si falla reactivar pero queremos asegurar estado pagado
      try {
        await supa()
          .from("admin_invoices")
          .update({ status: "paid", paid_at: new Date().toISOString(), is_suspended: false })
          .eq("id", invoiceId);
        return NextResponse.json({ ok: true, invoiceId });
      } catch (dbErr: any) {
        return NextResponse.json({ error: "db", message: dbErr.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
