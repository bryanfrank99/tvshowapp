// Resuelve IDs IMDb (tt...) → TMDB numérico usando el campo `moviedb_id` de Cinemeta.
// Así los proveedores que exigen TMDB (Embos, StreamBetter, Vidzy) funcionan
// aunque el catálogo free trabaje con IMDb. Sin key, CORS abierto, con caché local.
const CACHE_KEY = "tvshow_tmdb_ids_v1";

function readCache(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { return {}; }
}

export async function resolveTmdbId(type: "movie" | "tv", id: string): Promise<string | null> {
  if (!id.startsWith("tt")) return id; // ya es TMDB
  const cache = readCache();
  const ck = `${type}:${id}`;
  if (cache[ck]) return cache[ck];
  try {
    const r = await fetch(`https://v3-cinemeta.strem.io/meta/${type === "movie" ? "movie" : "series"}/${id}.json`);
    if (!r.ok) return null;
    const meta = (await r.json()).meta;
    const tmdb = meta?.moviedb_id ? String(meta.moviedb_id) : null;
    if (tmdb) {
      cache[ck] = tmdb;
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
    }
    return tmdb;
  } catch {
    return null;
  }
}
