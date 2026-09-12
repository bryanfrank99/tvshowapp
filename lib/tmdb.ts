// Fetch TMDB solo-servidor (la KEY nunca sale al cliente).
// Idioma desde cookie tvshow_lang (es|en), por defecto español.
import { cookies } from "next/headers";

const BASE = "https://api.themoviedb.org/3";

export function hasKey() {
  return !!process.env.TMDB_API_KEY && process.env.TMDB_API_KEY !== "TU_API_KEY_AQUI";
}

export function getLang(): "es" | "en" | "pt" {
  try {
    const v = cookies().get("tvshow_lang")?.value;
    return v === "es" || v === "en" ? v : "pt";
  } catch {
    return "pt";
  }
}

const TMDB_LANG = { es: "es-ES", en: "en-US", pt: "pt-BR" } as const;

export async function tmdb<T = any>(path: string, revalidate = 3600): Promise<T> {
  const key = process.env.TMDB_API_KEY;
  if (!hasKey()) throw new Error("NO_KEY");
  const lang = TMDB_LANG[getLang()];
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}${path}${sep}api_key=${key}&language=${lang}`, { next: { revalidate } });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}
