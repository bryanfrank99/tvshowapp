/**
 * Cliente y Extractor Nativo HLS para Proveedor PlayerFlix
 * Consulta https://playerflix.ink/inc/Ajax.php y procesa las opciones devueltas
 * para extraer streams directos HLS (.m3u8) reproducibles nativamente.
 */

export interface PlayerFlixParams {
  id: string; // TMDB ID
  type: "movie" | "tv";
  season?: number;
  episode?: number;
}

export interface PlayerFlixOption {
  embed: string;
  lang?: string;
  label?: string;
  budget?: string;
  icon?: string;
  embed_id?: string;
}

export interface PlayerFlixStreamItem {
  id: string;
  label: string;
  hlsUrl: string;
  backupUrls?: string[];
  lang: string;
  type: "hls" | "iframe";
  originUrl?: string;
}

export interface PlayerFlixResult {
  success: boolean;
  title?: string;
  streams: PlayerFlixStreamItem[];
  primaryHlsUrl?: string;
  backupHlsUrls?: string[];
  lang?: string;
  error?: string;
  debugStatus?: number;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function normalizeLang(langStr?: string): string {
  const l = (langStr || "").toLowerCase().trim();
  if (l.includes("pt") || l.includes("por") || l.includes("dublado")) return "pt";
  if (l.includes("en") || l.includes("legendado") || l.includes("ingl")) return "en";
  if (l.includes("es") || l.includes("lat")) return "es";
  return "pt";
}

/**
 * Extrae stream HLS directo fMP4 desde WatchPlay (watchplay.shop)
 */
async function extractFromWatchPlay(url: string, lang = "pt"): Promise<PlayerFlixStreamItem | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const headers: Record<string, string> = {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Referer: "https://playerflix.ink/",
    };
    if (typeof window === "undefined") {
      headers["User-Agent"] = USER_AGENT;
    }

    const res = await fetch(url, {
      headers,
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const html = await res.text();

    const match = html.match(/url:\s*"([^"]+playlist\.m3u8[^"]*)"/i);
    if (match && match[1]) {
      const hlsUrl = match[1].replace(/\\/g, "");
      return {
        id: "watchplay",
        label: "WatchPlay",
        hlsUrl,
        backupUrls: [],
        lang,
        type: "hls",
        originUrl: url,
      };
    }

    const genericM3u8 = html.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i);
    if (genericM3u8 && genericM3u8[0]) {
      return {
        id: "watchplay",
        label: "WatchPlay (HLS)",
        hlsUrl: genericM3u8[0].replace(/\\/g, ""),
        backupUrls: [],
        lang,
        type: "hls",
        originUrl: url,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extrae stream HLS desde EmbedPlayer / VIP Player (embedplayer*.xyz)
 */
async function extractFromEmbedPlayer(
  url: string,
  embedId?: string,
  lang = "pt"
): Promise<PlayerFlixStreamItem | null> {
  try {
    let id = embedId;
    let originHost = "https://embedplayer2.xyz";

    try {
      const u = new URL(url);
      originHost = `${u.protocol}//${u.host}`;
      if (!id) {
        const parts = u.pathname.split("/").filter(Boolean);
        id = parts[parts.length - 1];
      }
    } catch {}

    if (!id) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const apiUrl = `${originHost}/player/index.php?data=${encodeURIComponent(id)}&do=getVideo`;
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        Referer: `${originHost}/video/${id}`,
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: new URLSearchParams({
        hash: id,
        r: "https://playerflix.ink/",
      }).toString(),
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    if (!json) return null;

    const rawHlsUrl = (json.securedLink || json.videoSource || "").replace(/\\/g, "");
    if (rawHlsUrl && rawHlsUrl.includes(".m3u8")) {
      // Enrutar a través del proxy CORS local para permitir reproducción nativa en Hls.js
      const proxiedHlsUrl = `/api/playerflix/proxy?url=${encodeURIComponent(rawHlsUrl)}`;
      const backupRaw = json.videoSource && json.videoSource !== rawHlsUrl ? json.videoSource.replace(/\\/g, "") : "";
      const backupUrls = backupRaw ? [`/api/playerflix/proxy?url=${encodeURIComponent(backupRaw)}`] : [];

      return {
        id: "embedplayer",
        label: "VIP Player",
        hlsUrl: proxiedHlsUrl,
        backupUrls,
        lang,
        type: "hls",
        originUrl: url,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Consulta la API de PlayerFlix e intenta extraer streams HLS de todas las opciones devueltas.
 */
export async function fetchPlayerFlixStreams(params: PlayerFlixParams): Promise<PlayerFlixResult | null> {
  const { id, type, season = 1, episode = 1 } = params;
  if (!id) return null;

  // PlayerFlix usa type=movie con season=null&episode=null, o type=tv con temporada y episodio
  const targetUrl =
    type === "tv"
      ? `https://playerflix.ink/inc/Ajax.php?type=tv&id=${encodeURIComponent(id)}&season=${season}&episode=${episode}`
      : `https://playerflix.ink/inc/Ajax.php?type=movie&id=${encodeURIComponent(id)}&season=null&episode=null`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const headers: Record<string, string> = {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      Referer: "https://playerflix.ink/",
    };
    if (typeof window === "undefined") {
      headers["User-Agent"] = USER_AGENT;
    }

    const res = await fetch(targetUrl, {
      headers,
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        success: false,
        streams: [],
        debugStatus: res.status,
        error: `HTTP ${res.status} desde playerflix.ink`,
      };
    }

    const data = await res.json().catch(() => null);
    if (!data || !data.status || !data.data) {
      return {
        success: false,
        streams: [],
        error: data?.message || "Respuesta sin contenido en PlayerFlix",
      };
    }

    const rawOptions: PlayerFlixOption[] = Array.isArray(data.data.options) ? data.data.options : [];
    const title: string = data.data.title || "";

    // Procesar concurrentemente las opciones (excluyendo WatchPlay para S20)
    const streamPromises = rawOptions.map(async (opt, idx): Promise<PlayerFlixStreamItem[] | PlayerFlixStreamItem | null> => {
      const optLang = normalizeLang(opt.lang);
      const embedUrl = opt.embed || "";
      if (!embedUrl) return null;

      // 1. Desactivar WatchPlay en S20 a petición del usuario (evita duplicar S18)
      if (embedUrl.includes("watchplay.shop")) {
        return null;
      }

      // 2. Caso EmbedPlayer / VIP Player (embedplayer*.xyz)
      if (embedUrl.includes("embedplayer") || opt.embed_id) {
        const epStream = await extractFromEmbedPlayer(embedUrl, opt.embed_id, optLang);
        if (epStream) {
          // Proveer tanto el stream HLS (vía proxy CORS) como la opción directa en Iframe
          const iframeVersion: PlayerFlixStreamItem = {
            id: "embedplayer-iframe",
            label: "VIP Player (Web)",
            hlsUrl: embedUrl,
            lang: optLang,
            type: "iframe",
            originUrl: embedUrl,
          };
          return [epStream, iframeVersion];
        }
      }

      // 3. Opciones iframe restantes (Embed Play, Premium, etc.)
      const label = opt.label || `Servidor ${idx + 1}`;
      return {
        id: `playerflix-iframe-${idx + 1}`,
        label,
        hlsUrl: embedUrl,
        lang: optLang,
        type: "iframe",
        originUrl: embedUrl,
      };
    });

    const settled = await Promise.all(streamPromises);
    const resolvedStreams = settled.flat().filter(Boolean) as PlayerFlixStreamItem[];

    // Separar y priorizar streams tipo HLS
    const hlsStreams = resolvedStreams.filter((s) => s.type === "hls");
    const primaryHls = hlsStreams[0]?.hlsUrl;
    const backupHlsUrls = hlsStreams.slice(1).map((s) => s.hlsUrl);

    return {
      success: resolvedStreams.length > 0,
      title,
      streams: resolvedStreams,
      primaryHlsUrl: primaryHls,
      backupHlsUrls,
      lang: hlsStreams[0]?.lang || resolvedStreams[0]?.lang || "pt",
    };
  } catch (err: any) {
    return {
      success: false,
      streams: [],
      error: err?.message || "Error al conectar con PlayerFlix",
    };
  }
}
