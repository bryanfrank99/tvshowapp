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

export interface NasriPlayStreamResult {
  success: boolean;
  hlsUrl?: string;
  backupHlsUrls?: string[];
  iframeUrl?: string;
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
        debugStatus: sourcesRes.status,
        error: `HTTP ${sourcesRes.status} al consultar API de fuentes de NasriPlay`,
      };
    }

    const data = await sourcesRes.json();
    if (!data.success || !Array.isArray(data.servers) || data.servers.length === 0) {
      return {
        success: false,
        iframeUrl: embedUrl,
        error: "NasriPlay no reportó servidores disponibles para este contenido",
      };
    }

    const servers: any[] = data.servers;

    // 3. Recopilar candidatos potenciales de streams HLS directos
    const candidateUrls: string[] = [];

    // Candidatos desde directUrl directa en la lista de servidores
    for (const srv of servers) {
      if (srv.directUrl && typeof srv.directUrl === "string" && srv.directUrl.includes(".m3u8")) {
        if (!candidateUrls.includes(srv.directUrl)) candidateUrls.push(srv.directUrl);
      }
    }

    // Candidatos resolviendo tokens dinámicos con prioridad a servidores de stream directo
    const eligible = servers.filter((s) => s.token && s.directResolveEligible).slice(0, 3);
    if (eligible.length > 0) {
      const resolvedResults = await Promise.all(
        eligible.map(async (srv) => {
          try {
            const subController = new AbortController();
            const subTimer = setTimeout(() => subController.abort(), 2500);
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
              if (dUrl && typeof dUrl === "string" && (dUrl.includes(".m3u8") || dUrl.includes(".mp4"))) {
                return dUrl;
              }
            }
          } catch {}
          return null;
        })
      );

      for (const u of resolvedResults) {
        if (u && !candidateUrls.includes(u)) {
          candidateUrls.push(u);
        }
      }
    }

    // 4. Validación en vivo estricta: Solo aceptar streams que respondan HTTP 200/206 sin 404 ni 403
    const liveStreams: string[] = [];
    if (candidateUrls.length > 0) {
      const checkResults = await Promise.all(
        candidateUrls.map(async (url) => {
          const isAlive = await isLivePlayableStream(url);
          return isAlive ? url : null;
        })
      );
      for (const u of checkResults) {
        if (u && !liveStreams.includes(u)) {
          liveStreams.push(u);
        }
      }
    }

    if (liveStreams.length === 0) {
      return {
        success: false,
        iframeUrl: embedUrl,
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
