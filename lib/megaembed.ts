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

export function normalizeStreamUrl(rawUrl: string, baseHost: string): string {
  let u = (rawUrl || "").trim();
  if (!u) return "";
  if (u.startsWith("//")) u = "https:" + u;
  if (u.startsWith("/")) u = `${baseHost}${u}`;
  u = u.replace(/\/+\.\.\/+/g, "/"); // ej: https://mgeb.top/../cache/ -> https://mgeb.top/cache/
  return u;
}

export async function verifyStreamUrl(url: string): Promise<boolean> {
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "*/*",
        Range: "bytes=0-1024",
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(2000),
      cache: "no-store",
    });

    if (!res.ok) return false;

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const text = await res.text();

    // Detección de rechazo explícito de firmas o errores JSON de CDN
    if (
      text.includes("Assinatura") ||
      text.includes('"error"') ||
      text.includes("não encontrado") ||
      text.includes("not found")
    ) {
      return false;
    }

    // Comprobar cabecera HLS estándar o streams válidos
    if (text.includes("#EXTM3U") || contentType.includes("mpegurl")) {
      return true;
    }

    // Streams MP4 o binarios válidos
    if (contentType.includes("video/mp4") || contentType.includes("video/") || contentType.includes("application/octet-stream")) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

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

    // Normalizar URLs de cada fuente
    const normalizedSources = sources.map((s) => ({
      ...s,
      file: normalizeStreamUrl(s.file, host),
    }));

    return { html, sources: normalizedSources, status: res.status };
  };

  try {
    const winner = await Promise.any(hosts.map(fetchFromHost));
    const { sources, status } = winner;

    // Extraer todos los streams HLS candidatos
    const hlsCandidates = sources
      .filter((s) => s.type === "hls" || s.file.includes(".m3u8"))
      .map((s) => s.file)
      .filter((u): u is string => Boolean(u));

    const mp4Candidate =
      sources.find((s) => s.type === "mp4" || s.file.includes(".mp4"))?.file;

    if (!hlsCandidates.length && !mp4Candidate) {
      return {
        success: false,
        debugStatus: status,
        error: "No HLS or MP4 streams found",
      };
    }

    // 2. Verificar disponibilidad real de los streams candidatos concurrentemente
    const verifiedHls: string[] = [];
    const checkPromises = hlsCandidates.map(async (cand) => {
      const ok = await verifyStreamUrl(cand);
      return ok ? cand : null;
    });

    const checkedResults = await Promise.all(checkPromises);
    for (const valid of checkedResults) {
      if (valid && !verifiedHls.includes(valid)) {
        verifiedHls.push(valid);
      }
    }

    let validMp4: string | undefined;
    if (mp4Candidate) {
      const ok = await verifyStreamUrl(mp4Candidate);
      if (ok) validMp4 = mp4Candidate;
    }

    if (!verifiedHls.length && !validMp4) {
      return {
        success: false,
        debugStatus: status,
        error: "All extracted stream candidates failed verification or have invalid signatures",
      };
    }

    const primaryHls = verifiedHls[0];
    const backupHlsUrls = verifiedHls.slice(1);

    return {
      success: !!(primaryHls || validMp4),
      hlsUrl: primaryHls,
      backupHlsUrls,
      mp4Url: validMp4,
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

