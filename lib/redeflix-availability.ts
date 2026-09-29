/**
 * Módulo de verificación de disponibilidad de catálogo flexible:
 * 1. Links de comprobación puntual (Probe URLs / APIs por título):
 *    ej. https://v2.watchplay.shop/movie/{id} o https://v2.watchplay.shop/movie/969681
 *    ej. https://v2.watchplay.shop/tvshow/{id}/{s}/{e} o https://v2.watchplay.shop/tvshow/1396/1/1
 * 2. Catálogos en lote completos en JSON (arrays de IDs, arrays de objetos, o formato con items)
 * 3. Listas en lote en TXT (líneas con IDs TMDB)
 *
 * Mantiene cachés en memoria eficientes con TTL y deduplicación de peticiones en vuelo.
 */

export const DEFAULT_REDEFLIX_MOVIE_URL = "https://redeflixapi.store/list-movie-ids.txt";
export const DEFAULT_REDEFLIX_TV_URL = "https://redeflixapi.store/list-tv-ids.txt";
export const DEFAULT_REDEFLIX_ANIME_URL = "https://redeflixapi.store/list-anime-ids.txt";
export const DEFAULT_REDEFLIX_DORAMA_URL = "https://redeflixapi.store/list-dorama-ids.txt";

const BATCH_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas para listas completas en lote
const PROBE_CACHE_TTL_MS = 30 * 60 * 1000;      // 30 minutos para comprobaciones puntuales

// Cachés por URL en memoria
const movieCache = new Map<string, { set: Set<string>; lastFetch: number }>();
const moviePromises = new Map<string, Promise<Set<string>>>();

const tvCache = new Map<string, { map: Map<string, Record<string, Record<string, string>>>; lastFetch: number }>();
const tvPromises = new Map<string, Promise<Map<string, Record<string, Record<string, string>>>>>();

// Caché de comprobaciones puntuales (Probe URLs)
const probeCache = new Map<string, { available: boolean; lastCheck: number }>();
const probePromises = new Map<string, Promise<boolean>>();

/**
 * Detecta si una URL es una plantilla de comprobación puntual (Probe URL)
 * Soporta placeholders: {id}, {tmdb}, {imdb}, {s}, {season}, {e}, {episode}
 * o enlaces con IDs numéricos de ejemplo como /movie/969681 o /tvshow/1396/1/1
 */
export function isProbeUrl(url?: string | null): boolean {
  if (!url) return false;
  const clean = String(url).trim().toLowerCase();
  if (
    clean.includes("{id}") ||
    clean.includes("{tmdb}") ||
    clean.includes("{imdb}") ||
    clean.includes("{s}") ||
    clean.includes("{season}") ||
    clean.includes("{e}") ||
    clean.includes("{episode}")
  ) {
    return true;
  }
  // Detección de URLs con patrón puntual ingresadas como ejemplo
  if (/\/(?:movie|filme|tv|tvshow|serie|series)\/\d+/i.test(clean)) {
    return true;
  }
  return false;
}

/**
 * Normaliza una URL de comprobación puntual con IDs de ejemplo a formato plantilla con placeholders
 */
export function normalizeProbeUrl(url: string, type: "movie" | "tv"): string {
  if (!url) return "";
  let clean = url.trim();
  if (clean.includes("{id}") || clean.includes("{tmdb}")) {
    return clean;
  }
  if (type === "movie") {
    clean = clean.replace(/(\/(?:movie|filme)\/)\d+(\/?$)/i, "$1{id}$2");
    if (!clean.includes("{id}")) {
      clean = clean.replace(/\/\d+(\/?$)/, "/{id}$1");
    }
  } else {
    clean = clean.replace(/(\/(?:tv|tvshow|serie|series)\/)\d+\/\d+\/\d+(\/?$)/i, "$1{id}/{s}/{e}$2");
    if (!clean.includes("{id}")) {
      clean = clean.replace(/\/\d+\/\d+\/\d+(\/?$)/, "/{id}/{s}/{e}$1");
    }
  }
  return clean;
}

/**
 * Interpola una plantilla de comprobación puntual con los identificadores del título
 */
export function interpolateProbeUrl(
  template: string,
  params: { id: string | number; season?: string | number | null; episode?: string | number | null }
): string {
  const sStr = params.season !== undefined && params.season !== null ? String(params.season) : "1";
  const eStr = params.episode !== undefined && params.episode !== null ? String(params.episode) : "1";
  const idStr = String(params.id || "").trim();

  let url = template.trim();
  if (!url.includes("{id}") && !url.includes("{tmdb}")) {
    const isTv =
      url.includes("{s}") ||
      /\/\d+\/\d+\/\d+/.test(url) ||
      url.toLowerCase().includes("tv") ||
      url.toLowerCase().includes("serie");
    url = normalizeProbeUrl(url, isTv ? "tv" : "movie");
  }

  return url
    .replace(/\{id\}/gi, idStr)
    .replace(/\{tmdb\}/gi, idStr)
    .replace(/\{imdb\}/gi, idStr)
    .replace(/\{s\}/gi, sStr)
    .replace(/\{season\}/gi, sStr)
    .replace(/\{e\}/gi, eStr)
    .replace(/\{episode\}/gi, eStr);
}

/**
 * Detecta si un proveedor corresponde a RedeFlix o tiene comprobación de disponibilidad configurada
 */
export function isRedeflixProvider(
  p: {
    id?: string;
    movie_tpl?: string;
    tv_tpl?: string;
    movie_list_url?: string;
    tv_list_url?: string;
    anime_list_url?: string;
    dorama_list_url?: string;
  } | null | undefined
): boolean {
  if (!p) return false;
  const id = String(p.id || "").toLowerCase();
  if (id === "redeflix") return true;
  const movieTpl = String(p.movie_tpl || "").toLowerCase();
  const tvTpl = String(p.tv_tpl || "").toLowerCase();
  if (movieTpl.includes("redeflixapi.store") || tvTpl.includes("redeflixapi.store")) return true;
  if (p.movie_list_url || p.tv_list_url || p.anime_list_url || p.dorama_list_url) return true;
  return false;
}

/**
 * Helper con timeout y método para peticiones fetch
 */
async function fetchWithTimeout(
  url: string,
  timeoutMs: number = 8000,
  method: string = "GET"
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) TVShow/7.52.0",
        Accept: "*/*",
      },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Comprueba la disponibilidad de un título puntual mediante Probe URL (HEAD/GET)
 */
export async function probeUrlAvailability(targetUrl: string, timeoutMs: number = 4000): Promise<boolean> {
  const now = Date.now();
  const cached = probeCache.get(targetUrl);
  if (cached && now - cached.lastCheck < PROBE_CACHE_TTL_MS) {
    return cached.available;
  }

  const inFlight = probePromises.get(targetUrl);
  if (inFlight) return inFlight;

  const promise = (async () => {
    try {
      // 1. Intentar primero con HEAD para máxima velocidad
      let res: Response | null = null;
      try {
        const headRes = await fetchWithTimeout(targetUrl, timeoutMs, "HEAD");
        if (headRes.status === 200) {
          probeCache.set(targetUrl, { available: true, lastCheck: Date.now() });
          return true;
        }
        if (headRes.status === 404) {
          probeCache.set(targetUrl, { available: false, lastCheck: Date.now() });
          return false;
        }
        if (headRes.status !== 405) {
          res = headRes;
        }
      } catch {
        // En caso de fallo o bloqueo de HEAD, intentamos GET
      }

      if (!res || res.status === 405) {
        res = await fetchWithTimeout(targetUrl, timeoutMs, "GET");
      }

      if (res.status === 404) {
        probeCache.set(targetUrl, { available: false, lastCheck: Date.now() });
        return false;
      }

      if (res.ok) {
        const text = await res.text();
        const lowerText = text.toLowerCase();
        const notFoundMarkers = [
          "filme não encontrado",
          "série não encontrada",
          "episódio não encontrado",
          "não encontrado",
          "not found",
          "content not found",
          "\"status\":404",
          "\"found\":false",
          "\"available\":false",
          "\"success\":false",
        ];
        const isNotFound = notFoundMarkers.some((marker) => lowerText.includes(marker));
        const isAvail = !isNotFound;
        probeCache.set(targetUrl, { available: isAvail, lastCheck: Date.now() });
        return isAvail;
      }

      probeCache.set(targetUrl, { available: false, lastCheck: Date.now() });
      return false;
    } catch (err: any) {
      console.warn(`[ProbeAvailability] Error comprobando ${targetUrl}:`, err?.message || err);
      // Fallback resiliente: no bloquear el servidor si ocurre error temporal de conexión
      return true;
    } finally {
      probePromises.delete(targetUrl);
    }
  })();

  probePromises.set(targetUrl, promise);
  return promise;
}

/**
 * Obtiene el Set O(1) de películas para la URL en lote indicada (TXT o JSON)
 */
export async function getRedeflixMovieSet(url: string = DEFAULT_REDEFLIX_MOVIE_URL): Promise<Set<string>> {
  const targetUrl = url || DEFAULT_REDEFLIX_MOVIE_URL;
  const now = Date.now();
  const existing = movieCache.get(targetUrl);
  if (existing && now - existing.lastFetch < BATCH_CACHE_TTL_MS) {
    return existing.set;
  }

  const inFlight = moviePromises.get(targetUrl);
  if (inFlight) {
    return inFlight;
  }

  const promise = (async () => {
    try {
      const res = await fetchWithTimeout(targetUrl, 10000);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status} al descargar lista de películas`);
      }
      const text = await res.text();
      const movieSet = new Set<string>();
      const trimmed = text.trim();

      // Detección y parseo de formato JSON
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (typeof item === "string" || typeof item === "number") {
                const s = String(item).trim();
                if (s) movieSet.add(s);
              } else if (item && typeof item === "object") {
                const id = item.id_tmdb || item.id || item.tmdb_id || item.tmdb;
                if (id) movieSet.add(String(id).trim());
              }
            }
          } else if (parsed && typeof parsed === "object") {
            const items = parsed.items || parsed.movies || parsed.results || parsed.data;
            if (Array.isArray(items)) {
              for (const item of items) {
                const id = typeof item === "object" ? (item?.id_tmdb || item?.id || item?.tmdb_id) : item;
                if (id) movieSet.add(String(id).trim());
              }
            } else {
              for (const k of Object.keys(parsed)) {
                if (k && k !== "status" && k !== "success" && k !== "count") {
                  movieSet.add(String(k).trim());
                }
              }
            }
          }
        } catch {}
      }

      // Si no es JSON o el set quedó vacío, procesar como líneas TXT
      if (movieSet.size === 0) {
        const lines = text.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const id = lines[i].trim();
          if (id) {
            movieSet.add(id);
          }
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
 * Obtiene el Map O(1) de series y episodios para las URLs en lote indicadas
 */
export async function getRedeflixTvMap(urls?: TvFetchUrls): Promise<Map<string, Record<string, Record<string, string>>>> {
  const tvUrl = urls?.tvUrl || DEFAULT_REDEFLIX_TV_URL;
  const animeUrl = urls?.animeUrl || (tvUrl === DEFAULT_REDEFLIX_TV_URL ? DEFAULT_REDEFLIX_ANIME_URL : "");
  const doramaUrl = urls?.doramaUrl || (tvUrl === DEFAULT_REDEFLIX_TV_URL ? DEFAULT_REDEFLIX_DORAMA_URL : "");

  const cacheKey = `${tvUrl}|${animeUrl}|${doramaUrl}`;
  const now = Date.now();
  const existing = tvCache.get(cacheKey);
  if (existing && now - existing.lastFetch < BATCH_CACHE_TTL_MS) {
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
        if (res.status === "fulfilled" && res.value) {
          const val = res.value;
          const items = Array.isArray(val) ? val : Array.isArray(val.items) ? val.items : Array.isArray(val.series) ? val.series : null;

          if (items) {
            for (const item of items) {
              if (item) {
                const tmdbKey = String(item.id_tmdb || item.id || item.tmdb_id || "");
                if (tmdbKey) {
                  const existingSeries = tvMap.get(tmdbKey) || {};
                  const incoming = item.episodios || item.episodes || {};
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
 * Consulta si un contenido específico está disponible mediante Probe URL, API o listas de catálogo en lote
 */
export async function isRedeflixAvailable(opts: RedeFlixCheckOptions): Promise<boolean> {
  if (!opts.tmdbId) return false;
  const tmdbStr = String(opts.tmdbId).trim();
  if (!tmdbStr || tmdbStr.startsWith("tt")) return false; // Requiere ID TMDB numérico

  if (opts.type === "movie") {
    const movieUrl = opts.movieListUrl || "";
    // Modalidad 1: Link de comprobación puntual (Probe URL / API)
    if (isProbeUrl(movieUrl)) {
      const targetProbe = interpolateProbeUrl(movieUrl, { id: tmdbStr });
      return probeUrlAvailability(targetProbe);
    }

    // Modalidad 2: Lista en lote (TXT / JSON completo)
    const movieSet = await getRedeflixMovieSet(movieUrl || undefined);
    return movieSet.has(tmdbStr);
  }

  if (opts.type === "tv") {
    const tvUrl = opts.tvListUrl || "";
    // Modalidad 1: Link de comprobación puntual (Probe URL / API)
    if (isProbeUrl(tvUrl)) {
      const targetProbe = interpolateProbeUrl(tvUrl, {
        id: tmdbStr,
        season: opts.season,
        episode: opts.episode,
      });
      return probeUrlAvailability(targetProbe);
    }

    // Modalidad 2: Lista en lote (JSON / TXT completo)
    const tvMap = await getRedeflixTvMap({
      tvUrl: tvUrl || undefined,
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
 * Alias moderno para mayor claridad
 */
export const checkCatalogAvailability = isRedeflixAvailable;

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
    probeCacheCount: probeCache.size,
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
  probeCache.clear();
  probePromises.clear();
}
