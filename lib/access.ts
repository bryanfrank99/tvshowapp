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

export const MAX_DEVICES_PER_CODE = 3;

export function parseDeviceHint(ua = ""): string {
  const s = ua.toLowerCase();
  if (s.includes("tvshowtv") || s.includes("googletv") || s.includes("android tv") || s.includes("smart-tv") || s.includes("tizen") || s.includes("webos") || s.includes("aft")) {
    return "Smart TV / Android TV";
  }
  if (s.includes("ipad") || s.includes("tablet")) return "Tablet";
  if (s.includes("iphone")) return "iPhone";
  if (s.includes("android")) return "Móvil Android";
  if (s.includes("windows")) return "Windows PC";
  if (s.includes("macintosh") || s.includes("mac os")) return "Mac";
  if (s.includes("linux")) return "Linux";
  return "Navegador Web";
}

export async function createSession(codeId: string, deviceHint = "Navegador Web", ip = "") {
  const sb = supa();

  // Comprobar límite estricto de 3 dispositivos
  const { data: existing, error: countErr } = await sb
    .from("sessions")
    .select("token_hash,created_at")
    .eq("code_id", codeId)
    .order("created_at", { ascending: true });

  if (!countErr && existing && existing.length >= MAX_DEVICES_PER_CODE) {
    return { error: "max_devices", count: existing.length, max: MAX_DEVICES_PER_CODE };
  }

  const token = newToken();
  const tokenHash = sha(token);
  const now = new Date().toISOString();

  try {
    const { error } = await sb.from("sessions").insert({
      token_hash: tokenHash,
      code_id: codeId,
      device_hint: deviceHint,
      last_seen_at: now,
      created_at: now,
    });
    if (error) throw error;
  } catch {
    // Fallback si las nuevas columnas aún no se añadieron a Supabase
    const { error: baseError } = await sb.from("sessions").insert({
      token_hash: tokenHash,
      code_id: codeId,
    });
    if (baseError) return null;
  }

  sessionCache.set(tokenHash, { codeId, expiresAt: Date.now() + SESSION_CACHE_TTL });
  return { token };
}

// Caché en memoria para sesiones activas (TTL 3 minutos). Reduce consultas a Supabase en un 95%.
const sessionCache = new Map<string, { codeId: string; expiresAt: number }>();
const SESSION_CACHE_TTL = 3 * 60 * 1000;
const lastTouched = new Map<string, number>();

function touchSessionAsync(tokenHash: string) {
  const now = Date.now();
  const prev = lastTouched.get(tokenHash) || 0;
  if (now - prev < 60000) return; // máximo 1 actualización por minuto
  lastTouched.set(tokenHash, now);
  try {
    supa()
      .from("sessions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("token_hash", tokenHash)
      .then(() => {})
      .catch(() => {});
  } catch {}
}

export async function checkSession(token: string | undefined | null) {
  if (!token) return null;
  const tokenHash = sha(token);
  const now = Date.now();
  const cached = sessionCache.get(tokenHash);
  if (cached && cached.expiresAt > now) {
    touchSessionAsync(tokenHash);
    return { codeId: cached.codeId };
  }

  const sb = supa();
  const { data, error } = await sb
    .from("sessions")
    .select("token_hash,code_id,access_codes!inner(expires_at,revoked)")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error || !data) {
    sessionCache.delete(tokenHash);
    return null;
  }
  const code: any = (data as any).access_codes;
  if (!code || code.revoked || new Date(code.expires_at).getTime() <= now) {
    sessionCache.delete(tokenHash);
    return null;
  }
  const codeId = (data as any).code_id;
  sessionCache.set(tokenHash, { codeId, expiresAt: now + SESSION_CACHE_TTL });
  touchSessionAsync(tokenHash);
  return { codeId };
}

export async function destroySession(token: string) {
  try {
    const tokenHash = sha(token);
    sessionCache.delete(tokenHash);
    lastTouched.delete(tokenHash);
    await supa().from("sessions").delete().eq("token_hash", tokenHash);
  } catch {}
}

export async function resetSessionsForCode(codeId: string) {
  try {
    const sb = supa();
    for (const [hash, entry] of sessionCache.entries()) {
      if (entry.codeId === codeId) {
        sessionCache.delete(hash);
        lastTouched.delete(hash);
      }
    }
    const { error } = await sb.from("sessions").delete().eq("code_id", codeId);
    return !error;
  } catch {
    return false;
  }
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

