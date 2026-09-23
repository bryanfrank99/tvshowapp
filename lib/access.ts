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

// Claves de acceso sin límite de tiempo (Super Admin)
export const LIFETIME_EXPIRATION_DATE = "2099-12-31T23:59:59.999Z";
export function isLifetimeCode(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).getFullYear() >= 2099;
}

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

// Control anti-reúso de dispositivos: comprueba si el equipo ya tiene claves inactivas o vencidas
export async function checkDeviceEligibility(
  deviceId: string,
  targetCodeId: string
): Promise<{
  eligible: boolean;
  reason?: string;
  boundRef?: string;
  boundLabel?: string;
}> {
  if (!deviceId || !deviceId.trim() || deviceId === "DEV-SERVER") {
    return { eligible: true };
  }

  const cleanDevId = deviceId.trim().toUpperCase();
  const sb = supa();

  try {
    // 1. Consultar historial en device_bindings
    const { data: bindings, error: bindErr } = await sb
      .from("device_bindings")
      .select("code_id, access_codes!inner(id, label, ref_code, expires_at, revoked, suspended_by_billing)")
      .eq("device_id", cleanDevId);

    if (!bindErr && bindings && bindings.length > 0) {
      for (const item of bindings) {
        const boundCode: any = item.access_codes;
        if (!boundCode) continue;

        // Si es la misma clave, se permite la reactivación/renovación
        if (boundCode.id === targetCodeId) continue;

        // Si es una clave diferente, verificar si está inactiva o vencida
        const isRevoked = boundCode.revoked === true || boundCode.suspended_by_billing === true;
        const isExpired = new Date(boundCode.expires_at).getTime() <= Date.now();

        if (isRevoked || isExpired) {
          return {
            eligible: false,
            reason: "device_blocked_inactive",
            boundRef: boundCode.ref_code,
            boundLabel: boundCode.label,
          };
        }
      }
    }

    // 2. Comprobación persistente en tabla config (dev_bind:<id>)
    const configKey = `dev_bind:${cleanDevId}`;
    const { data: configRow } = await sb.from("config").select("value").eq("key", configKey).maybeSingle();
    if (configRow && configRow.value) {
      try {
        const parsed = JSON.parse(configRow.value);
        if (parsed.codeId && parsed.codeId !== targetCodeId) {
          const { data: boundCode } = await sb
            .from("access_codes")
            .select("id, label, ref_code, expires_at, revoked, suspended_by_billing")
            .eq("id", parsed.codeId)
            .maybeSingle();

          if (boundCode) {
            const isRevoked = boundCode.revoked === true || boundCode.suspended_by_billing === true;
            const isExpired = new Date(boundCode.expires_at).getTime() <= Date.now();

            if (isRevoked || isExpired) {
              return {
                eligible: false,
                reason: "device_blocked_inactive",
                boundRef: boundCode.ref_code,
                boundLabel: boundCode.label,
              };
            }
          }
        }
      } catch {}
    }

    // 3. Comprobación de respaldo en tabla sessions
    const { data: sessBindings, error: sessErr } = await sb
      .from("sessions")
      .select("code_id, access_codes!inner(id, label, ref_code, expires_at, revoked, suspended_by_billing)")
      .eq("device_id", cleanDevId);

    if (!sessErr && sessBindings && sessBindings.length > 0) {
      for (const item of sessBindings) {
        const boundCode: any = item.access_codes;
        if (!boundCode || boundCode.id === targetCodeId) continue;

        const isRevoked = boundCode.revoked === true || boundCode.suspended_by_billing === true;
        const isExpired = new Date(boundCode.expires_at).getTime() <= Date.now();

        if (isRevoked || isExpired) {
          return {
            eligible: false,
            reason: "device_blocked_inactive",
            boundRef: boundCode.ref_code,
            boundLabel: boundCode.label,
          };
        }
      }
    }
  } catch (err) {
    console.warn("checkDeviceEligibility fallback:", err);
  }

  return { eligible: true };
}

export async function bindDeviceToCode(
  deviceId: string,
  codeId: string,
  deviceHint = "Dispositivo",
  ip = ""
) {
  if (!deviceId || !deviceId.trim() || deviceId === "DEV-SERVER") return;
  const cleanDevId = deviceId.trim().toUpperCase();
  const sb = supa();
  const now = new Date().toISOString();

  // 1. Guardar en device_bindings si la tabla existe
  try {
    await sb.from("device_bindings").upsert(
      {
        device_id: cleanDevId,
        code_id: codeId,
        device_hint: deviceHint,
        ip: ip,
        last_seen_at: now,
      },
      { onConflict: "device_id,code_id" }
    );
  } catch {}

  // 2. Persistencia garantizada en tabla config (dev_bind:<id>)
  try {
    const configKey = `dev_bind:${cleanDevId}`;
    const configVal = JSON.stringify({
      codeId,
      deviceHint,
      ip,
      lastSeenAt: now,
    });
    await sb.from("config").upsert({ key: configKey, value: configVal });
  } catch (e) {
    console.warn("Could not save device binding in config:", e);
  }
}

export async function createSession(codeId: string, deviceHint = "Navegador Web", ip = "", deviceId = "") {
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
      device_id: deviceId || null,
      last_seen_at: now,
      created_at: now,
    });
    if (error) throw error;
  } catch {
    // Fallback si la columna device_id aún no existe
    try {
      const { error: fError } = await sb.from("sessions").insert({
        token_hash: tokenHash,
        code_id: codeId,
        device_hint: deviceHint,
        last_seen_at: now,
        created_at: now,
      });
      if (fError) throw fError;
    } catch {
      const { error: baseError } = await sb.from("sessions").insert({
        token_hash: tokenHash,
        code_id: codeId,
      });
      if (baseError) return null;
    }
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
    try {
      await sb.from("device_bindings").delete().eq("code_id", codeId);
    } catch {}
    try {
      const { data: configs } = await sb.from("config").select("key, value").like("key", "dev_bind:%");
      if (configs) {
        for (const c of configs) {
          try {
            const parsed = JSON.parse(c.value);
            if (parsed.codeId === codeId) {
              await sb.from("config").delete().eq("key", c.key);
            }
          } catch {}
        }
      }
    } catch {}
    return !error;
  } catch {
    return false;
  }
}

// ---- Admin Multi-Usuario (en Supabase, sesiones en tabla) ----
export type AdminUser = {
  id: string;
  username: string;
  name: string;
  role: "superadmin" | "admin";
  is_active: boolean;
};

export async function authenticateAdmin(
  usernameInput: string,
  passInput: string
): Promise<{ user?: AdminUser; error?: string }> {
  if (!passInput) return { error: "missing_password" };
  const username = (usernameInput || "admin").trim().toLowerCase();

  try {
    const sb = supa();
    let user: any = null;
    try {
      const { data, error } = await sb
        .from("admin_users")
        .select("id,username,name,role,is_active,password_hash")
        .eq("username", username)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      user = data;
    } catch {
      // Fallback si columnas name/role/is_active aún no existen en DB
      const { data } = await sb
        .from("admin_users")
        .select("id,username,password_hash")
        .eq("username", username)
        .maybeSingle();
      if (data) {
        user = {
          ...data,
          name: data.username === "admin" ? "Administrador Principal" : data.username,
          role: data.username === "admin" ? "superadmin" : "admin",
          is_active: true,
        };
      }
    }

    // Si el usuario existe en DB
    if (user) {
      if (user.is_active === false) {
        return { error: "suspended" };
      }
      if (sha(passInput) !== user.password_hash) {
        return { error: "invalid_credentials" };
      }

      // Actualizar last_login_at de forma asíncrona
      try {
        sb.from("admin_users")
          .update({ last_login_at: new Date().toISOString() })
          .eq("id", user.id)
          .then(() => {});
      } catch {}

      return {
        user: {
          id: user.id,
          username: user.username,
          name: user.name || user.username,
          role: (user.role as any) || (user.username === "admin" ? "superadmin" : "admin"),
          is_active: true,
        },
      };
    }

    // Bootstrap para el usuario 'admin' inicial si no existe en DB
    if (username === "admin") {
      const env = process.env.ADMIN_PASSWORD || "";
      if (!env || env === passInput) {
        const { data: created, error: createErr } = await (sb as any)
          .from("admin_users")
          .upsert(
            {
              username: "admin",
              name: "Administrador Principal",
              role: "superadmin",
              is_active: true,
              password_hash: sha(passInput),
            },
            { onConflict: "username" }
          )
          .select("id,username,name,role,is_active")
          .maybeSingle();

        if (!createErr && created) {
          return {
            user: {
              id: created.id,
              username: created.username,
              name: created.name || "Administrador Principal",
              role: "superadmin",
              is_active: true,
            },
          };
        }

        return {
          user: {
            id: "default-admin-id",
            username: "admin",
            name: "Administrador Principal",
            role: "superadmin",
            is_active: true,
          },
        };
      }
    }

    return { error: "invalid_credentials" };
  } catch (err) {
    // Fallback de contingencia contra process.env
    const env = process.env.ADMIN_PASSWORD || "";
    if (env && env === passInput && (username === "admin" || !usernameInput)) {
      return {
        user: {
          id: "env-admin-id",
          username: "admin",
          name: "Administrador Principal",
          role: "superadmin",
          is_active: true,
        },
      };
    }
    return { error: "invalid_credentials" };
  }
}

// Compatibilidad retroactiva con adminLoginOk(pass)
export async function adminLoginOk(pass: string) {
  const res = await authenticateAdmin("admin", pass);
  return Boolean(res.user);
}

export async function createAdminSession(user?: AdminUser | null) {
  const token = newToken();
  const tokenHash = sha(token);
  const sb = supa();
  const now = new Date().toISOString();

  try {
    const { error } = await sb.from("admin_sessions").insert({
      token_hash: tokenHash,
      user_id: user?.id || null,
      username: user?.username || "admin",
      role: user?.role || "superadmin",
      last_seen_at: now,
      created_at: now,
    });
    if (error) throw error;
  } catch {
    // Fallback si la tabla aún no tiene las nuevas columnas en Supabase
    try {
      await sb.from("admin_sessions").insert({
        token_hash: tokenHash,
        created_at: now,
      });
    } catch {}
  }

  return token;
}

export async function getAdminUserFromToken(token: string | undefined | null): Promise<AdminUser | null> {
  if (!token) return null;
  const tokenHash = sha(token);

  try {
    const sb = supa();
    let sess: any = null;
    try {
      const { data: sessData, error: sessErr } = await sb
        .from("admin_sessions")
        .select("token_hash,user_id,username,role,last_seen_at")
        .eq("token_hash", tokenHash)
        .maybeSingle();

      if (sessErr && sessErr.code !== "PGRST116") throw sessErr;
      sess = sessData;
    } catch {
      // Fallback si admin_sessions solo contiene token_hash
      try {
        const { data: baseSess } = await sb
          .from("admin_sessions")
          .select("token_hash,created_at")
          .eq("token_hash", tokenHash)
          .maybeSingle();
        if (baseSess) {
          sess = {
            ...baseSess,
            username: "admin",
            role: "superadmin",
          };
        }
      } catch {}
    }

    if (!sess) {
      return null;
    }

    // Si la sesión tiene user_id, verificar estado en admin_users
    if (sess.user_id) {
      let user: any = null;
      try {
        const { data: userData, error: userErr } = await sb
          .from("admin_users")
          .select("id,username,name,role,is_active")
          .eq("id", sess.user_id)
          .maybeSingle();
        if (userErr && userErr.code !== "PGRST116") throw userErr;
        user = userData;
      } catch {
        const { data: baseUser } = await sb
          .from("admin_users")
          .select("id,username")
          .eq("id", sess.user_id)
          .maybeSingle();
        if (baseUser) {
          user = {
            ...baseUser,
            name: baseUser.username,
            role: baseUser.username === "admin" ? "superadmin" : "admin",
            is_active: true,
          };
        }
      }

      if (!user || user.is_active === false) {
        // Sesión inválida o usuario suspendido: eliminar sesión
        destroyAdminSession(token);
        return null;
      }

      return {
        id: user.id,
        username: user.username,
        name: user.name || user.username,
        role: (user.role as any) || "admin",
        is_active: user.is_active !== false,
      };
    }

    // Si la sesión tiene username pero no user_id (o sesión legacy)
    const uname = sess.username || "admin";
    let user: any = null;
    try {
      const { data: userData, error: userErr } = await sb
        .from("admin_users")
        .select("id,username,name,role,is_active")
        .eq("username", uname)
        .maybeSingle();
      if (userErr && userErr.code !== "PGRST116") throw userErr;
      user = userData;
    } catch {
      const { data: baseUser } = await sb
        .from("admin_users")
        .select("id,username")
        .eq("username", uname)
        .maybeSingle();
      if (baseUser) {
        user = {
          ...baseUser,
          name: baseUser.username,
          role: baseUser.username === "admin" ? "superadmin" : "admin",
          is_active: true,
        };
      }
    }

    if (user) {
      if (user.is_active === false) {
        destroyAdminSession(token);
        return null;
      }
      return {
        id: user.id,
        username: user.username,
        name: user.name || user.username,
        role: (user.role as any) || (user.username === "admin" ? "superadmin" : "admin"),
        is_active: true,
      };
    }

    // Fallback por defecto si no hay registro específico pero la sesión existía
    return {
      id: "legacy-admin",
      username: uname,
      name: "Administrador Principal",
      role: uname === "admin" ? "superadmin" : "admin",
      is_active: true,
    };
  } catch {
    return null;
  }
}

export async function checkAdmin(cookieVal: string | undefined | null) {
  const user = await getAdminUserFromToken(cookieVal);
  return !!user;
}

export async function getAdminUser(req: NextRequest): Promise<AdminUser | null> {
  const cookieVal = req.cookies.get(ADMIN_COOKIE)?.value;
  return getAdminUserFromToken(cookieVal);
}

export async function destroyAdminSession(token: string | undefined | null) {
  if (!token) return;
  try {
    await supa().from("admin_sessions").delete().eq("token_hash", sha(token));
  } catch {}
}

export async function destroyAllSessionsForUser(userId: string) {
  if (!userId) return;
  try {
    await supa().from("admin_sessions").delete().eq("user_id", userId);
  } catch {}
}

export async function needAdmin(req: NextRequest) {
  const user = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: "admin" }, { status: 403 });
  return null;
}

export async function needSuperAdmin(req: NextRequest) {
  const user = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: "admin" }, { status: 403 });
  if (user.role !== "superadmin") {
    return NextResponse.json(
      { error: "forbidden", message: "Esta acción requiere privilegios de Super Administrador" },
      { status: 403 }
    );
  }
  return null;
}

export { ADMIN_COOKIE };

