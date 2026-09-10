// @ts-nocheck
// Acceso por código: hash, sesiones en cookie HttpOnly, rate-limit.
import { createHash, randomBytes } from "crypto";
import { supa } from "./supa";
import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE = "tvsess";
const ADMIN_COOKIE = "tvadmin";

// Cookie 90 días, Secure solo en prod (Vercel HTTPS). SameSite lax persiste en HTTPS solo con Secure.
export function sessionCookieOpts() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  };
}

export const sha = (s: string) => createHash("sha256").update(s).digest("hex");
export const newToken = () => randomBytes(32).toString("hex");
export const newRef = () => `TV-${randomBytes(3).toString("hex").toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;

// Rate-limit en memoria por IP (por instancia).
const hits = new Map<string, number[]>();
export function rateOk(ip: string, limit = 5, windowMs = 60000) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length <= limit;
}

export async function validateCode(code: string) {
  const sb = supa();
  const { data, error } = await sb
    .from("access_codes")
    .select("id,label,ref_code,expires_at,revoked")
    .eq("code_hash", sha(code.trim()))
    .maybeSingle();
  if (error || !data || data.revoked) return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) return null;
  return data as { id: string; label: string; ref_code: string; expires_at: string; revoked: boolean };
}

export async function findCodeByHash(code: string) {
  const sb = supa();
  const { data } = await sb.from("access_codes").select("id,label,ref_code,expires_at,revoked").eq("code_hash", sha(code.trim())).maybeSingle();
  return data as { id: string; label: string; ref_code: string; expires_at: string; revoked: boolean } | null;
}

export async function createSession(codeId: string) {
  const token = newToken();
  const sb = supa();
  const { error } = await sb.from("sessions").insert({ token_hash: sha(token), code_id: codeId });
  if (error) return null;
  return token;
}

export async function checkSession(token: string | undefined | null) {
  if (!token) return null;
  const sb = supa();
  const { data, error } = await sb
    .from("sessions")
    .select("token_hash,code_id,access_codes!inner(expires_at,revoked)")
    .eq("token_hash", sha(token))
    .maybeSingle();
  if (error || !data) return null;
  const code: any = (data as any).access_codes;
  if (!code || code.revoked || new Date(code.expires_at).getTime() <= Date.now()) return null;
  return { codeId: (data as any).code_id };
}

export async function destroySession(token: string) {
  try {
    await supa().from("sessions").delete().eq("token_hash", sha(token));
  } catch {}
}

// ---- Admin (en Supabase, sesiones en tabla) ----
export async function adminLoginOk(pass: string) {
  if (!pass) return false;
  try {
    const sb = supa();
    const { data, error } = await sb.from("admin_users").select("password_hash").eq("username", "admin").maybeSingle();
    if (error) throw error;
    if (!data?.password_hash) {
      // Bootstrap: si no hay admin, el primer login crea el admin con esa clave
      const env = process.env.ADMIN_PASSWORD || "";
      if (env) {
        if (env === pass) {
          try { await (sb as any).from("admin_users").upsert({ username: "admin", password_hash: sha(pass) }, { onConflict: "username" }); } catch {}
          return true;
        }
        return false;
      }
      try { await (sb as any).from("admin_users").upsert({ username: "admin", password_hash: sha(pass) }, { onConflict: "username" }); } catch {}
      return true;
    }
    return sha(pass) === data.password_hash;
  } catch {
    const env = process.env.ADMIN_PASSWORD || "";
    return !!env && env === pass;
  }
}

export async function createAdminSession() {
  const token = newToken();
  try {
    await supa().from("admin_sessions").insert({ token_hash: sha(token) });
  } catch {}
  return token;
}

export async function checkAdmin(cookieVal: string | undefined | null) {
  if (!cookieVal) return false;
  try {
    const { data } = await supa().from("admin_sessions").select("token_hash").eq("token_hash", sha(cookieVal)).maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

export async function destroyAdminSession(token: string | undefined | null) {
  if (!token) return;
  try {
    await supa().from("admin_sessions").delete().eq("token_hash", sha(token));
  } catch {}
}

export async function needAdmin(req: NextRequest) {
  return (await checkAdmin(req.cookies.get(ADMIN_COOKIE)?.value)) ? null : NextResponse.json({ error: "admin" }, { status: 403 });
}

export { ADMIN_COOKIE };

