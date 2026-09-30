/**
 * Extractor de Streams Directos para MegaEmbed
 * Extrae streams HLS (.m3u8) y MP4 del código fuente HTML de megaembed.com
 * para permitir reproducción nativa 100% compatible con mando de Android TV.
 */

export interface MegaEmbedSourceItem {
  file: string;
  type: string;
  label?: string;
}

export interface MegaEmbedStreamResult {
  success: boolean;
  hlsUrl?: string;
  backupHlsUrls?: string[];
  mp4Url?: string;
  allSources?: MegaEmbedSourceItem[];
  error?: string;
  debugStatus?: number;
  debugHtmlPreview?: string;
}

export interface MegaEmbedExtractParams {
  id: string; // IMDb (tt...) o TMDB
  type: "movie" | "tv";
  season?: number;
  episode?: number;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export async function fetchMegaEmbedStream(
  params: MegaEmbedExtractParams
): Promise<MegaEmbedStreamResult | null> {
  const { id, type, season = 1, episode = 1 } = params;
  if (!id) return null;

  const primaryHost = "https://mgeb.top";
  const fallbackHost = "https://megaembed.com";

  const getUrl = (host: string) =>
    type === "tv"
      ? `${host}/embed/${id}/${season}/${episode}`
      : `${host}/embed/${id}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const headers: Record<string, string> = {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    };
    if (typeof window === "undefined") {
      headers["User-Agent"] = USER_AGENT;
    }

    let res = await fetch(getUrl(primaryHost), {
      headers,
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      res = await fetch(getUrl(fallbackHost), {
        headers,
        signal: controller.signal,
        cache: "no-store",
      });
    }

    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        success: false,
        debugStatus: res.status,
        error: `HTTP ${res.status} from megaembed`,
      };
    }

    const html = await res.text();

    // 1. Intentar capturar el arreglo JS: var sources = [...];
    const match = html.match(/var\s+sources\s*=\s*(\[[\s\S]*?\]);/);
    let sources: MegaEmbedSourceItem[] = [];

    if (match && match[1]) {
      try {
        sources = JSON.parse(match[1]);
      } catch {
        // Fallback si el JSON no es estricto
      }
    }

    // 2. Si no parseó el JSON completo, extraer URLs por expresión regular
    if (!sources || sources.length === 0) {
      const hlsMatches = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/g);
      if (hlsMatches && hlsMatches.length > 0) {
        sources = hlsMatches.map((url, idx) => ({
          file: url,
          type: "hls",
          label: `HLS ${idx + 1}`,
        }));
      }
    }

    if (!sources || sources.length === 0) {
      return {
        success: false,
        debugStatus: res.status,
        debugHtmlPreview: html.slice(0, 300),
        error: "No sources found in HTML",
      };
    }

    // Extraer todos los streams HLS disponibles
    const hlsSources = sources.filter(
      (s) => s.type === "hls" || s.file.includes(".m3u8")
    );
    const mp4Source =
      sources.find((s) => s.type === "mp4" || s.file.includes(".mp4")) || null;

    let primaryHls = hlsSources[0]?.file;
    let backupHlsUrls = hlsSources.slice(1).map((s) => s.file);

    // Si existen múltiples streams HLS, verificar en paralelo cuál responde con manifiesto HLS válido (evita streams caídos con 520)
    if (hlsSources.length > 1) {
      try {
        const checkResults = await Promise.allSettled(
          hlsSources.map(async (src) => {
            const getRes = await fetch(src.file, {
              signal: AbortSignal.timeout(3500),
            });
            if (!getRes.ok) return { file: src.file, ok: false };
            const text = await getRes.text();
            const isValid = text.includes("#EXTM3U") || text.includes("#EXT-X");
            return { file: src.file, ok: isValid };
          })
        );
        const working = checkResults
          .filter(
            (r): r is PromiseFulfilledResult<{ file: string; ok: boolean }> =>
              r.status === "fulfilled" && r.value.ok
          )
          .map((r) => r.value.file);

        if (working.length > 0) {
          primaryHls = working[0];
          // Priorizar los streams que respondieron positivamente en backupHlsUrls
          const otherWorking = working.slice(1);
          const remaining = hlsSources
            .map((s) => s.file)
            .filter((f) => !working.includes(f));
          backupHlsUrls = [...otherWorking, ...remaining];
        }
      } catch {}
    }

    return {
      success: !!(primaryHls || mp4Source?.file),
      hlsUrl: primaryHls,
      backupHlsUrls,
      mp4Url: mp4Source?.file,
      allSources: sources,
      debugStatus: res.status,
    };
  } catch (err: any) {
    return {
      success: false,
      error: String(err?.message || err),
    };
  }
}
