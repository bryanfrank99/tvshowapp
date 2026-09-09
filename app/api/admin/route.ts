import { NextRequest, NextResponse } from "next/server";
import { createAdminSession, adminLoginOk, ADMIN_COOKIE } from "@/lib/access";

// POST {password} → cookie admin (sesión en DB)
export async function POST(req: NextRequest) {
  let pass = "";
  try { pass = String((await req.json()).password || ""); } catch {}
  if (!(await adminLoginOk(pass))) return NextResponse.json({ error: "invalid" }, { status: 401 });
  const token = await createAdminSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 12 * 3600 });
  return res;
}
