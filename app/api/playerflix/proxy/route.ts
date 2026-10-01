import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_HOST_PATTERNS = [
  /^embedplayer\d*\.xyz$/i,
  /^plosia\d*\.xyz$/i,
  /^playerflix\.ink$/i,
  /^hclod\.qzz\.io$/i,
  /^[a-zA-Z0-9-]+\.watchplay\.shop$/i,
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

  // Validación de seguridad de hosts autorizados
  const hostname = targetUrl.hostname.toLowerCase();
  const isAllowed = ALLOWED_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
  if (!isAllowed) {
    return NextResponse.json({ error: "Host no autorizado" }, { status: 403 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const upstreamRes = await fetch(targetUrl.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        Referer: "https://embedplayer2.xyz/",
        Accept: "*/*",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    if (!upstreamRes.ok) {
      return new NextResponse(null, {
        status: upstreamRes.status,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    const contentType = (upstreamRes.headers.get("content-type") || "").toLowerCase();
    const isPlaylist =
      targetUrl.pathname.endsWith(".m3u8") ||
      targetUrl.pathname.includes("/hls/") ||
      contentType.includes("mpegurl") ||
      contentType.includes("application/x-mpegurl");

    if (isPlaylist) {
      const text = await upstreamRes.text();
      const origin = `${targetUrl.protocol}//${targetUrl.host}`;
      const lines = text.split("\n");

      const rewritten = lines
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) {
            return line;
          }
          if (trimmed.startsWith("/")) {
            const absolute = `${origin}${trimmed}`;
            return `/api/playerflix/proxy?url=${encodeURIComponent(absolute)}`;
          }
          if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            return `/api/playerflix/proxy?url=${encodeURIComponent(trimmed)}`;
          }
          // Ruta relativa
          const absolute = new URL(trimmed, targetUrl.href).href;
          return `/api/playerflix/proxy?url=${encodeURIComponent(absolute)}`;
        })
        .join("\n");

      return new NextResponse(rewritten, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      });
    }

    // Segmentos binarios de video (MPEG-TS disfrazados de .js/.woff/.css)
    const arrayBuffer = await upstreamRes.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp2t",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Error de proxy", message: err?.message || String(err) },
      {
        status: 502,
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  }
}
