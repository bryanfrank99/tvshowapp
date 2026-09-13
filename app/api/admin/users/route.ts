// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/supa";
import {
  needSuperAdmin,
  getAdminUser,
  sha,
  destroyAllSessionsForUser,
} from "@/lib/access";

// GET: Lista todos los administradores con el recuento y estado de sus claves
export async function GET(req: NextRequest) {
  const deny = await needSuperAdmin(req);
  if (deny) return deny;

  const sb = supa();

  // 1. Obtener lista de administradores
  let users: any[] = [];
  try {
    const { data, error } = await sb
      .from("admin_users")
      .select("id,username,name,role,is_active,last_login_at,created_at")
      .order("created_at", { ascending: true });

    if (error) throw error;
    if (data) users = data;
  } catch {
    // Fallback con datos básicos si la migración aún no fue ejecutada
    const { data } = await sb.from("admin_users").select("id,username,created_at");
    if (data) {
      users = data.map((u: any) => ({
        ...u,
        name: u.username === "admin" ? "Administrador Principal" : u.username,
        role: u.username === "admin" ? "superadmin" : "admin",
        is_active: true,
      }));
    }
  }

  // 2. Obtener claves para calcular atribución y estadísticas por admin
  let codes: any[] = [];
  try {
    const { data, error } = await sb
      .from("access_codes")
      .select("id,label,expires_at,revoked,created_by,creator_username");
    if (error) throw error;
    if (data) codes = data;
  } catch {
    const { data } = await sb.from("access_codes").select("id,label,expires_at,revoked");
    if (data) codes = data;
  }

  // 3. Obtener sesiones de dispositivos
  let sessions: any[] = [];
  try {
    const { data } = await sb.from("sessions").select("token_hash,code_id");
    if (data) sessions = data;
  } catch {}

  const sessionsCountByCode = new Map<string, number>();
  for (const s of sessions) {
    if (!s.code_id) continue;
    sessionsCountByCode.set(s.code_id, (sessionsCountByCode.get(s.code_id) || 0) + 1);
  }

  const now = Date.now();

  // Enriquecer cada usuario con las estadísticas de sus claves
  const enrichedUsers = users.map((u) => {
    // Buscar claves atribuidas por created_by (UUID) o por creator_username
    const userCodes = codes.filter((c) => {
      if (c.created_by && c.created_by === u.id) return true;
      if (c.creator_username && c.creator_username.toLowerCase() === u.username.toLowerCase()) return true;
      // Claves sin creador asignado se atribuyen al admin inicial
      if (!c.created_by && !c.creator_username && u.username === "admin") return true;
      return false;
    });

    let activeCodes = 0;
    let expiredCodes = 0;
    let revokedCodes = 0;
    let totalDevices = 0;

    for (const c of userCodes) {
      totalDevices += sessionsCountByCode.get(c.id) || 0;
      const expTime = new Date(c.expires_at).getTime();
      if (c.revoked) {
        revokedCodes++;
      } else if (expTime <= now) {
        expiredCodes++;
      } else {
        activeCodes++;
      }
    }

    return {
      id: u.id,
      username: u.username,
      name: u.name || u.username,
      role: u.role || (u.username === "admin" ? "superadmin" : "admin"),
      is_active: u.is_active !== false,
      last_login_at: u.last_login_at || null,
      created_at: u.created_at,
      stats: {
        totalCodes: userCodes.length,
        activeCodes,
        expiredCodes,
        revokedCodes,
        totalDevices,
      },
    };
  });

  return NextResponse.json({
    users: enrichedUsers,
    totalAdmins: enrichedUsers.length,
  });
}

// POST: Crea un nuevo administrador
export async function POST(req: NextRequest) {
  const deny = await needSuperAdmin(req);
  if (deny) return deny;

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const username = String(body.username || "")
    .trim()
    .toLowerCase();
  const password = String(body.password || "");
  const name = String(body.name || username).trim();
  const role = body.role === "superadmin" ? "superadmin" : "admin";

  if (!username || username.length < 3) {
    return NextResponse.json(
      { error: "invalid_username", message: "El nombre de usuario debe tener al menos 3 caracteres." },
      { status: 400 }
    );
  }

  if (!password || password.length < 6) {
    return NextResponse.json(
      { error: "invalid_password", message: "La contraseña debe tener al menos 6 caracteres." },
      { status: 400 }
    );
  }

  const sb = supa();

  // Verificar si el username ya existe
  const { data: existing } = await sb
    .from("admin_users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "user_exists", message: "Este nombre de usuario ya está registrado." },
      { status: 409 }
    );
  }

  const password_hash = sha(password);

  try {
    const { data: created, error } = await (sb as any)
      .from("admin_users")
      .insert({
        username,
        password_hash,
        name: name || username,
        role,
        is_active: true,
      })
      .select("id,username,name,role,is_active,created_at")
      .single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      user: created,
    });
  } catch (err: any) {
    // Fallback si la tabla no tiene las columnas adicionales en Supabase aún
    try {
      const { data: baseCreated, error: baseErr } = await (sb as any)
        .from("admin_users")
        .insert({
          username,
          password_hash,
        })
        .select("id,username,created_at")
        .single();

      if (baseErr) throw baseErr;

      return NextResponse.json({
        ok: true,
        user: {
          ...baseCreated,
          name: name || username,
          role,
          is_active: true,
        },
      });
    } catch (fallbackErr: any) {
      return NextResponse.json(
        { error: "db", message: fallbackErr?.message || "Error al crear administrador en la base de datos." },
        { status: 500 }
      );
    }
  }
}

// PATCH: Modifica un administrador existente (cambiar contraseña, rol, nombre o suspender/activar)
export async function PATCH(req: NextRequest) {
  const deny = await needSuperAdmin(req);
  if (deny) return deny;

  const currentAdmin = await getAdminUser(req);
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const id = body.id;
  if (!id) {
    return NextResponse.json({ error: "params", message: "ID de usuario requerido." }, { status: 400 });
  }

  // Reglas de auto-protección para el administrador actual
  const isSelf = currentAdmin?.id === id;

  if (isSelf && body.is_active === false) {
    return NextResponse.json(
      { error: "self_suspend", message: "No puedes suspender tu propia cuenta de administrador." },
      { status: 400 }
    );
  }

  if (isSelf && body.role && body.role !== "superadmin") {
    return NextResponse.json(
      { error: "self_demote", message: "No puedes quitarte a ti mismo los privilegios de Super Administrador." },
      { status: 400 }
    );
  }

  const sb = supa();
  const updates: any = {};

  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }

  if (body.role && ["superadmin", "admin"].includes(body.role)) {
    updates.role = body.role;
  }

  if (typeof body.is_active === "boolean") {
    updates.is_active = body.is_active;
    // Si se suspende la cuenta, invalidar todas sus sesiones inmediatamente
    if (!body.is_active) {
      await destroyAllSessionsForUser(id);
    }
  }

  if (body.password) {
    const pass = String(body.password);
    if (pass.length < 6) {
      return NextResponse.json(
        { error: "invalid_password", message: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }
    updates.password_hash = sha(pass);
    // Invalidar sesiones existentes al cambiar la contraseña
    await destroyAllSessionsForUser(id);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  try {
    const { error } = await sb.from("admin_users").update(updates).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "db", message: err?.message || "Error al actualizar administrador." },
      { status: 500 }
    );
  }
}

// DELETE: Elimina un administrador
export async function DELETE(req: NextRequest) {
  const deny = await needSuperAdmin(req);
  if (deny) return deny;

  const currentAdmin = await getAdminUser(req);
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "params", message: "ID requerido." }, { status: 400 });
  }

  if (currentAdmin?.id === id) {
    return NextResponse.json(
      { error: "self_delete", message: "No puedes eliminar tu propia cuenta de administrador." },
      { status: 400 }
    );
  }

  const sb = supa();

  // Proteger la cuenta raíz 'admin'
  const { data: targetUser } = await sb
    .from("admin_users")
    .select("id,username")
    .eq("id", id)
    .maybeSingle();

  if (targetUser?.username === "admin") {
    return NextResponse.json(
      { error: "root_protected", message: "El administrador principal del sistema no puede ser eliminado." },
      { status: 400 }
    );
  }

  // Cerrar todas las sesiones activas del usuario eliminado
  await destroyAllSessionsForUser(id);

  // Reasignar claves al Super Admin o dejarlas nulas
  try {
    if (currentAdmin?.id) {
      await sb
        .from("access_codes")
        .update({
          created_by: currentAdmin.id,
          creator_username: currentAdmin.username || "admin",
        })
        .eq("created_by", id);
    }
  } catch {}

  const { error } = await sb.from("admin_users").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "db", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
