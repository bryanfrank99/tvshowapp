import { NextRequest, NextResponse } from "next/server";
import {
  createAdminSession,
  authenticateAdmin,
  getAdminUser,
  ADMIN_COOKIE,
  rateOk,
} from "@/lib/access";

// GET: Consulta el perfil del administrador autenticado actualmente
export async function GET(req: NextRequest) {
  const user = await getAdminUser(req);
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    },
  });
}

// POST: Inicia sesión con usuario y contraseña (o solo contraseña por retrocompatibilidad)
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  // Protección anti fuerza bruta: máximo 8 intentos por minuto por IP
  if (!rateOk(`admin_login_${ip}`, 8, 60000)) {
    return NextResponse.json(
      {
        error: "rate_limit",
        message: "Demasiados intentos de inicio de sesión. Por favor espera un minuto.",
      },
      { status: 429 }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const username = String(body.username || "admin").trim();
  const password = String(body.password || "");

  if (!password) {
    return NextResponse.json(
      { error: "missing_fields", message: "La contraseña es obligatoria." },
      { status: 400 }
    );
  }

  const { user, error } = await authenticateAdmin(username, password);

  if (error === "suspended") {
    return NextResponse.json(
      {
        error: "suspended",
        message: "Esta cuenta de administrador ha sido suspendida. Contacta al administrador principal.",
      },
      { status: 403 }
    );
  }

  if (!user || error) {
    return NextResponse.json(
      { error: "invalid_credentials", message: "Usuario o contraseña incorrectos." },
      { status: 401 }
    );
  }

  const token = await createAdminSession(user);
  const res = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    },
  });

  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 3600, // 24 horas
  });

  return res;
}
