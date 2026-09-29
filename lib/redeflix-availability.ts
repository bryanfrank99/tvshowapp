/**
 * Módulo de verificación de disponibilidad de catálogo para RedeFlix y servidores con listas de IDs
 *
 * Permite verificar si un título o episodio está disponible consultando las listas de IDs:
 * - Películas: TXT con IDs TMDB (ej. https://redeflixapi.store/list-movie-ids.txt)
 * - Series: JSON con items, id_tmdb y desglose de episodios (ej. https://redeflixapi.store/list-tv-ids.txt)
 * - Animes: JSON complementario
 * - Doramas: JSON complementario
 *
 * Mantiene un caché en memoria con TTL de 6 horas y estructuras O(1) (Set y Map).
 */

export const DEFAULT_REDEFLIX_MOVIE_URL = "https://redeflixapi.store/list-movie-ids.txt";
export const DEFAULT_REDEFLIX_TV_URL = "https://redeflixapi.store/list-tv-ids.txt";
export const DEFAULT_REDEFLIX_ANIME_URL = "https://redeflixapi.store/list-anime-ids.txt";
export const DEFAULT_REDEFLIX_DORAMA_URL = "https://redeflixapi.store/list-dorama-ids.txt";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

// Cachés por URL en memoria
const movieCache = new Map<string, { set: Set<string>; lastFetch: number }>();
const moviePromises = new Map<string, Promise<Set<string>>>();

const tvCache = new Map<string, { map: Map<string, Record<string, Record<string, string>>>; lastFetch: number }>();
const tvPromises = new Map<string, Promise<Map<string, Record<string, Record<string, string>>>>>();

/**
 * Detecta si un proveedor corresponde a RedeFlix o tiene listas de disponibilidad configuradas
 */
export function isRedeflixProvider(
  p: {
    id?: string;
    movie_tpl?: string;
    tv_tpl?: string;
    movie_list_url?: string;
    tv_list_url?: string;
  } | null | undefined
): boolean {
  if (!p) return false;
  const id = String(p.id || "").toLowerCase();
  if (id === "redeflix") return true;
  const movieTpl = String(p.movie_tpl || "").toLowerCase();
  const tvTpl = String(p.tv_tpl || "").toLowerCase();
  if (movieTpl.includes("redeflixapi.store") || tvTpl.includes("redeflixapi.store")) return true;
  // Si tiene URLs de disponibilidad configuradas explícitamente en la base de datos
  if (p.movie_list_url || p.tv_list_url) return true;
  return false;
}

/**
 * Helper con timeout para peticiones fetch
 */
async function fetchWithTimeout(url: string, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "TVShow/7.0 (RedeFlix Availability Checker)",
        Accept: "*/*",
      },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Obtiene el Set O(1) de películas para la URL indicada
 */
export async function getRedeflixMovieSet(url: string = DEFAULT_REDEFLIX_MOVIE_URL): Promise<Set<string>> {
  const targetUrl = url || DEFAULT_REDEFLIX_MOVIE_URL;
  const now = Date.now();
  const existing = movieCache.get(targetUrl);
  if (existing && now - existing.lastFetch < CACHE_TTL_MS) {
    return existing.set;
  }

  const inFlight = moviePromises.get(targetUrl);
  if (inFlight) {
    return inFlight;
  }

  const promise = (async () => {
    try {
      const res = await fetchWithTimeout(targetUrl, 8000);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status} al descargar lista de películas`);
      }
      const text = await res.text();
      const lines = text.split("\n");
      const movieSet = new Set<string>();

      for (let i = 0; i < lines.length; i++) {
        const id = lines[i].trim();
        if (id) {
          movieSet.add(id);
        }
      }

      movieCache.set(targetUrl, { set: movieSet, lastFetch: Date.now() });
      return movieSet;
    } catch (err: any) {
      console.warn(`[Availability] Error al actualizar catálogo de películas (${targetUrl}):`, err?.message || err);
      if (existing) return existing.set;
      return new Set<string>();
    } finally {
      moviePromises.delete(targetUrl);
    }
  })();

  moviePromises.set(targetUrl, promise);
  return promise;
}

export interface TvFetchUrls {
  tvUrl?: string;
  animeUrl?: string;
  doramaUrl?: string;
}

/**
 * Obtiene el Map O(1) de series y episodios para las URLs indicadas
 */
export async function getRedeflixTvMap(urls?: TvFetchUrls): Promise<Map<string, Record<string, Record<string, string>>>> {
  const tvUrl = urls?.tvUrl || DEFAULT_REDEFLIX_TV_URL;
  const animeUrl = urls?.animeUrl || (tvUrl === DEFAULT_REDEFLIX_TV_URL ? DEFAULT_REDEFLIX_ANIME_URL : "");
  const doramaUrl = urls?.doramaUrl || (tvUrl === DEFAULT_REDEFLIX_TV_URL ? DEFAULT_REDEFLIX_DORAMA_URL : "");

  const cacheKey = `${tvUrl}|${animeUrl}|${doramaUrl}`;
  const now = Date.now();
  const existing = tvCache.get(cacheKey);
  if (existing && now - existing.lastFetch < CACHE_TTL_MS) {
    return existing.map;
  }

  const inFlight = tvPromises.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const promise = (async () => {
    try {
      const tvMap = new Map<string, Record<string, Record<string, string>>>();

      const fetchTargets: Promise<any>[] = [fetchWithTimeout(tvUrl, 15000).then((r) => r.json())];
      if (animeUrl) fetchTargets.push(fetchWithTimeout(animeUrl, 10000).then((r) => r.json()));
      if (doramaUrl) fetchTargets.push(fetchWithTimeout(doramaUrl, 10000).then((r) => r.json()));

      const results = await Promise.allSettled(fetchTargets);

      for (const res of results) {
        if (res.status === "fulfilled" && res.value && Array.isArray(res.value.items)) {
          for (const item of res.value.items) {
            if (item && item.id_tmdb) {
              const tmdbKey = String(item.id_tmdb);
              const existingSeries = tvMap.get(tmdbKey) || {};
              const incoming = item.episodios || {};
              for (const seasonKey of Object.keys(incoming)) {
                existingSeries[seasonKey] = {
                  ...(existingSeries[seasonKey] || {}),
                  ...incoming[seasonKey],
                };
              }
              tvMap.set(tmdbKey, existingSeries);
            }
          }
        }
      }

      if (tvMap.size > 0) {
        tvCache.set(cacheKey, { map: tvMap, lastFetch: Date.now() });
        return tvMap;
      }

      if (existing) return existing.map;
      return tvMap;
    } catch (err: any) {
      console.warn(`[Availability] Error al actualizar catálogo de series (${cacheKey}):`, err?.message || err);
      if (existing) return existing.map;
      return new Map<string, Record<string, Record<string, string>>>();
    } finally {
      tvPromises.delete(cacheKey);
    }
  })();

  tvPromises.set(cacheKey, promise);
  return promise;
}

export interface RedeFlixCheckOptions {
  type: "movie" | "tv";
  tmdbId?: string | number | null;
  season?: string | number | null;
  episode?: string | number | null;
  movieListUrl?: string | null;
  tvListUrl?: string | null;
  animeListUrl?: string | null;
  doramaListUrl?: string | null;
}

/**
 * Consulta si un contenido específico (película o serie/episodio) está disponible en RedeFlix o listas configuradas
 */
export async function isRedeflixAvailable(opts: RedeFlixCheckOptions): Promise<boolean> {
  if (!opts.tmdbId) return false;
  const tmdbStr = String(opts.tmdbId).trim();
  if (!tmdbStr || tmdbStr.startsWith("tt")) return false; // Requiere ID TMDB numérico

  if (opts.type === "movie") {
    const movieSet = await getRedeflixMovieSet(opts.movieListUrl || undefined);
    return movieSet.has(tmdbStr);
  }

  if (opts.type === "tv") {
    const tvMap = await getRedeflixTvMap({
      tvUrl: opts.tvListUrl || undefined,
      animeUrl: opts.animeListUrl || undefined,
      doramaUrl: opts.doramaListUrl || undefined,
    });
    const series = tvMap.get(tmdbStr);
    if (!series) return false;

    // Si se especifican temporada y episodio, validar que existan
    if (opts.season !== undefined && opts.season !== null && opts.episode !== undefined && opts.episode !== null) {
      const sKey = String(opts.season);
      const eKey = String(opts.episode);
      const seasonEpisodes = series[sKey];
      if (!seasonEpisodes || !seasonEpisodes[eKey]) {
        return false;
      }
    }

    return true;
  }

  return false;
}

/**
 * Para pruebas unitarias e inspección de estado de caché
 */
export function getRedeflixCacheStats() {
  const defaultMovieEntry = movieCache.get(DEFAULT_REDEFLIX_MOVIE_URL);
  const defaultTvKey = `${DEFAULT_REDEFLIX_TV_URL}|${DEFAULT_REDEFLIX_ANIME_URL}|${DEFAULT_REDEFLIX_DORAMA_URL}`;
  const defaultTvEntry = tvCache.get(defaultTvKey);

  return {
    moviesCount: defaultMovieEntry ? defaultMovieEntry.set.size : 0,
    tvSeriesCount: defaultTvEntry ? defaultTvEntry.map.size : 0,
    lastMovieFetch: defaultMovieEntry?.lastFetch || 0,
    lastTvFetch: defaultTvEntry?.lastFetch || 0,
    isMoviesCached: !!defaultMovieEntry,
    isTvCached: !!defaultTvEntry,
  };
}

/**
 * Limpia el caché en memoria (útil en pruebas)
 */
export function clearRedeflixCache() {
  movieCache.clear();
  moviePromises.clear();
  tvCache.clear();
  tvPromises.clear();
}
