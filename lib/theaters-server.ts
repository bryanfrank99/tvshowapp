// @ts-nocheck
// Servidor TMDB: Obtención y caché de IDs de películas en cines
import { tmdb, hasKey } from "./tmdb";

let cachedNowPlayingIds: Set<number> | null = null;
let cachedNowPlayingTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora de caché

/**
 * Obtiene el conjunto de IDs de películas actualmente en cines desde TMDB /movie/now_playing.
 * Se cachea en memoria durante 1 hora para máxima velocidad sin saturar la cuota de API.
 */
export async function getNowPlayingIds(): Promise<Set<number>> {
  const now = Date.now();
  if (cachedNowPlayingIds && now - cachedNowPlayingTime < CACHE_TTL_MS) {
    return cachedNowPlayingIds;
  }

  if (!hasKey()) {
    return new Set();
  }

  try {
    const ids = new Set<number>();
    const [p1, p2] = await Promise.all([
      tmdb<any>("/movie/now_playing?page=1", 3600),
      tmdb<any>("/movie/now_playing?page=2", 3600).catch(() => ({ results: [] })),
    ]);

    for (const m of p1?.results || []) {
      if (m?.id) ids.add(Number(m.id));
    }
    for (const m of p2?.results || []) {
      if (m?.id) ids.add(Number(m.id));
    }

    cachedNowPlayingIds = ids;
    cachedNowPlayingTime = now;
    return ids;
  } catch {
    return cachedNowPlayingIds || new Set();
  }
}
