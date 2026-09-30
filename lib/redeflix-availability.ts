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
 * o enlaces con IDs de ejemplo como /movie/969681, /movie/tt6263850, /tvshow/1396/1/1, etc.
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
  // Detección de URLs con patrón puntual ingresadas como ejemplo (TMDB numérico o IMDb tt...)
  if (/\/(?:movie|filme|tv|tvshow|serie|series)\/(?:\d+|tt\d+)/i.test(clean)) {
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
  if (clean.includes("{id}") || clean.includes("{tmdb}") || clean.includes("{imdb}")) {
    return clean;
  }
  if (type === "movie") {
    if (/\/tt\d+/i.test(clean)) {
      clean = clean.replace(/(\/(?:movie|filme)\/)tt\d+(\/?$)/i, "$1{imdb}$2");
      if (!clean.includes("{imdb}")) clean = clean.replace(/\/tt\d+(\/?$)/i, "/{imdb}$1");
    } else {
      clean = clean.replace(/(\/(?:movie|filme)\/)\d+(\/?$)/i, "$1{id}$2");
      if (!clean.includes("{id}")) clean = clean.replace(/\/\d+(\/?$)/, "/{id}$1");
    }
  } else {
    if (/\/tt\d+/i.test(clean)) {
      clean = clean.replace(/(\/(?:tv|tvshow|serie|series)\/)tt\d+\/\d+\/\d+(\/?$)/i, "$1{imdb}/{s}/{e}$2");
      if (!clean.includes("{imdb}")) clean = clean.replace(/\/tt\d+\/\d+\/\d+(\/?$)/i, "/{imdb}/{s}/{e}$1");
    } else {
      clean = clean.replace(/(\/(?:tv|tvshow|serie|series)\/)\d+\/\d+\/\d+(\/?$)/i, "$1{id}/{s}/{e}$2");
      if (!clean.includes("{id}")) clean = clean.replace(/\/\d+\/\d+\/\d+(\/?$)/, "/{id}/{s}/{e}$1");
    }
  }
  return clean;
}

/**
 * Interpola una plantilla de comprobación puntual con identificadores duales (IMDb y TMDB)
 */
export function interpolateProbeUrl(
  template: string,
  params: {
    id?: string | number | null;
    tmdbId?: string | number | null;
    imdbId?: string | number | null;
    season?: string | number | null;
    episode?: string | number | null;
    needsTmdb?: boolean;
  }
): string {
  const sStr = params.season !== undefined && params.season !== null ? String(params.season) : "1";
  const eStr = params.episode !== undefined && params.episode !== null ? String(params.episode) : "1";

  let tmdbVal = params.tmdbId ? String(params.tmdbId).trim() : "";
  let imdbVal = params.imdbId ? String(params.imdbId).trim() : "";

  const rawId = params.id ? String(params.id).trim() : "";
  if (rawId) {
    if (rawId.startsWith("tt")) {
      if (!imdbVal) imdbVal = rawId;
    } else {
      if (!tmdbVal) tmdbVal = rawId;
    }
  }

  let genericIdVal = rawId;
  if (!genericIdVal) {
    if (params.needsTmdb === false && imdbVal) {
      genericIdVal = imdbVal;
    } else {
      genericIdVal = tmdbVal || imdbVal;
    }
  }

  let url = template.trim();
  if (!url.includes("{id}") && !url.includes("{tmdb}") && !url.includes("{imdb}")) {
    const isTv =
      url.includes("{s}") ||
      /\/(?:\d+|tt\d+)\/\d+\/\d+/.test(url) ||
      url.toLowerCase().includes("tv") ||
      url.toLowerCase().includes("serie");
    url = normalizeProbeUrl(url, isTv ? "tv" : "movie");
  }

  return url
    .replace(/\{tmdb\}/gi, tmdbVal || genericIdVal)
    .replace(/\{imdb\}/gi, imdbVal || genericIdVal)
    .replace(/\{id\}/gi, genericIdVal)
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
      // Realizamos GET para inspeccionar código HTTP y cuerpo de respuesta (JSON / texto)
      const res = await fetchWithTimeout(targetUrl, timeoutMs, "GET");

      if (res.status === 404) {
        probeCache.set(targetUrl, { available: false, lastCheck: Date.now() });
        return false;
      }

      if (!res.ok) {
        probeCache.set(targetUrl, { available: false, lastCheck: Date.now() });
        return false;
      }

      const text = await res.text();
      const trimmed = text.trim();
      const lowerText = trimmed.toLowerCase();

      // 1. Detección y análisis estructurado si la respuesta es JSON
      if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
        try {
          const json = JSON.parse(trimmed);

          if (Array.isArray(json)) {
            const avail = json.length > 0;
            probeCache.set(targetUrl, { available: avail, lastCheck: Date.now() });
            return avail;
          }

          if (json && typeof json === "object") {
            const statusStr = String(json.status ?? "").toLowerCase().trim();

            // Errores o rechazos explícitos
            if (["failed", "fail", "error", "not_found", "404", "false"].includes(statusStr)) {
              probeCache.set(targetUrl, { available: false, lastCheck: Date.now() });
              return false;
            }

            // Banderas de disponibilidad booleanas explícitas
            if (
              json.success === false ||
              json.success === "false" ||
              json.success === 0 ||
              json.available === false ||
              json.available === "false" ||
              json.found === false ||
              json.found === "false" ||
              json.exists === false ||
              json.exists === "false" ||
              json.has === false ||
              json.has === "false"
            ) {
              probeCache.set(targetUrl, { available: false, lastCheck: Date.now() });
              return false;
            }

            // Mensajes textuales descriptivos (ej: megaembedapi "This movie hasn't in our database")
            const msg = String(json.msg || json.message || json.error || json.description || json.detail || "").toLowerCase();
            if (
              msg.includes("hasn't") ||
              msg.includes("has not") ||
              msg.includes("not in our database") ||
              msg.includes("not in database") ||
              msg.includes("not found") ||
              msg.includes("não encontrado") ||
              msg.includes("no encontrado") ||
              msg.includes("doesn't exist") ||
              msg.includes("does not exist") ||
              msg.includes("required") ||
              msg.includes("invalid") ||
              msg.includes("no results")
            ) {
              probeCache.set(targetUrl, { available: false, lastCheck: Date.now() });
              return false;
            }

            // Si tiene status de éxito explícito
            if (
              ["success", "ok", "200", "true"].includes(statusStr) ||
              json.success === true ||
              json.success === "true" ||
              json.success === 1 ||
              json.available === true ||
              json.available === "true" ||
              json.found === true ||
              json.found === "true" ||
              json.exists === true ||
              json.exists === "true" ||
              json.has === true ||
              json.has === "true"
            ) {
              probeCache.set(targetUrl, { available: true, lastCheck: Date.now() });
              return true;
            }

            // Si data o results vienen vacíos
            if (json.data === null || (Array.isArray(json.data) && json.data.length === 0)) {
              probeCache.set(targetUrl, { available: false, lastCheck: Date.now() });
              return false;
            }
            if (json.results === null || (Array.isArray(json.results) && json.results.length === 0)) {
              probeCache.set(targetUrl, { available: false, lastCheck: Date.now() });
              return false;
            }
          }
        } catch {
          // Si el JSON falla al parsear, continúa a la verificación textual
        }
      }

      // 2. Marcadores textuales en HTML o texto plano
      const notFoundMarkers = [
        "filme não encontrado",
        "série não encontrada",
        "episódio não encontrado",
        "não encontrado",
        "not found",
        "content not found",
        "no encontrado",
        "no disponible",
        "hasn't in our database",
        "has not in our database",
        "not in our database",
        "not in database",
        "\"status\":\"failed\"",
        "\"status\": \"failed\"",
        "\"status\":\"error\"",
        "\"status\": \"error\"",
        "\"status\":404",
        "\"status\": 404",
        "\"found\":false",
        "\"found\": false",
        "\"available\":false",
        "\"available\": false",
        "\"success\":false",
        "\"success\": false",
      ];

      const isNotFound = notFoundMarkers.some((marker) => lowerText.includes(marker));
      const isAvail = !isNotFound;
      probeCache.set(targetUrl, { available: isAvail, lastCheck: Date.now() });
      return isAvail;
    } catch (err: any) {
      console.warn(`[ProbeAvailability] Error comprobando ${targetUrl}:`, err?.message || err);
      return false;
    } finally {
      probePromises.delete(targetUrl);
    }
  })();

  probePromises.set(targetUrl, promise);
  return promise;
}

let _cachedSupabaseClient: any = null;

async function getSupabaseClient() {
  if (_cachedSupabaseClient) return _cachedSupabaseClient;
  try {
    const url = process.env.SUPABASE_URL || "";
    const key = process.env.SUPABASE_SERVICE_KEY || "";
    if (!url || !key) return null;
    const { createClient } = await import("@supabase/supabase-js");
    _cachedSupabaseClient = createClient(url, key, {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
    });
    return _cachedSupabaseClient;
  } catch {
    return null;
  }
}

/**
 * Recupera el catálogo persistente desde la tabla config de Supabase
 * (utilizado como fallback ante bloqueos 403 de Cloudflare en entornos serverless/Vercel)
 */
async function fetchCatalogFromSupabase(targetUrl: string): Promise<string | null> {
  try {
    const sb = await getSupabaseClient();
    if (!sb) return null;
    const cleanUrl = String(targetUrl || "").trim().replace(/\/+$/, "");
    if (!cleanUrl) return null;
    const { data } = await sb
      .from("config")
      .select("value")
      .in("key", [`catalog_cache:${cleanUrl}`, `catalog_cache:${cleanUrl}/`])
      .limit(1);
    return data && data.length > 0 ? data[0].value : null;
  } catch {
    return null;
  }
}

/**
 * Guarda asíncronamente el catálogo en Supabase si el fetch directo tuvo éxito
 */
function saveCatalogToSupabaseAsync(targetUrl: string, content: string): void {
  if (!content || content.length < 10) return;
  (async () => {
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const cleanUrl = String(targetUrl || "").trim().replace(/\/+$/, "");
      await sb.from("config").upsert(
        [
          { key: `catalog_cache:${cleanUrl}`, value: content },
          { key: `catalog_cache:${cleanUrl}/`, value: content },
        ],
        { onConflict: "key" }
      );
    } catch {}
  })().catch(() => {});
}

/**
 * Parsea el texto del catálogo de películas (JSON array, objetos, o líneas TXT) a un Set O(1)
 */
export function parseMovieCatalogText(text: string): Set<string> {
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
            const imdb = item.id_imdb || item.imdb_id || item.imdb;
            if (imdb) movieSet.add(String(imdb).trim());
          }
        }
      } else if (parsed && typeof parsed === "object") {
        const items = parsed.items || parsed.movies || parsed.results || parsed.data;
        if (Array.isArray(items)) {
          for (const item of items) {
            if (typeof item === "object" && item) {
              const id = item.id_tmdb || item.id || item.tmdb_id || item.tmdb;
              if (id) movieSet.add(String(id).trim());
              const imdb = item.id_imdb || item.imdb_id || item.imdb;
              if (imdb) movieSet.add(String(imdb).trim());
            } else if (item) {
              movieSet.add(String(item).trim());
            }
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

  return movieSet;
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
      let text = "";
      try {
        const res = await fetchWithTimeout(targetUrl, 10000);
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status} al descargar lista de películas`);
        }
        text = await res.text();
        saveCatalogToSupabaseAsync(targetUrl, text);
      } catch (fetchErr: any) {
        // Fallback a catálogo persistente en Supabase (evita bloqueos Cloudflare 403 en Vercel)
        const sbText = await fetchCatalogFromSupabase(targetUrl);
        if (sbText) {
          text = sbText;
        } else {
          throw fetchErr;
        }
      }

      const movieSet = parseMovieCatalogText(text);
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

      const fetchJsonWithFallback = async (u: string, timeout: number) => {
        try {
          const res = await fetchWithTimeout(u, timeout);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const text = await res.text();
          saveCatalogToSupabaseAsync(u, text);
          return JSON.parse(text);
        } catch (fetchErr: any) {
          const sbText = await fetchCatalogFromSupabase(u);
          if (sbText) {
            return JSON.parse(sbText);
          }
          throw fetchErr;
        }
      };

      const fetchTargets: Promise<any>[] = [fetchJsonWithFallback(tvUrl, 15000)];
      if (animeUrl) fetchTargets.push(fetchJsonWithFallback(animeUrl, 10000));
      if (doramaUrl) fetchTargets.push(fetchJsonWithFallback(doramaUrl, 10000));

      const results = await Promise.allSettled(fetchTargets);

      for (const res of results) {
        if (res.status === "fulfilled" && res.value) {
          const val = res.value;
          const items = Array.isArray(val) ? val : Array.isArray(val.items) ? val.items : Array.isArray(val.series) ? val.series : null;

          if (items) {
            for (const item of items) {
              if (item !== null && item !== undefined) {
                if (typeof item === "number" || typeof item === "string") {
                  const idStr = String(item).trim();
                  if (idStr) {
                    tvMap.set(idStr, { "*": { "*": "1" } });
                  }
                  continue;
                }

                const tmdbKey = String(
                  item.id_tmdb || item.tmdb_id || (String(item.id || "").startsWith("tt") ? "" : item.id || "")
                ).trim();
                const imdbKey = String(
                  item.id_imdb || item.imdb_id || item.imdb || (String(item.id || "").startsWith("tt") ? item.id : "")
                ).trim();
                const incoming = item.episodios || item.episodes || { "*": { "*": "1" } };

                if (tmdbKey) {
                  const existingSeries = tvMap.get(tmdbKey) || {};
                  for (const seasonKey of Object.keys(incoming)) {
                    existingSeries[seasonKey] = {
                      ...(existingSeries[seasonKey] || {}),
                      ...incoming[seasonKey],
                    };
                  }
                  tvMap.set(tmdbKey, existingSeries);
                }
                if (imdbKey) {
                  const existingSeries = tvMap.get(imdbKey) || {};
                  for (const seasonKey of Object.keys(incoming)) {
                    existingSeries[seasonKey] = {
                      ...(existingSeries[seasonKey] || {}),
                      ...incoming[seasonKey],
                    };
                  }
                  tvMap.set(imdbKey, existingSeries);
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
  imdbId?: string | number | null;
  season?: string | number | null;
  episode?: string | number | null;
  movieListUrl?: string | null;
  tvListUrl?: string | null;
  animeListUrl?: string | null;
  doramaListUrl?: string | null;
  needsTmdb?: boolean;
}

/**
 * Consulta si un contenido específico está disponible mediante Probe URL, API o listas de catálogo en lote.
 * Admite búsqueda por TMDB ID, IMDb ID o ambos simultáneamente.
 */
export async function isRedeflixAvailable(opts: RedeFlixCheckOptions): Promise<boolean> {
  let tmdbStr = opts.tmdbId ? String(opts.tmdbId).trim() : "";
  let imdbStr = opts.imdbId ? String(opts.imdbId).trim() : "";

  // Si tmdbId tiene formato "tt...", moverlo a imdbStr
  if (tmdbStr.startsWith("tt")) {
    if (!imdbStr) imdbStr = tmdbStr;
    tmdbStr = "";
  }
  // Si imdbId es numérico puro, moverlo a tmdbStr
  if (imdbStr && /^\d+$/.test(imdbStr)) {
    if (!tmdbStr) tmdbStr = imdbStr;
    imdbStr = "";
  }

  // Si no disponemos de ningún ID, no es posible verificar
  if (!tmdbStr && !imdbStr) return false;

  if (opts.type === "movie") {
    const movieUrl = opts.movieListUrl || "";
    // Modalidad 1: Link de comprobación puntual (Probe URL / API)
    if (isProbeUrl(movieUrl)) {
      const targetProbe = interpolateProbeUrl(movieUrl, {
        tmdbId: tmdbStr,
        imdbId: imdbStr,
        id: opts.needsTmdb === false && imdbStr ? imdbStr : (tmdbStr || imdbStr),
        needsTmdb: opts.needsTmdb,
      });
      return probeUrlAvailability(targetProbe);
    }

    // Modalidad 2: Lista en lote (TXT / JSON completo)
    const movieSet = await getRedeflixMovieSet(movieUrl || undefined);
    // Verificamos coincidencia por TMDB o por IMDb
    if (tmdbStr && movieSet.has(tmdbStr)) return true;
    if (imdbStr && movieSet.has(imdbStr)) return true;
    return false;
  }

  if (opts.type === "tv") {
    const tvUrl = opts.tvListUrl || "";
    // Modalidad 1: Link de comprobación puntual (Probe URL / API)
    if (isProbeUrl(tvUrl)) {
      const targetProbe = interpolateProbeUrl(tvUrl, {
        tmdbId: tmdbStr,
        imdbId: imdbStr,
        id: opts.needsTmdb === false && imdbStr ? imdbStr : (tmdbStr || imdbStr),
        season: opts.season,
        episode: opts.episode,
        needsTmdb: opts.needsTmdb,
      });
      return probeUrlAvailability(targetProbe);
    }

    // Modalidad 2: Lista en lote (JSON / TXT completo)
    const tvMap = await getRedeflixTvMap({
      tvUrl: tvUrl || undefined,
      animeUrl: opts.animeListUrl || undefined,
      doramaUrl: opts.doramaListUrl || undefined,
    });
    const series = (tmdbStr && tvMap.get(tmdbStr)) || (imdbStr && tvMap.get(imdbStr));
    if (!series) return false;

    // Si se especifican temporada y episodio, validar que existan
    if (opts.season !== undefined && opts.season !== null && opts.episode !== undefined && opts.episode !== null) {
      if (series["*"]) {
        return true;
      }
      const sKey = String(opts.season);
      const eKey = String(opts.episode);
      const seasonEpisodes = series[sKey];
      if (seasonEpisodes && seasonEpisodes["*"]) {
        return true;
      }
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
