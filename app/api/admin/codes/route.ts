// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/supa";
import { needAdmin, sha, newRef, resetSessionsForCode, MAX_DEVICES_PER_CODE } from "@/lib/access";
import { randomBytes } from "crypto";

const newCode = () => randomBytes(4).toString("hex").toUpperCase(); // 8 chars

// GET lista + KPIs · POST {label, days} crea · PATCH {id, renewed/extended/revoked} · DELETE ?id= ó ?resetSessions=id
export async function GET(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;

  const { data: rawCodes, error } = await supa()
    .from("access_codes")
    .select("id,label,ref_code,expires_at,revoked,created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "db" }, { status: 500 });

  const codes = rawCodes || [];

  // Obtener sesiones para enriquecer los códigos con info de dispositivos y última conexión
  let sessions: any[] = [];
  try {
    const { data: sessData, error: sessErr } = await supa()
      .from("sessions")
      .select("token_hash,code_id,device_hint,last_seen_at,created_at");
    if (!sessErr && sessData) {
      sessions = sessData;
    } else {
      const { data: baseSess } = await supa()
        .from("sessions")
        .select("token_hash,code_id,created_at");
      if (baseSess) sessions = baseSess;
    }
  } catch {
    try {
      const { data: baseSess } = await supa()
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

  const now = Date.now();
  const sevenDaysMs = 7 * 86400 * 1000;
  let activeCodes = 0;
  let expiringSoon = 0;
  let revokedCodes = 0;
  let expiredCodes = 0;
  let fullCapacityCodes = 0;

  const enrichedCodes = codes.map((c) => {
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
      deviceCount,
      maxDevices: MAX_DEVICES_PER_CODE,
      lastSeen,
      devices,
    };
  });

  const kpis = {
    totalCodes: codes.length,
    activeCodes,
    expiringSoon,
    totalDevices: sessions.length,
    revokedCodes,
    expiredCodes,
    fullCapacityCodes,
    maxDevicesPerCode: MAX_DEVICES_PER_CODE,
  };

  return NextResponse.json({ codes: enrichedCodes, kpis });
}

export async function POST(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;
  let body: any = {};
  try { body = await req.json(); } catch {}
  const days = Math.max(1, Math.min(3650, Number(body.days) || 30));
  const code = newCode();
  const ref_code = newRef();
  const expires_at = new Date(Date.now() + days * 86400 * 1000).toISOString();
  const { error } = await supa().from("access_codes").insert({
    code_hash: sha(code),
    ref_code,
    label: String(body.label || ""),
    expires_at,
  });
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  // Se muestra UNA vez: el hash es irreversible.
  return NextResponse.json({ code, ref_code, expires_at });
}

export async function PATCH(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;
  let body: any = {};
  try { body = await req.json(); } catch {}
  if (!body.id) return NextResponse.json({ error: "params" }, { status: 400 });
  if (body.renew) {
    const days = Math.max(1, Math.min(3650, Number(body.days) || 30));
    const code = newCode();
    const ref_code = newRef();
    const expires_at = new Date(Date.now() + days * 86400 * 1000).toISOString();
    const { error } = await supa().from("access_codes").update({ code_hash: sha(code), ref_code, expires_at, revoked: false }).eq("id", body.id);
    if (error) return NextResponse.json({ error: "db" }, { status: 500 });
    return NextResponse.json({ code, ref_code, expires_at });
  }
  if (body.extendDays) {
    const days = Math.max(1, Math.min(3650, Number(body.extendDays) || 30));
    const { data } = await supa().from("access_codes").select("expires_at").eq("id", body.id).maybeSingle();
    const base = data?.expires_at ? new Date(data.expires_at).getTime() : Date.now();
    const expires_at = new Date(Math.max(base, Date.now()) + days * 86400 * 1000).toISOString();
    const { error } = await supa().from("access_codes").update({ expires_at, revoked: false }).eq("id", body.id);
    if (error) return NextResponse.json({ error: "db" }, { status: 500 });
    return NextResponse.json({ ok: true, expires_at });
  }
  const { error } = await supa().from("access_codes").update({ revoked: !!body.revoked }).eq("id", body.id);
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;

  // Si se solicita desvincular sesiones
  const resetId = req.nextUrl.searchParams.get("resetSessions");
  if (resetId) {
    const ok = await resetSessionsForCode(resetId);
    if (!ok) return NextResponse.json({ error: "db" }, { status: 500 });
    return NextResponse.json({ ok: true, reset: true });
  }

  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "params" }, { status: 400 });

  // Limpiar sesiones antes de borrar el código
  await resetSessionsForCode(id);

  const { error } = await supa().from("access_codes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  return NextResponse.json({ ok: true });
}




