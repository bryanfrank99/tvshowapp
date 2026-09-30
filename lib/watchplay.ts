/**
 * Extractor de Streams Directos HLS para WatchPlay (S18)
 * Extrae streams HLS (.m3u8) fMP4 desde v2.watchplay.shop
 * para permitir reproducción nativa 100% compatible con mando de Android TV.
 */

export interface WatchPlayExtractParams {
  id: string; // IMDb (tt...) o TMDB
  type: "movie" | "tv";
  season?: number;
  episode?: number;
}

export interface WatchPlayStreamResult {
  success: boolean;
  hlsUrl?: string;
  backupHlsUrls?: string[];
  lang?: string;
  error?: string;
  debugStatus?: number;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export async function fetchWatchPlayStream(
  params: WatchPlayExtractParams
): Promise<WatchPlayStreamResult | null> {
  const { id, type, season = 1, episode = 1 } = params;
  if (!id) return null;

  const targetUrl =
    type === "tv"
      ? `https://v2.watchplay.shop/tvshow/${id}/${season}/${episode}`
      : `https://v2.watchplay.shop/movie/${id}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const headers: Record<string, string> = {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Referer: "https://v2.watchplay.shop/",
    };
    if (typeof window === "undefined") {
      headers["User-Agent"] = USER_AGENT;
    }

    const res = await fetch(targetUrl, {
      headers,
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        success: false,
        debugStatus: res.status,
        error: `HTTP ${res.status} from watchplay`,
      };
    }

    const html = await res.text();

    // 1. Extraer URL de playlist.m3u8 del script de inicialización
    const match = html.match(/url:\s*"([^"]+playlist\.m3u8[^"]*)"/i);
    if (match && match[1]) {
      const cleanUrl = match[1].replace(/\\/g, "");
      return {
        success: true,
        hlsUrl: cleanUrl,
        backupHlsUrls: [],
        lang: "pt",
      };
    }

    // 2. Fallback de expresión regular para cualquier .m3u8 en el código
    const genericM3u8 = html.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i);
    if (genericM3u8 && genericM3u8[0]) {
      return {
        success: true,
        hlsUrl: genericM3u8[0].replace(/\\/g, ""),
        backupHlsUrls: [],
        lang: "pt",
      };
    }

    return {
      success: false,
      debugStatus: res.status,
      error: "No se encontró URL .m3u8 en el código HTML de WatchPlay",
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error)?.message || "Error al conectar con WatchPlay",
    };
  }
}
