// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { validateCode, findCodeByHash, createSession, destroySession, rateOk, SESSION_COOKIE } from "@/lib/access";

function ip(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
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
    const token = await createSession(row.id);
    if (!token) return NextResponse.json({ error: "db" }, { status: 500 });
    const res = NextResponse.json({ ok: true, label: row.label, ref_code: (row as any).ref_code, expires_at: row.expires_at });
    res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 90 });
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

