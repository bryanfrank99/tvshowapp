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
  lang?: string;
  title?: string;
  serverName?: string;
  error?: string;
  debugStatus?: number;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

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
        debugStatus: embedRes.status,
        error: `HTTP ${embedRes.status} al cargar embed de NasriPlay`,
      };
    }

    const html = await embedRes.text();
    const ptMatch = html.match(/PAGE_TOKEN\s*=\s*"([^"]+)"/);
    if (!ptMatch || !ptMatch[1]) {
      return {
        success: false,
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
        debugStatus: sourcesRes.status,
        error: `HTTP ${sourcesRes.status} al consultar API de fuentes de NasriPlay`,
      };
    }

    const data = await sourcesRes.json();
    if (!data.success || !Array.isArray(data.servers) || data.servers.length === 0) {
      return {
        success: false,
        error: "NasriPlay no reportó servidores disponibles para este contenido",
      };
    }

    const servers: any[] = data.servers;

    let primaryHlsUrl: string | undefined;
    let primaryHeaders: Record<string, string> | undefined;
    const backupHlsUrls: string[] = [];

    // 3. Resolver tokens dinámicos en paralelo (para alta velocidad y baja latencia)
    const eligible = servers.filter((s) => s.token && s.directResolveEligible).slice(0, 3);
    const resolvedResults = await Promise.all(
      eligible.map(async (srv) => {
        try {
          const subController = new AbortController();
          const subTimer = setTimeout(() => subController.abort(), 3500);
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
            const ref = rJson?.data?.referer;
            if (dUrl && typeof dUrl === "string" && (dUrl.includes(".m3u8") || dUrl.includes(".txt") || dUrl.includes(".mp4"))) {
              return { url: dUrl, referer: ref };
            }
          }
        } catch {}
        return null;
      })
    );

    // Priorizar primero los streams sin referer restringido (universales)
    for (const r of resolvedResults) {
      if (r && !r.referer) {
        if (!primaryHlsUrl) primaryHlsUrl = r.url;
        else if (!backupHlsUrls.includes(r.url) && r.url !== primaryHlsUrl) backupHlsUrls.push(r.url);
      }
    }

    // Luego agregar los demás streams resueltos (ej. Vimeos)
    for (const r of resolvedResults) {
      if (r) {
        if (!primaryHlsUrl) {
          primaryHlsUrl = r.url;
          if (r.referer) primaryHeaders = { Referer: r.referer };
        } else if (!backupHlsUrls.includes(r.url) && r.url !== primaryHlsUrl) {
          backupHlsUrls.push(r.url);
        }
      }
    }

    // 4. Si aún no tenemos primaryHlsUrl, usar directUrl de la lista de servidores
    for (const srv of servers) {
      if (srv.directUrl && typeof srv.directUrl === "string" && srv.directUrl.includes(".m3u8")) {
        if (!primaryHlsUrl) {
          primaryHlsUrl = srv.directUrl;
        } else if (!backupHlsUrls.includes(srv.directUrl) && srv.directUrl !== primaryHlsUrl) {
          backupHlsUrls.push(srv.directUrl);
        }
      }
    }

    if (!primaryHlsUrl) {
      return {
        success: false,
        error: "No se pudo extraer una URL .m3u8 válida de NasriPlay",
      };
    }

    return {
      success: true,
      hlsUrl: primaryHlsUrl,
      backupHlsUrls,
      lang: "es",
      title: data.meta?.title,
      serverName: "NasriPlay",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Error al conectar con NasriPlay",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
