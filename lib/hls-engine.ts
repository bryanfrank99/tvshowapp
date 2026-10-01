/**
 * Motor Dinámico de Extracción de Streams HLS (Spec 096)
 * Permite ejecutar extracciones de streams HLS directos basadas en configuraciones JSON
 * almacenadas en la base de datos, con soporte para recetas (presets) y personalización total
 * de cabeceras, endpoints, regex y mapeos sin editar código.
 */

import { fetchCinecalidadStream } from "./cinecalidad";
import { fetchNasriPlayStream } from "./nasriplay";
import { fetchMegaEmbedStream } from "./megaembed";
import { fetchWatchPlayStream } from "./watchplay";

export interface ExtractorConfig {
  preset?: "vimeos_json" | "nasriplay_token" | "playerflix" | "megaembed" | "watchplay" | "direct_m3u8" | "custom_api";
  movie_api_url?: string;
  tv_api_url?: string;
  request?: {
    method?: "GET" | "POST";
    headers?: Record<string, string>;
  };
  mapping?: {
    hls_regex?: string;
    json_path?: string;
    backup_paths?: string[];
    embeds_path?: string;
  };
  options?: {
    timeout_ms?: number;
    cors_proxy?: boolean;
  };
}

export interface HlsExtractionResult {
  success: boolean;
  hlsUrl?: string;
  backupHlsUrls?: string[];
  embeds?: Array<{
    name: string;
    server?: string;
    host?: string;
    language?: string;
    url: string;
  }>;
  title?: string;
  error?: string;
  durationMs: number;
  status?: number;
}

export interface RunHlsExtractorParams {
  providerId: string;
  config?: ExtractorConfig;
  movieTpl?: string;
  tvTpl?: string;
  type: "movie" | "tv";
  id: string; // TMDB ID
  season?: number;
  episode?: number;
}

export const EXTRACTOR_PRESETS: Record<string, { label: string; description: string; template: ExtractorConfig }> = {
  vimeos_json: {
    label: "Cinecalidad (AllCalidad / Vimeos HLS)",
    description: "Consulta endpoint de playback JSON y extrae stream maestro HLS de Vimeos con audio Latino.",
    template: {
      preset: "vimeos_json",
      movie_api_url: "https://tmdb.allcalidad.re/v1/playback/movie/{id}",
      tv_api_url: "https://tmdb.allcalidad.re/v1/playback/tvshow/{id}?season={s}&episode={e}",
      request: {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": "https://cinecalidad.am/"
        }
      },
      options: {
        timeout_ms: 7000
      }
    }
  },
  nasriplay_token: {
    label: "NasriPlay (Token Chain + Multi-Mirror)",
    description: "Obtiene PAGE_TOKEN del iframe, consulta fuentes y extrae streams HLS con failover de múltiples mirrors.",
    template: {
      preset: "nasriplay_token",
      movie_api_url: "https://nsrplay.space/embed/movie/{id}",
      tv_api_url: "https://nsrplay.space/embed/tv/{id}/{s}/{e}",
      request: {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      },
      options: {
        timeout_ms: 8000
      }
    }
  },
  playerflix: {
    label: "PlayerFlix (API fMP4 / HLS)",
    description: "Endpoint proxy de streams PlayerFlix con redirect y soporte para audio Portugués e Inglés.",
    template: {
      preset: "playerflix",
      movie_api_url: "/api/playerflix?type=movie&id={id}&redirect=1",
      tv_api_url: "/api/playerflix?type=tv&id={id}&s={s}&e={e}&redirect=1",
      request: {
        method: "GET"
      },
      options: {
        timeout_ms: 6000
      }
    }
  },
  megaembed: {
    label: "MegaEmbed (fMP4 / HLS con bypass)",
    description: "Extractor fMP4 para servidores MegaEmbed con headers de bypass.",
    template: {
      preset: "megaembed",
      movie_api_url: "https://mgeb.top/embed/{id}",
      tv_api_url: "https://mgeb.top/embed/{id}/{s}/{e}",
      request: {
        method: "GET"
      },
      options: {
        timeout_ms: 7000
      }
    }
  },
  watchplay: {
    label: "WatchPlay (fMP4 / HLS Portugués)",
    description: "Extractor nativo para servidores WatchPlay.",
    template: {
      preset: "watchplay",
      movie_api_url: "https://v2.watchplay.shop/movie/{id}",
      tv_api_url: "https://v2.watchplay.shop/tvshow/{id}/{s}/{e}",
      request: {
        method: "GET"
      },
      options: {
        timeout_ms: 7000
      }
    }
  },
  direct_m3u8: {
    label: "Directo (.m3u8 / Stream URL)",
    description: "La plantilla de URL devuelve directamente una URL de stream HLS reproducible sin intermediarios.",
    template: {
      preset: "direct_m3u8",
      movie_api_url: "https://cdn.ejemplo.com/hls/movies/{id}/index.m3u8",
      tv_api_url: "https://cdn.ejemplo.com/hls/series/{id}/{s}/{e}/index.m3u8",
      options: {
        timeout_ms: 5000
      }
    }
  },
  custom_api: {
    label: "Personalizado (API JSON / Regex)",
    description: "Realiza una petición HTTP personalizada y extrae la URL del stream mediante JSONPath o Expresión Regular.",
    template: {
      preset: "custom_api",
      movie_api_url: "https://api.ejemplo.com/stream?tmdb={id}",
      tv_api_url: "https://api.ejemplo.com/stream?tmdb={id}&season={s}&episode={e}",
      request: {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json"
        }
      },
      mapping: {
        json_path: "data.stream_url",
        hls_regex: "https?://[^\"']+\\.m3u8[^\"']*"
      },
      options: {
        timeout_ms: 6000
      }
    }
  }
};

/**
 * Resuelve una ruta anidada en un objeto JSON (ej: "data.embeds[0].url" o "data.stream")
 */
function getByPath(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const parts = path.replace(/\[(\w+)\]/g, ".$1").replace(/^\./, "").split(".");
  let curr = obj;
  for (const part of parts) {
    if (curr === null || curr === undefined) return undefined;
    curr = curr[part];
  }
  return curr;
}

/**
 * Valida si un stream HLS responde HTTP 200/206 y no es una página HTML de error
 */
async function verifyHlsUrl(url: string, headers: Record<string, string> = {}): Promise<boolean> {
  if (!url || typeof url !== "string") return false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Range: "bytes=0-1024",
        ...headers,
      },
    });
    clearTimeout(t);
    if (res.status === 200 || res.status === 206) {
      const cType = (res.headers.get("content-type") || "").toLowerCase();
      if (cType.includes("text/html") && !url.includes(".m3u8")) return false;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Ejecuta la extracción de streams HLS utilizando la configuración dinámica del proveedor.
 */
export async function runHlsExtractor(params: RunHlsExtractorParams): Promise<HlsExtractionResult> {
  const startTime = Date.now();
  const { providerId, config, movieTpl, tvTpl, type, id, season = 1, episode = 1 } = params;

  if (!id) {
    return {
      success: false,
      error: "ID TMDB faltante",
      durationMs: Date.now() - startTime,
    };
  }

  const cleanId = String(id).trim();
  const s = parseInt(String(season), 10) || 1;
  const e = parseInt(String(episode), 10) || 1;

  // Determinar preset de extracción (por config o inferido por ID de proveedor)
  let effectivePreset = config?.preset;
  if (!effectivePreset) {
    if (providerId === "cinecalidad") effectivePreset = "vimeos_json";
    else if (providerId === "nasriplay") effectivePreset = "nasriplay_token";
    else if (providerId === "playerflix") effectivePreset = "playerflix";
    else if (providerId === "megaembed") effectivePreset = "megaembed";
    else if (providerId === "watchplay" || providerId === "EmbedMovies-V2") effectivePreset = "watchplay";
    else effectivePreset = "direct_m3u8";
  }

  const timeoutMs = config?.options?.timeout_ms || 8000;

  try {
    // PRESET 1: Vimeos JSON (Cinecalidad / AllCalidad)
    if (effectivePreset === "vimeos_json") {
      const res = await fetchCinecalidadStream({ type, tmdbId: cleanId, season: s, episode: e });
      const durationMs = Date.now() - startTime;
      if (res && res.success && res.hlsUrl) {
        return {
          success: true,
          hlsUrl: res.hlsUrl,
          backupHlsUrls: res.backupHlsUrls || [],
          embeds: res.embeds?.map((emb) => ({
            name: emb.host || emb.server || "Cinecalidad",
            server: emb.server,
            host: emb.host,
            language: emb.lang || "Latino",
            url: emb.url,
          })),
          durationMs,
        };
      }
      return {
        success: false,
        embeds: res?.embeds?.map((emb) => ({
          name: emb.host || emb.server || "Cinecalidad",
          server: emb.server,
          host: emb.host,
          language: emb.lang || "Latino",
          url: emb.url,
        })),
        error: res?.error || "No se encontró stream HLS en Cinecalidad",
        durationMs,
      };
    }

    // PRESET 2: NasriPlay Token Chain con Multi-Mirror
    if (effectivePreset === "nasriplay_token") {
      const res = await fetchNasriPlayStream({ type, id: cleanId, season: s, episode: e, timeoutMs });
      const durationMs = Date.now() - startTime;
      if (res && res.success && res.hlsUrl) {
        return {
          success: true,
          hlsUrl: res.hlsUrl,
          backupHlsUrls: res.backupHlsUrls || [],
          embeds: res.embeds,
          title: res.title,
          durationMs,
        };
      }
      return {
        success: false,
        embeds: res?.embeds,
        error: res?.error || "No se encontró stream HLS en NasriPlay",
        durationMs,
      };
    }

    // PRESET 3: PlayerFlix
    if (effectivePreset === "playerflix") {
      const template = type === "tv" ? (config?.tv_api_url || tvTpl) : (config?.movie_api_url || movieTpl);
      const url = (template || "/api/playerflix?type={type}&id={id}")
        .replace("{type}", type)
        .replace("{id}", cleanId)
        .replace("{s}", String(s))
        .replace("{e}", String(e));

      const durationMs = Date.now() - startTime;
      return {
        success: true,
        hlsUrl: url,
        backupHlsUrls: [],
        durationMs,
      };
    }

    // PRESET 4: MegaEmbed
    if (effectivePreset === "megaembed") {
      const res = await fetchMegaEmbedStream({ id: cleanId, type, season: s, episode: e });
      const durationMs = Date.now() - startTime;
      if (res && res.success && res.hlsUrl) {
        return {
          success: true,
          hlsUrl: res.hlsUrl,
          backupHlsUrls: res.backupHlsUrls || [],
          durationMs,
        };
      }
      return {
        success: false,
        error: res?.error || "MegaEmbed no devolvió stream directo",
        durationMs,
      };
    }

    // PRESET 5: WatchPlay
    if (effectivePreset === "watchplay") {
      const res = await fetchWatchPlayStream({ id: cleanId, type, season: s, episode: e });
      const durationMs = Date.now() - startTime;
      if (res && res.success && res.hlsUrl) {
        return {
          success: true,
          hlsUrl: res.hlsUrl,
          backupHlsUrls: res.backupHlsUrls || [],
          durationMs,
        };
      }
      return {
        success: false,
        error: res?.error || "WatchPlay no devolvió stream directo",
        durationMs,
      };
    }

    // PRESET 6: Directo (.m3u8 en template)
    if (effectivePreset === "direct_m3u8") {
      const rawTpl = type === "tv" ? (config?.tv_api_url || tvTpl) : (config?.movie_api_url || movieTpl);
      if (!rawTpl) {
        return {
          success: false,
          error: "No hay plantilla de URL configurada para este servidor",
          durationMs: Date.now() - startTime,
        };
      }
      const directUrl = rawTpl
        .replace("{id}", cleanId)
        .replace("{tmdb}", cleanId)
        .replace("{s}", String(s))
        .replace("{e}", String(e));

      const isLive = await verifyHlsUrl(directUrl, config?.request?.headers);
      const durationMs = Date.now() - startTime;
      return {
        success: isLive || directUrl.includes(".m3u8"),
        hlsUrl: directUrl,
        backupHlsUrls: [],
        durationMs,
      };
    }

    // PRESET 7: Custom API con cabeceras y mapeo JSON/Regex
    if (effectivePreset === "custom_api") {
      const rawTpl = type === "tv" ? (config?.tv_api_url || tvTpl) : (config?.movie_api_url || movieTpl);
      if (!rawTpl) {
        return {
          success: false,
          error: "Falta configurar movie_api_url o tv_api_url en custom_api",
          durationMs: Date.now() - startTime,
        };
      }

      const targetUrl = rawTpl
        .replace("{id}", cleanId)
        .replace("{tmdb}", cleanId)
        .replace("{s}", String(s))
        .replace("{e}", String(e));

      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(targetUrl, {
        method: config?.request?.method || "GET",
        headers: config?.request?.headers || {},
        signal: ctrl.signal,
      });
      clearTimeout(t);

      const status = res.status;
      const text = await res.text();
      let extractedUrl: string | undefined;
      const backupUrls: string[] = [];

      // Intentar extraer vía JSON
      try {
        const json = JSON.parse(text);
        if (config?.mapping?.json_path) {
          extractedUrl = getByPath(json, config.mapping.json_path);
        }
        if (config?.mapping?.backup_paths) {
          for (const bp of config.mapping.backup_paths) {
            const bVal = getByPath(json, bp);
            if (Array.isArray(bVal)) {
              for (const u of bVal) if (typeof u === "string" && !backupUrls.includes(u)) backupUrls.push(u);
            } else if (typeof bVal === "string" && !backupUrls.includes(bVal)) {
              backupUrls.push(bVal);
            }
          }
        }
      } catch {}

      // Intentar extraer vía Regex si no hubo coincidencia JSON
      if (!extractedUrl && config?.mapping?.hls_regex) {
        try {
          const re = new RegExp(config.mapping.hls_regex, "i");
          const m = text.match(re);
          if (m && m[0]) extractedUrl = m[0];
        } catch {}
      }

      // Regex fallback automático de .m3u8
      if (!extractedUrl) {
        const fallbackRegex = /https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i;
        const m = text.match(fallbackRegex);
        if (m && m[0]) extractedUrl = m[0];
      }

      const durationMs = Date.now() - startTime;
      if (extractedUrl) {
        return {
          success: true,
          hlsUrl: extractedUrl,
          backupHlsUrls: backupUrls,
          durationMs,
          status,
        };
      }

      return {
        success: false,
        error: `HTTP ${status}: No se pudo extraer URL de stream con el mapeo especificado`,
        durationMs,
        status,
      };
    }

    return {
      success: false,
      error: `Preset desconocido: ${effectivePreset}`,
      durationMs: Date.now() - startTime,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Error al ejecutar extractor HLS",
      durationMs: Date.now() - startTime,
    };
  }
}
