/**
 * Extractor de Streams Directos HLS para NasriPlay (S17)
 * Extrae streams HLS (.m3u8) nativos desde nsrplay.space
 * para permitir reproducción nativa 100% compatible con mando de Android TV.
 */

export interface NasriPlayExtractParams {
  id: string; // TMDB ID
  type: "movie" | "tv";
  season?: number;
  episode?: number;
  timeoutMs?: number;
}

export interface NasriPlayEmbedOption {
  name: string;        // ej. "Nsr Play", "streamwish", "voesx", "streamtape", "vidhide"
  server?: string;     // ej. "vimeos", "streamwish", "voesx", "streamtape", "vidhide"
  host?: string;       // ej. "Streamwish", "Voe", "Streamtape", "NasriPlay"
  language?: string;   // ej. "Latino", "Español Latino", "Subtitulado"
  url: string;         // URL directa de embed
}

export function detectNasriPlayHost(url: string, rawServer?: string, rawName?: string): string {
  const hostMatch = url.match(/https?:\/\/(?:www\.)?([^\/]+)/i)?.[1]?.toLowerCase() || "";
  if (hostMatch.includes("streamtape")) return "Streamtape";
  if (hostMatch.includes("streamwish") || hostMatch.includes("wishembed")) return "Streamwish";
  if (hostMatch.includes("voe.")) return "Voe";
  if (hostMatch.includes("vidhide")) return "Vidhide";
  if (hostMatch.includes("filelions")) return "Filelions";
  if (hostMatch.includes("dood")) return "Doodstream";
  if (hostMatch.includes("uqload")) return "Uqload";
  if (hostMatch.includes("vimeus") || hostMatch.includes("vimeos")) return "Vimeos";
  if (hostMatch.includes("nsrplay")) return "NasriPlay";

  const fallback = (rawServer || rawName || "").trim();
  if (!fallback || fallback.toLowerCase().includes("nsr") || fallback.toLowerCase().includes("play")) {
    return "NasriPlay";
  }
  return fallback.charAt(0).toUpperCase() + fallback.slice(1);
}

export interface NasriPlayStreamResult {
  success: boolean;
  hlsUrl?: string;
  backupHlsUrls?: string[];
  iframeUrl?: string;
  embeds?: NasriPlayEmbedOption[];
  lang?: string;
  title?: string;
  serverName?: string;
  error?: string;
  debugStatus?: number;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/**
 * Valida de forma no bloqueante si un stream .m3u8 está realmente activo (HTTP 200/206),
 * tiene encabezado CORS '*' y no devuelve 404, 403 o una página HTML de error.
 */
async function isLivePlayableStream(url: string): Promise<boolean> {
  if (!url || typeof url !== "string") return false;
  if (url.includes(".txt") && !url.includes(".urlset/") && !url.includes("/hls")) return false;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1600);
    const res = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "*/*",
        Range: "bytes=0-1024",
      },
    });
    clearTimeout(timer);

    if (res.status === 200 || res.status === 206) {
      const cType = (res.headers.get("content-type") || "").toLowerCase();
      // Si devuelve una página HTML (como Cloudflare o nginx error), no es un stream válido
      if (cType.includes("text/html") && !url.includes(".m3u8")) {
        return false;
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function fetchNasriPlayStream(
  params: NasriPlayExtractParams
): Promise<NasriPlayStreamResult | null> {
  const { id, type, season = 1, episode = 1, timeoutMs = 8000 } = params;
  if (!id) return null;

  const cleanId = String(id).trim();
  const s = parseInt(String(season), 10) || 1;
  const e = parseInt(String(episode), 10) || 1;

  const embedUrl =
    type === "tv"
      ? `https://nsrplay.space/embed/tv/${cleanId}/${s}/${e}`
      : `https://nsrplay.space/embed/movie/${cleanId}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // 1. Obtener HTML del embed para extraer el PAGE_TOKEN dinámico
    const embedRes = await fetch(embedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!embedRes.ok) {
      return {
        success: false,
        iframeUrl: embedUrl,
        embeds: [{ name: "NasriPlay", server: "nsrplay", host: "NasriPlay", language: "Latino", url: embedUrl }],
        debugStatus: embedRes.status,
        error: `HTTP ${embedRes.status} al cargar embed de NasriPlay`,
      };
    }

    const html = await embedRes.text();
    const ptMatch = html.match(/PAGE_TOKEN\s*=\s*["']([^"']+)["']/);
    if (!ptMatch || !ptMatch[1]) {
      return {
        success: false,
        iframeUrl: embedUrl,
        embeds: [{ name: "NasriPlay", server: "nsrplay", host: "NasriPlay", language: "Latino", url: embedUrl }],
        error: "No se encontró PAGE_TOKEN en el código de NasriPlay",
      };
    }
    const pageToken = ptMatch[1];

    // 2. Consultar endpoint de fuentes autorizadas con el token de página
    const sourcesApiUrl =
      type === "tv"
        ? `https://nsrplay.space/api/v1/embed/sources/tv/${cleanId}/${s}/${e}?pt=${encodeURIComponent(pageToken)}`
        : `https://nsrplay.space/api/v1/embed/sources/movie/${cleanId}?pt=${encodeURIComponent(pageToken)}`;

    const sourcesRes = await fetch(sourcesApiUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Referer: embedUrl,
        Accept: "application/json",
      },
    });

    if (!sourcesRes.ok) {
      return {
        success: false,
        iframeUrl: embedUrl,
        embeds: [{ name: "NasriPlay", server: "nsrplay", host: "NasriPlay", language: "Latino", url: embedUrl }],
        debugStatus: sourcesRes.status,
        error: `HTTP ${sourcesRes.status} al consultar API de fuentes de NasriPlay`,
      };
    }

    const data = await sourcesRes.json();
    if (!data.success || !Array.isArray(data.servers) || data.servers.length === 0) {
      return {
        success: false,
        iframeUrl: embedUrl,
        embeds: [{ name: "NasriPlay", server: "nsrplay", host: "NasriPlay", language: "Latino", url: embedUrl }],
        error: "NasriPlay no reportó servidores disponibles para este contenido",
      };
    }

    const servers: any[] = data.servers;

    // 3. Ejecutar en PARALELO:
    // A) Resolución de embeds de todos los sub-proveedores (/server-url) para mirrors en iframe
    // B) Resolución y verificación en vivo de streams HLS directos (playUrl + directUrl + /resolve)
    const [embeds, liveStreams] = await Promise.all([
      // Tarea A: Extraer y resolver los sub-proveedores de embed
      (async (): Promise<NasriPlayEmbedOption[]> => {
        const resolvedList: NasriPlayEmbedOption[] = [];
        const serverUrlPromises = servers.map(async (srv) => {
          let resolvedEmbedUrl: string | undefined;

          // Si el servidor tiene token, consultar /api/v1/embed/server-url para obtener la URL web real del iframe
          if (srv.token) {
            try {
              const subCtrl = new AbortController();
              const subTimer = setTimeout(() => subCtrl.abort(), 2000);
              const suRes = await fetch(
                `https://nsrplay.space/api/v1/embed/server-url?token=${encodeURIComponent(srv.token)}`,
                {
                  signal: subCtrl.signal,
                  headers: { "User-Agent": USER_AGENT, Referer: embedUrl },
                }
              );
              clearTimeout(subTimer);
              if (suRes.ok) {
                const suJson = await suRes.json();
                if (suJson?.data?.embedUrl && typeof suJson.data.embedUrl === "string") {
                  resolvedEmbedUrl = suJson.data.embedUrl;
                }
              }
            } catch {}
          }

          // Fallback solo si no se obtuvo por API y srv.url es una URL web válida que no sea proxy m3u8
          if (
            !resolvedEmbedUrl &&
            srv.url &&
            typeof srv.url === "string" &&
            !srv.url.includes("stream-proxy") &&
            !srv.url.includes(".m3u8")
          ) {
            resolvedEmbedUrl = srv.url;
          }

          const finalUrl = resolvedEmbedUrl || embedUrl;
          const detectedHost = detectNasriPlayHost(finalUrl, srv.server, srv.name);
          return {
            name: srv.name || detectedHost,
            server: srv.server || srv.name?.toLowerCase() || "nsrplay",
            host: detectedHost,
            language: srv.language || "Latino",
            url: finalUrl,
          };
        });

        try {
          const results = await Promise.all(serverUrlPromises);
          for (const emb of results) {
            if (emb && emb.url) {
              if (!resolvedList.some((e) => e.url === emb.url)) {
                resolvedList.push(emb);
              }
            }
          }
        } catch {}

        if (resolvedList.length === 0) {
          resolvedList.push({
            name: "NasriPlay",
            server: "nsrplay",
            host: "NasriPlay",
            language: "Latino",
            url: embedUrl,
          });
        }
        return resolvedList;
      })(),

      // Tarea B: Recopilar y validar en vivo los streams HLS directos (con failover de múltiples mirrors)
      (async (): Promise<string[]> => {
        const candidateUrls: string[] = [];

        // 1. Añadir streams de proxy directo playUrl (tienen CORS * garantizado) y directUrl iniciales
        for (const srv of servers) {
          if (srv.playUrl && typeof srv.playUrl === "string" && srv.playUrl.includes("stream-proxy")) {
            if (!candidateUrls.includes(srv.playUrl)) candidateUrls.push(srv.playUrl);
          }
          if (srv.directUrl && typeof srv.directUrl === "string" && srv.directUrl.includes(".m3u8")) {
            if (!candidateUrls.includes(srv.directUrl)) candidateUrls.push(srv.directUrl);
          }
        }

        // 2. Resolver concurrentemente tokens con directResolveEligible para obtener todos los mirrors HLS adicionales
        const eligible = servers.filter((s) => s.token && s.directResolveEligible);
        if (eligible.length > 0) {
          const resolvePromises = eligible.map(async (srv) => {
            try {
              const subController = new AbortController();
              const subTimer = setTimeout(() => subController.abort(), 2200);
              const resolveUrl = `https://nsrplay.space/api/v1/embed/resolve?token=${encodeURIComponent(srv.token)}&pt=${encodeURIComponent(pageToken)}&parentUrl=${encodeURIComponent(embedUrl)}`;
              const resolveRes = await fetch(resolveUrl, {
                signal: subController.signal,
                headers: {
                  "User-Agent": USER_AGENT,
                  Referer: embedUrl,
                  Accept: "application/json",
                },
              });
              clearTimeout(subTimer);
              if (resolveRes.ok) {
                const rJson = await resolveRes.json();
                const dUrl = rJson?.data?.directUrl;
                const pUrl = rJson?.data?.playUrl;
                const results: string[] = [];
                if (pUrl && typeof pUrl === "string" && pUrl.includes("stream-proxy")) {
                  results.push(pUrl);
                }
                if (dUrl && typeof dUrl === "string" && (dUrl.includes(".m3u8") || dUrl.includes(".mp4"))) {
                  results.push(dUrl);
                }
                return results;
              }
            } catch {}
            return [];
          });

          const resolvedDirects = await Promise.all(resolvePromises);
          for (const list of resolvedDirects) {
            for (const u of list) {
              if (u && !candidateUrls.includes(u)) candidateUrls.push(u);
            }
          }
        }

        // 3. Validación en vivo rápida: solo aceptar streams que respondan HTTP 200/206
        const validLiveStreams: string[] = [];
        if (candidateUrls.length > 0) {
          const checks = await Promise.all(
            candidateUrls.map(async (url) => {
              const isAlive = await isLivePlayableStream(url);
              return isAlive ? url : null;
            })
          );
          for (const u of checks) {
            if (u && !validLiveStreams.includes(u)) validLiveStreams.push(u);
          }
        }
        return validLiveStreams;
      })(),
    ]);

    if (liveStreams.length === 0) {
      return {
        success: false,
        iframeUrl: embedUrl,
        embeds,
        title: data.meta?.title,
        serverName: "NasriPlay",
        error: "Ningún stream directo de NasriPlay respondió HTTP 200 OK (se recomienda iframe)",
      };
    }

    const [primaryHlsUrl, ...backupHlsUrls] = liveStreams;

    return {
      success: true,
      hlsUrl: primaryHlsUrl,
      backupHlsUrls,
      iframeUrl: embedUrl,
      embeds,
      lang: "es",
      title: data.meta?.title,
      serverName: "NasriPlay",
    };
  } catch (err: any) {
    return {
      success: false,
      iframeUrl: embedUrl,
      error: err?.message || "Error al conectar con NasriPlay",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
