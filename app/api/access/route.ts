// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { validateCode, findCodeByHash, createSession, destroySession, rateOk, SESSION_COOKIE, sessionCookieOpts, checkSession, checkSessionOrEmbedded, parseDeviceHint } from "@/lib/access";

function ip(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

// GET verifica sesión existente (para re-auth silencioso o clave embebida en APK).
export async function GET(req: NextRequest) {
  const auth = await checkSessionOrEmbedded(req).catch(() => null);
  if (!auth) return NextResponse.json({ ok: false, error: "locked" }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  if (auth.autoSetToken) {
    res.cookies.set(SESSION_COOKIE, auth.autoSetToken, sessionCookieOpts());
  }
  return res;
}

// POST {code} → crea sesión. DELETE → cierra sesión.
export async function POST(req: NextRequest) {
  if (!rateOk(ip(req))) return NextResponse.json({ error: "rate" }, { status: 429 });
  let code = "";
  try {
    code = String((await req.json()).code || "");
  } catch {}
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
    const userAgent = req.headers.get("user-agent") || "";
    const deviceHint = parseDeviceHint(userAgent);
    const sessResult = await createSession(row.id, deviceHint, ip(req));

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
    const res = NextResponse.json({ ok: true, label: row.label, ref_code: (row as any).ref_code, expires_at: row.expires_at });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOpts());
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

