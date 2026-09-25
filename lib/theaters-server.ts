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
    const todayStr = new Date().toISOString().slice(0, 10);
    const [p1, p2, p3] = await Promise.all([
      tmdb<any>("/movie/now_playing?page=1", 3600),
      tmdb<any>("/movie/now_playing?page=2", 3600).catch(() => ({ results: [] })),
      tmdb<any>("/movie/now_playing?page=3", 3600).catch(() => ({ results: [] })),
    ]);

    const raw = [...(p1?.results || []), ...(p2?.results || []), ...(p3?.results || [])];

    // 1. Filtrar solo películas recientes (ventana teatral válida: entre 0 y 90 días desde su estreno en cines)
    // Esto descarta películas no estrenadas (daysSince < 0) y clásicas de años anteriores
    const recent = raw.filter((m) => {
      if (!m?.id || !m?.release_date) return false;
      const daysSince = (now - new Date(m.release_date).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince >= 0 && daysSince <= 90;
    });

    // 2. Para las candidatas recientes, comprobar si ya cuentan con estreno digital (tipo 4) o físico (tipo 5)
    await Promise.all(
      recent.map(async (m) => {
        try {
          const detail = await tmdb<any>(`/movie/${m.id}?append_to_response=release_dates`, 3600);
          const results = detail?.release_dates?.results || [];
          const allDates = results.flatMap((r: any) => r.release_dates || []);
          const hasDigitalOrPhysical = allDates.some(
            (x: any) => (x.type === 4 || x.type === 5) && x.release_date && x.release_date.slice(0, 10) <= todayStr
          );
          const hasTheatrical = allDates.some(
            (x: any) => (x.type === 2 || x.type === 3) && x.release_date && x.release_date.slice(0, 10) <= todayStr
          );
          if (!hasDigitalOrPhysical && (hasTheatrical || allDates.length === 0)) {
            ids.add(Number(m.id));
          }
        } catch {
          // Si falla la consulta de fechas individuales de release, admitirla sólo si está dentro de los 30 días
          const daysSince = (now - new Date(m.release_date).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince >= 0 && daysSince <= 30) {
            ids.add(Number(m.id));
          }
        }
      })
    );

    cachedNowPlayingIds = ids;
    cachedNowPlayingTime = now;
    return ids;
  } catch {
    return cachedNowPlayingIds || new Set();
  }
}
