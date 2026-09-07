import { NextResponse } from "next/server";
import pkg from "@/package.json";

// Diagnóstico de variables (sin exponer valores): /api/config
// Útil tras configurar envs en Vercel para verificar que llegaron.
export async function GET() {
  const has = (v: string | undefined, placeholder = "") =>
    !!v && v !== placeholder;
  const src = process.env.PROVIDERS_SOURCE === "local" ? "/providers.json" : process.env.PROVIDERS_URL;
  return NextResponse.json({
    app: pkg.version,
    node: process.version,
    tmdb: has(process.env.TMDB_API_KEY, "TU_API_KEY_AQUI"),
    providersUrl: src || "/providers.json (local)",
    vimeusKey: has(process.env.VIMEUS_VIEW_KEY),
    easterEgg: has(process.env.EASTER_EGG),
  });
}
