import { NextResponse } from "next/server";
import pkg from "@/package.json";

// Diagnóstico de variables (sin exponer valores): /api/config
// Útil tras configurar envs en Vercel para verificar que llegaron.
export async function GET() {
  const has = (v: string | undefined, placeholder = "") =>
    !!v && v !== placeholder;
  return NextResponse.json({
    app: pkg.version,
    node: process.version,
    tmdb: has(process.env.TMDB_API_KEY, "TU_API_KEY_AQUI"),
    providersUrl: process.env.NEXT_PUBLIC_PROVIDERS_URL || "/providers.json (local)",
    vimeusKey: has(process.env.NEXT_PUBLIC_VIMEUS_VIEW_KEY, "tu_view_key_aqui"),
    easterEgg: has(process.env.EASTER_EGG),
  });
}
