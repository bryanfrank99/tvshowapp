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

export function detectCinecalidadHost(url: string, rawHost?: string, rawServer?: string): string {
  const hostMatch = url.match(/https?:\/\/(?:www\.)?([^\/]+)/i)?.[1]?.toLowerCase() || "";
  if (hostMatch.includes("vimeos") || hostMatch.includes("vimeus")) return "Vimeos";
  if (hostMatch.includes("goodstream")) return "Goodstream";
  if (hostMatch.includes("filelions")) return "Filelions";
  if (hostMatch.includes("streamtape")) return "Streamtape";
  if (hostMatch.includes("streamwish") || hostMatch.includes("wishembed")) return "Streamwish";
  if (hostMatch.includes("voe.")) return "Voe";
  if (hostMatch.includes("vidhide")) return "Vidhide";
  if (hostMatch.includes("uqload")) return "Uqload";

  const fallback = (rawHost || rawServer || "").trim();
  if (!fallback || fallback.toLowerCase().includes("online")) {
    return "Cinecalidad";
  }
  return fallback.charAt(0).toUpperCase() + fallback.slice(1);
}

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
      ? `https://tmdb.allcalidad.re/v1/playback/tvshow/${tmdbId}?season=${s}&episode=${e}`
      : `https://tmdb.allcalidad.re/v1/playback/movie/${tmdbId}`;

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
    const rawEmbeds: any[] = Array.isArray(data.embeds) ? data.embeds : [];
    const embeds: CinecalidadEmbed[] = rawEmbeds.map((emb: any) => ({
      url: emb.url,
      server: emb.server || "Online",
      host: detectCinecalidadHost(emb.url, emb.host, emb.server),
      lang: emb.lang || "Latino",
      quality: emb.quality || "HD",
      subtitle: Boolean(emb.subtitle),
    }));

    cinecalidadCache.set(cacheKey, { embeds, lastFetch: now });
    return embeds;
  } catch (err: any) {
    console.warn(`[Cinecalidad] Error al obtener embeds para ${cacheKey}:`, err?.message || err);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export interface CinecalidadSubtitleTrack {
  file: string;
  label: string;
  kind?: string;
  default?: boolean;
}

export interface CinecalidadStreamResult {
  success: boolean;
  hlsUrl?: string;
  backupHlsUrls?: string[];
  subtitles?: CinecalidadSubtitleTrack[];
  lang?: string;
  embeds?: CinecalidadEmbed[];
  error?: string;
}

/**
 * Desempaqueta scripts ofuscados con eval(function(p,a,c,k,e,d))
 */
function unpackScript(p: string, a: number, c: number, k: string[]): string {
  while (c--) {
    if (k[c]) {
      p = p.replace(new RegExp('\\b' + c.toString(a) + '\\b', 'g'), k[c]);
    }
  }
  return p;
}

/**
 * Extrae el stream HLS directo y subtítulos desde un embed de Vimeos
 */
async function extractVimeosStream(embedUrl: string, timeoutMs: number = 6000): Promise<{ hlsUrl?: string; subtitles?: CinecalidadSubtitleTrack[] } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(embedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Referer: "https://cinecalidad.am/",
      },
    });

    if (!res.ok) return null;
    const html = await res.text();

    const regex = /eval\(function\(p,a,c,k,e,d\)\{[\s\S]*?\}\('([\s\S]*?)',(\d+),(\d+),'([\s\S]*?)'\.split\('\|'\)/;
    const match = html.match(regex);
    if (!match) return null;

    const [_, p, a, c, kStr] = match;
    const unpacked = unpackScript(p, parseInt(a, 10), parseInt(c, 10), kStr.split("|"));

    const m3u8Match = unpacked.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
    if (!m3u8Match) return null;

    const subtitles: CinecalidadSubtitleTrack[] = [];
    const tracksMatch = unpacked.match(/tracks\s*:\s*\[([\s\S]*?)\]/);
    if (tracksMatch && tracksMatch[1]) {
      const trackRegex = /\{file:\s*"([^"]+)",label:\s*"([^"]+)"(?:,kind:\s*"([^"]+)")?(?:,"default":\s*(true|false))?\}/g;
      let tm;
      while ((tm = trackRegex.exec(tracksMatch[1])) !== null) {
        if (tm[1] && !tm[1].includes("empty.srt")) {
          subtitles.push({
            file: tm[1],
            label: tm[2] || "Subtítulo",
            kind: tm[3] || "captions",
            default: tm[4] === "true",
          });
        }
      }
    }

    return {
      hlsUrl: m3u8Match[0],
      subtitles,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extrae el stream directo HLS (.m3u8) para Cinecalidad (S19).
 * Permite reproducción nativa en Android TV, WebOS, Tizen y navegadores modernos sin iframes.
 */
export async function fetchCinecalidadStream(
  opts: CinecalidadFetchOptions
): Promise<CinecalidadStreamResult | null> {
  const embeds = await fetchCinecalidadEmbeds(opts);
  if (!embeds || embeds.length === 0) {
    return {
      success: false,
      error: "No se encontraron embeds en Cinecalidad para este contenido",
    };
  }

  // 1. Priorizar host Vimeos que entrega streams HLS directos con audio Latino
  const vimeosEmbed = embeds.find(
    (e) => String(e.host || e.url).toLowerCase().includes("vimeos")
  );

  if (vimeosEmbed) {
    const extracted = await extractVimeosStream(vimeosEmbed.url, opts.timeoutMs);
    if (extracted?.hlsUrl) {
      return {
        success: true,
        hlsUrl: extracted.hlsUrl,
        backupHlsUrls: [],
        subtitles: extracted.subtitles,
        lang: "es",
        embeds,
      };
    }
  }

  // 2. Si no es Vimeos o falló, buscar cualquier otro embed que contenga .m3u8 directo
  for (const emb of embeds) {
    if (emb.url.includes(".m3u8")) {
      return {
        success: true,
        hlsUrl: emb.url,
        backupHlsUrls: [],
        lang: "es",
        embeds,
      };
    }
  }

  return {
    success: false,
    embeds,
    error: "No se pudo extraer stream HLS directo; usar reproductor iframe como respaldo",
  };
}
