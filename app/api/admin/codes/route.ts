// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/supa";
import {
  needAdmin,
  getAdminUser,
  sha,
  newRef,
  resetSessionsForCode,
  MAX_DEVICES_PER_CODE,
} from "@/lib/access";
import { randomBytes } from "crypto";

const newCode = () => randomBytes(4).toString("hex").toUpperCase(); // 8 chars

// GET lista + KPIs · POST {label, days} crea · PATCH {id, renewed/extended/revoked} · DELETE ?id= ó ?resetSessions=id
export async function GET(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;

  const currentAdmin = await getAdminUser(req);
  if (!currentAdmin) return NextResponse.json({ error: "admin" }, { status: 403 });

  const isSuperAdmin = currentAdmin.role === "superadmin";
  const filterAdmin = req.nextUrl.searchParams.get("admin") || "all";

  const sb = supa();

  // 1. Obtener claves de acceso con columnas de creador (con fallback defensivo)
  let rawCodes: any[] = [];
  try {
    const { data, error } = await sb
      .from("access_codes")
      .select("id,label,ref_code,expires_at,revoked,created_at,created_by,creator_username")
      .order("created_at", { ascending: false });

    if (!error && data) {
      rawCodes = data;
    } else {
      throw error;
    }
  } catch {
    const { data: baseData, error: baseErr } = await sb
      .from("access_codes")
      .select("id,label,ref_code,expires_at,revoked,created_at")
      .order("created_at", { ascending: false });

    if (baseErr) return NextResponse.json({ error: "db" }, { status: 500 });
    rawCodes = (baseData || []).map((c) => ({
      ...c,
      creator_username: "admin",
    }));
  }

  // 2. Obtener sesiones para dispositivos
  let sessions: any[] = [];
  try {
    const { data: sessData, error: sessErr } = await sb
      .from("sessions")
      .select("token_hash,code_id,device_hint,last_seen_at,created_at");
    if (!sessErr && sessData) {
      sessions = sessData;
    } else {
      const { data: baseSess } = await sb
        .from("sessions")
        .select("token_hash,code_id,created_at");
      if (baseSess) sessions = baseSess;
    }
  } catch {
    try {
      const { data: baseSess } = await sb
        .from("sessions")
        .select("token_hash,code_id,created_at");
      if (baseSess) sessions = baseSess;
    } catch {}
  }

  const sessionsByCode = new Map<string, any[]>();
  for (const s of sessions) {
    if (!s.code_id) continue;
    const arr = sessionsByCode.get(s.code_id) || [];
    arr.push(s);
    sessionsByCode.set(s.code_id, arr);
  }

  // 3. Si es Super Admin, calcular desglose por administrador para toda la plataforma
  const adminsSummary: Record<string, { total: number; active: number; expired: number }> = {};
  const now = Date.now();
  const sevenDaysMs = 7 * 86400 * 1000;

  for (const c of rawCodes) {
    const creator = (c.creator_username || "admin").toLowerCase();
    if (!adminsSummary[creator]) {
      adminsSummary[creator] = { total: 0, active: 0, expired: 0 };
    }
    adminsSummary[creator].total++;
    const isExp = new Date(c.expires_at).getTime() <= now;
    if (!c.revoked && !isExp) {
      adminsSummary[creator].active++;
    } else if (isExp && !c.revoked) {
      adminsSummary[creator].expired++;
    }
  }

  // 4. Filtrar claves según rol y permisos:
  // - Si es Sub-admin: SÓLO ve sus propias claves
  // - Si es Super Admin: ve todas, o las filtra según query param ?admin=
  let visibleCodes = rawCodes;
  if (!isSuperAdmin) {
    visibleCodes = rawCodes.filter((c) => {
      if (c.created_by && c.created_by === currentAdmin.id) return true;
      if (c.creator_username && c.creator_username.toLowerCase() === currentAdmin.username.toLowerCase()) return true;
      return false;
    });
  } else if (filterAdmin && filterAdmin !== "all") {
    visibleCodes = rawCodes.filter(
      (c) => (c.creator_username || "admin").toLowerCase() === filterAdmin.toLowerCase()
    );
  }

  let activeCodes = 0;
  let expiringSoon = 0;
  let revokedCodes = 0;
  let expiredCodes = 0;
  let fullCapacityCodes = 0;

  const enrichedCodes = visibleCodes.map((c) => {
    const sList = sessionsByCode.get(c.id) || [];
    sList.sort((a, b) => {
      const ta = new Date(a.last_seen_at || a.created_at || 0).getTime();
      const tb = new Date(b.last_seen_at || b.created_at || 0).getTime();
      return tb - ta;
    });

    const deviceCount = sList.length;
    const lastSeen = sList[0]?.last_seen_at || sList[0]?.created_at || null;
    const devices = sList.map((s) => ({
      hint: s.device_hint || "Dispositivo",
      lastSeen: s.last_seen_at || s.created_at,
      createdAt: s.created_at,
    }));

    const expTime = new Date(c.expires_at).getTime();
    const isExpired = expTime <= now;

    if (c.revoked) {
      revokedCodes++;
    } else if (isExpired) {
      expiredCodes++;
    } else {
      activeCodes++;
      if (expTime - now <= sevenDaysMs) {
        expiringSoon++;
      }
    }

    if (deviceCount >= MAX_DEVICES_PER_CODE) {
      fullCapacityCodes++;
    }

    return {
      ...c,
      creator_username: c.creator_username || "admin",
      deviceCount,
      maxDevices: MAX_DEVICES_PER_CODE,
      lastSeen,
      devices,
    };
  });

  const kpis = {
    totalCodes: visibleCodes.length,
    activeCodes,
    expiringSoon,
    totalDevices: visibleCodes.reduce((acc, c) => acc + (sessionsByCode.get(c.id)?.length || 0), 0),
    revokedCodes,
    expiredCodes,
    fullCapacityCodes,
    maxDevicesPerCode: MAX_DEVICES_PER_CODE,
  };

  return NextResponse.json({
    codes: enrichedCodes,
    kpis,
    isSuperAdmin,
    adminsSummary: isSuperAdmin ? adminsSummary : null,
    currentAdmin: {
      id: currentAdmin.id,
      username: currentAdmin.username,
      name: currentAdmin.name,
      role: currentAdmin.role,
    },
  });
}

// POST: Crea una nueva clave asignando created_by al admin actual
export async function POST(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;

  const currentAdmin = await getAdminUser(req);
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const days = Math.max(1, Math.min(3650, Number(body.days) || 30));
  const code = newCode();
  const ref_code = newRef();
  const expires_at = new Date(Date.now() + days * 86400 * 1000).toISOString();

  const insertPayload = {
    code_hash: sha(code),
    ref_code,
    label: String(body.label || ""),
    expires_at,
    created_by: currentAdmin?.id || null,
    creator_username: currentAdmin?.username || "admin",
  };

  const sb = supa();

  try {
    const { error } = await sb.from("access_codes").insert(insertPayload);
    if (error) throw error;
  } catch (err: any) {
    // Fallback si la tabla aún no tiene las columnas created_by/creator_username
    try {
      const { error: baseError } = await sb.from("access_codes").insert({
        code_hash: sha(code),
        ref_code,
        label: String(body.label || ""),
        expires_at,
      });
      if (baseError) throw baseError;
    } catch (fallbackErr: any) {
      return NextResponse.json({ error: "db", message: fallbackErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    code,
    ref_code,
    expires_at,
    creator_username: currentAdmin?.username || "admin",
  });
}

// PATCH: Modifica, renueva o extiende una clave (validando permisos si es sub-admin)
export async function PATCH(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;

  const currentAdmin = await getAdminUser(req);
  const isSuperAdmin = currentAdmin?.role === "superadmin";

  let body: any = {};
  try {
    body = await req.json();
  } catch {}
  if (!body.id) return NextResponse.json({ error: "params" }, { status: 400 });

  const sb = supa();

  // Si no es Super Admin, validar que la clave le pertenezca al admin que hace la petición
  if (!isSuperAdmin) {
    try {
      const { data: codeData } = await sb
        .from("access_codes")
        .select("created_by,creator_username")
        .eq("id", body.id)
        .maybeSingle();

      if (codeData) {
        const isOwner =
          (codeData.created_by && codeData.created_by === currentAdmin?.id) ||
          (codeData.creator_username &&
            codeData.creator_username.toLowerCase() === currentAdmin?.username?.toLowerCase());
        if (!isOwner) {
          return NextResponse.json(
            { error: "forbidden", message: "No tienes permiso para modificar claves de otro administrador." },
            { status: 403 }
          );
        }
      }
    } catch {}
  }

  if (body.renew) {
    const days = Math.max(1, Math.min(3650, Number(body.days) || 30));
    const code = newCode();
    const ref_code = newRef();
    const expires_at = new Date(Date.now() + days * 86400 * 1000).toISOString();
    const { error } = await sb
      .from("access_codes")
      .update({ code_hash: sha(code), ref_code, expires_at, revoked: false })
      .eq("id", body.id);
    if (error) return NextResponse.json({ error: "db" }, { status: 500 });
    return NextResponse.json({ code, ref_code, expires_at });
  }

  if (body.extendDays) {
    const days = Math.max(1, Math.min(3650, Number(body.extendDays) || 30));
    const { data } = await sb.from("access_codes").select("expires_at").eq("id", body.id).maybeSingle();
    const base = data?.expires_at ? new Date(data.expires_at).getTime() : Date.now();
    const expires_at = new Date(Math.max(base, Date.now()) + days * 86400 * 1000).toISOString();
    const { error } = await sb.from("access_codes").update({ expires_at, revoked: false }).eq("id", body.id);
    if (error) return NextResponse.json({ error: "db" }, { status: 500 });
    return NextResponse.json({ ok: true, expires_at });
  }

  const { error } = await sb.from("access_codes").update({ revoked: !!body.revoked }).eq("id", body.id);
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE: Elimina una clave o desvincula sesiones (validando permisos si es sub-admin)
export async function DELETE(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;

  const currentAdmin = await getAdminUser(req);
  const isSuperAdmin = currentAdmin?.role === "superadmin";
  const sb = supa();

  // Si se solicita desvincular sesiones
  const resetId = req.nextUrl.searchParams.get("resetSessions");
  if (resetId) {
    if (!isSuperAdmin) {
      try {
        const { data: codeData } = await sb
          .from("access_codes")
          .select("created_by,creator_username")
          .eq("id", resetId)
          .maybeSingle();

        if (codeData) {
          const isOwner =
            (codeData.created_by && codeData.created_by === currentAdmin?.id) ||
            (codeData.creator_username &&
              codeData.creator_username.toLowerCase() === currentAdmin?.username?.toLowerCase());
          if (!isOwner) {
            return NextResponse.json(
              { error: "forbidden", message: "No tienes permiso para modificar claves de otro administrador." },
              { status: 403 }
            );
          }
        }
      } catch {}
    }

    const ok = await resetSessionsForCode(resetId);
    if (!ok) return NextResponse.json({ error: "db" }, { status: 500 });
    return NextResponse.json({ ok: true, reset: true });
  }

  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "params" }, { status: 400 });

  if (!isSuperAdmin) {
    try {
      const { data: codeData } = await sb
        .from("access_codes")
        .select("created_by,creator_username")
        .eq("id", id)
        .maybeSingle();

      if (codeData) {
        const isOwner =
          (codeData.created_by && codeData.created_by === currentAdmin?.id) ||
          (codeData.creator_username &&
            codeData.creator_username.toLowerCase() === currentAdmin?.username?.toLowerCase());
        if (!isOwner) {
          return NextResponse.json(
            { error: "forbidden", message: "No tienes permiso para eliminar claves de otro administrador." },
            { status: 403 }
          );
        }
      }
    } catch {}
  }

  // Limpiar sesiones antes de borrar el código
  await resetSessionsForCode(id);

  const { error } = await sb.from("access_codes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
