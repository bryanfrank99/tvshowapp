/**
 * Extractor de Streams Directos para MegaEmbed
 * Extrae streams HLS (.m3u8) y MP4 del código fuente HTML de megaembed.com / mgeb.top
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

  const hosts = ["https://mgeb.top", "https://megaembed.com"];
  const path =
    type === "tv"
      ? `embed/${id}/${season}/${episode}`
      : `embed/${id}`;

  const headers: Record<string, string> = {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };
  if (typeof window === "undefined") {
    headers["User-Agent"] = USER_AGENT;
  }

  // 1. Carrera paralela entre mirrors (el primero que responda con HTTP 200 y fuentes válidas gana)
  const fetchFromHost = async (host: string) => {
    const res = await fetch(`${host}/${path}`, {
      headers,
      signal: AbortSignal.timeout(4500),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${host}`);
    }

    const html = await res.text();

    // Intentar capturar el arreglo JS: var sources = [...];
    const match = html.match(/var\s+sources\s*=\s*(\[[\s\S]*?\]);/);
    let sources: MegaEmbedSourceItem[] = [];

    if (match && match[1]) {
      try {
        sources = JSON.parse(match[1]);
      } catch {}
    }

    // Si no parseó el JSON completo, extraer URLs por expresión regular
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
      throw new Error(`No sources found in HTML from ${host}`);
    }

    return { html, sources, status: res.status };
  };

  try {
    const winner = await Promise.any(hosts.map(fetchFromHost));
    const { sources, status } = winner;

    // Extraer todos los streams HLS disponibles
    const hlsSources = sources.filter(
      (s) => s.type === "hls" || s.file.includes(".m3u8")
    );
    const mp4Source =
      sources.find((s) => s.type === "mp4" || s.file.includes(".mp4")) || null;

    if (!hlsSources.length && !mp4Source) {
      return {
        success: false,
        debugStatus: status,
        error: "No HLS or MP4 streams found",
      };
    }

    const primaryHls = hlsSources[0]?.file;
    const backupHlsUrls = hlsSources.slice(1).map((s) => s.file);

    return {
      success: !!(primaryHls || mp4Source?.file),
      hlsUrl: primaryHls,
      backupHlsUrls,
      mp4Url: mp4Source?.file,
      allSources: sources,
      debugStatus: status,
    };
  } catch (err: any) {
    return {
      success: false,
      error: String(err?.message || err),
    };
  }
}
