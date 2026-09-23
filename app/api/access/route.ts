// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import {
  validateCode,
  findCodeByHash,
  createSession,
  destroySession,
  rateOk,
  SESSION_COOKIE,
  sessionCookieOpts,
  checkSession,
  parseDeviceHint,
  checkDeviceEligibility,
  bindDeviceToCode,
} from "@/lib/access";

function ip(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

// GET verifica sesión existente (para re-auth silencioso).
export async function GET(req: NextRequest) {
  const sess = await checkSession(req.cookies.get(SESSION_COOKIE)?.value).catch(() => null);
  if (!sess) return NextResponse.json({ ok: false, error: "locked" }, { status: 401 });
  return NextResponse.json({ ok: true });
}

// POST {code, deviceId, deviceHint} → crea sesión. DELETE → cierra sesión.
export async function POST(req: NextRequest) {
  if (!rateOk(ip(req))) return NextResponse.json({ error: "rate" }, { status: 429 });
  let code = "";
  let clientDeviceId = "";
  let clientDeviceHint = "";

  try {
    const body = await req.json();
    code = String(body.code || "");
    clientDeviceId = String(body.deviceId || "");
    clientDeviceHint = String(body.deviceHint || "");
  } catch {}

  // Si no viene en el body, intentar leer de la cookie tvdev
  const deviceId = (clientDeviceId || req.cookies.get("tvdev")?.value || "").trim().toUpperCase();

  if (!code.trim()) return NextResponse.json({ error: "empty" }, { status: 400 });

  try {
    const row = await validateCode(code);
    if (!row) {
      const hit = await findCodeByHash(code);
      if (hit) {
        const exp = new Date(hit.expires_at).getTime() <= Date.now();
        return NextResponse.json({ error: hit.revoked ? "revoked" : exp ? "expired" : "invalid", ref_code: hit.ref_code }, { status: 401 });
      }
      return NextResponse.json({ error: "invalid" }, { status: 401 });
    }

    // Control Anti-Reúso: Comprobar si el dispositivo ya está vinculado a otra clave inactiva/vencida
    if (deviceId) {
      const eligibility = await checkDeviceEligibility(deviceId, row.id);
      if (!eligibility.eligible) {
        return NextResponse.json(
          {
            ok: false,
            error: "device_blocked_inactive",
            bound_ref: eligibility.boundRef,
            bound_label: eligibility.boundLabel,
            ref_code: eligibility.boundRef || row.ref_code,
          },
          { status: 403 }
        );
      }
    }

    const userAgent = req.headers.get("user-agent") || "";
    const deviceHint = clientDeviceHint || parseDeviceHint(userAgent);
    const sessResult = await createSession(row.id, deviceHint, ip(req), deviceId);

    if (!sessResult) return NextResponse.json({ error: "db" }, { status: 500 });
    if ((sessResult as any).error === "max_devices") {
      return NextResponse.json({
        ok: false,
        error: "max_devices",
        max: (sessResult as any).max,
        ref_code: (row as any).ref_code,
      }, { status: 403 });
    }

    const token = (sessResult as any).token;
    if (!token) return NextResponse.json({ error: "db" }, { status: 500 });

    // Enlazar permanentemente el dispositivo a esta clave
    if (deviceId) {
      await bindDeviceToCode(deviceId, row.id, deviceHint, ip(req));
    }

    const res = NextResponse.json({
      ok: true,
      label: row.label,
      ref_code: (row as any).ref_code,
      expires_at: row.expires_at,
    });

    res.cookies.set(SESSION_COOKIE, token, sessionCookieOpts());

    // Mantener la cookie persistente tvdev sincronizada en el navegador
    if (deviceId) {
      res.cookies.set("tvdev", deviceId, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365 * 10, // 10 años
      });
    }

    return res;
  } catch {
    return NextResponse.json({ error: "db" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const t = req.cookies.get(SESSION_COOKIE)?.value;
  if (t) await destroySession(t);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

