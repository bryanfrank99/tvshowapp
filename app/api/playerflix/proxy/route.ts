import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Filtro de seguridad anti-SSRF:
 * Bloquea explícitamente localhost, loopbacks e IPs de red privada o de metadatos de nube.
 */
function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "0.0.0.0") return true;
  if (/^10\./.test(h)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true; // Link-local / AWS / GCP metadata
  if (/^fc00:|^fe80:/i.test(h)) return true;
  return false;
}

/**
 * Patrones de dominios autorizados para PlayerFlix / EmbedPlayer / CDNs asociados.
 * EmbedPlayer utiliza rotación dinámica de CDNs con sufijo .xyz (eloialu*.xyz, plosia*.xyz, etc.)
 */
const ALLOWED_HOST_PATTERNS = [
  /^[a-zA-Z0-9-]+\.xyz$/i,
  /^playerflix\.ink$/i,
  /^hclod\.qzz\.io$/i,
  /^[a-zA-Z0-9-]+\.watchplay\.shop$/i,
  /^[a-zA-Z0-9-]+\.(top|quest|site|me|io|space)$/i,
];

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function GET(req: NextRequest) {
  const targetUrlStr = req.nextUrl.searchParams.get("url");
  if (!targetUrlStr) {
    return NextResponse.json({ error: "Falta parámetro 'url'" }, { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(targetUrlStr);
  } catch {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  // Validación de seguridad contra SSRF
  const hostname = targetUrl.hostname.toLowerCase();
  if (isPrivateHost(hostname)) {
    return NextResponse.json({ error: "Host no permitido" }, { status: 403 });
  }

  const isAllowed = ALLOWED_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
  if (!isAllowed) {
    return NextResponse.json({ error: "Host no autorizado" }, { status: 403 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const rangeHeader = req.headers.get("range");
    const upstreamHeaders: Record<string, string> = {
      "User-Agent": USER_AGENT,
      Referer: "https://embedplayer2.xyz/",
      Accept: "*/*",
    };
    if (rangeHeader) {
      upstreamHeaders["Range"] = rangeHeader;
    }

    const upstreamRes = await fetch(targetUrl.toString(), {
      headers: upstreamHeaders,
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return new NextResponse(null, {
        status: upstreamRes.status,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        },
      });
    }

    const contentType = (upstreamRes.headers.get("content-type") || "").toLowerCase();

    // Cabeceras base CORS compartidas
    const baseCorsHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, Content-Type",
    };

    if (upstreamRes.headers.get("accept-ranges")) {
      baseCorsHeaders["Accept-Ranges"] = upstreamRes.headers.get("accept-ranges")!;
    }
    if (upstreamRes.headers.get("content-range")) {
      baseCorsHeaders["Content-Range"] = upstreamRes.headers.get("content-range")!;
    }

    // 1. Archivos de subtítulos WebVTT (.vtt)
    if (
      targetUrl.pathname.endsWith(".vtt") ||
      contentType.includes("vtt") ||
      contentType.includes("text/vtt")
    ) {
      const vttText = await upstreamRes.text();
      return new NextResponse(vttText, {
        status: upstreamRes.status,
        headers: {
          ...baseCorsHeaders,
          "Content-Type": "text/vtt; charset=utf-8",
          "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
        },
      });
    }

    const isPlaylist =
      targetUrl.pathname.endsWith(".m3u8") ||
      targetUrl.pathname.includes("/hls/") ||
      targetUrl.pathname.includes("/md/") ||
      contentType.includes("mpegurl") ||
      contentType.includes("application/x-mpegurl");

    if (isPlaylist) {
      const text = await upstreamRes.text();
      const origin = `${targetUrl.protocol}//${targetUrl.host}`;
      const lines = text.split("\n");

      const rewritten = lines
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return line;

          // Reescribir URIs dentro de directivas HLS (ej. #EXT-X-KEY:...,URI="...", #EXT-X-MAP:URI="...", #EXT-X-MEDIA:...,URI="...")
          if (trimmed.startsWith("#")) {
            if (trimmed.includes('URI="')) {
              return trimmed.replace(/URI="([^"]+)"/g, (_, uri) => {
                let absolute = uri;
                if (uri.startsWith("/")) {
                  absolute = `${origin}${uri}`;
                } else if (!uri.startsWith("http://") && !uri.startsWith("https://")) {
                  absolute = new URL(uri, targetUrl.href).href;
                }
                return `URI="/api/playerflix/proxy?url=${encodeURIComponent(absolute)}"`;
              });
            }
            return line;
          }

          if (trimmed.startsWith("/")) {
            const absolute = `${origin}${trimmed}`;
            return `/api/playerflix/proxy?url=${encodeURIComponent(absolute)}`;
          }
          if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            return `/api/playerflix/proxy?url=${encodeURIComponent(trimmed)}`;
          }
          // Ruta relativa estándar
          const absolute = new URL(trimmed, targetUrl.href).href;
          return `/api/playerflix/proxy?url=${encodeURIComponent(absolute)}`;
        })
        .join("\n");

      return new NextResponse(rewritten, {
        status: upstreamRes.status,
        headers: {
          ...baseCorsHeaders,
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "public, max-age=180, s-maxage=180",
        },
      });
    }

    // Segmentos binarios de video (MPEG-TS disfrazados de .js/.woff/.css o formato raw)
    const arrayBuffer = await upstreamRes.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: upstreamRes.status,
      headers: {
        ...baseCorsHeaders,
        "Content-Type": "video/mp2t",
        "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Error de proxy", message: err?.message || String(err) },
      {
        status: 502,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        },
      }
    );
  }
}
