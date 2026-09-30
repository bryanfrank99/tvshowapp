export interface CinecalidadEmbed {
  url: string;
  server?: string;
  host?: string;
  lang?: string;
  quality?: string;
  subtitle?: boolean;
}

export interface CinecalidadFetchOptions {
  type: "movie" | "tv";
  tmdbId: string | number;
  season?: number;
  episode?: number;
  timeoutMs?: number;
}

const cinecalidadCache = new Map<string, { embeds: CinecalidadEmbed[]; lastFetch: number }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutos

/**
 * Consulta la API de Cinecalidad y retorna la lista de embeds disponibles
 */
export async function fetchCinecalidadEmbeds(
  opts: CinecalidadFetchOptions
): Promise<CinecalidadEmbed[]> {
  const tmdbId = String(opts.tmdbId || "").trim();
  if (!tmdbId || tmdbId.startsWith("tt")) return [];

  const s = opts.season ? parseInt(String(opts.season), 10) : 1;
  const e = opts.episode ? parseInt(String(opts.episode), 10) : 1;

  const cacheKey = `${opts.type}:${tmdbId}:${opts.type === "tv" ? `${s}:${e}` : ""}`;
  const now = Date.now();
  const cached = cinecalidadCache.get(cacheKey);
  if (cached && now - cached.lastFetch < CACHE_TTL_MS) {
    return cached.embeds;
  }

  const kind = opts.type === "tv" ? "tvshow" : "movie";
  const targetApiUrl =
    opts.type === "tv"
      ? `https://tmdb.cinecalidad.am/v1/playback/tvshow/${tmdbId}?season=${s}&episode=${e}`
      : `https://tmdb.cinecalidad.am/v1/playback/movie/${tmdbId}`;

  const timeoutMs = opts.timeoutMs || 6000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(targetApiUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://cinecalidad.am/",
        Accept: "application/json",
      },
    });

    if (res.status === 404 || !res.ok) {
      cinecalidadCache.set(cacheKey, { embeds: [], lastFetch: now });
      return [];
    }

    const data = await res.json();
    const embeds: CinecalidadEmbed[] = Array.isArray(data.embeds) ? data.embeds : [];

    cinecalidadCache.set(cacheKey, { embeds, lastFetch: now });
    return embeds;
  } catch (err: any) {
    console.warn(`[Cinecalidad] Error al obtener embeds para ${cacheKey}:`, err?.message || err);
    return [];
  } finally {
    clearTimeout(timer);
  }
}
