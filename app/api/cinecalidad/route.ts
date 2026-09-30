import { NextRequest, NextResponse } from "next/server";
import { fetchCinecalidadEmbeds, fetchCinecalidadStream } from "@/lib/cinecalidad";
import { getCachedStream, setCachedStream } from "@/lib/stream-cache";

export const dynamic = "force-dynamic";

/**
 * Endpoint de resolución, stream HLS y redirección para Cinecalidad (S19):
 * GET /api/cinecalidad?type=movie&id=1339713&stream=1 (Devuelve stream HLS nativo)
 * GET /api/cinecalidad?type=movie&id=1339713 (Redirección directa a HLS o iframe)
 * GET /api/cinecalidad?type=tv&id=108978&s=1&e=2
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") === "tv" ? "tv" : "movie";
  const id = searchParams.get("id") || "";
  const s = parseInt(searchParams.get("s") || "1", 10);
  const e = parseInt(searchParams.get("e") || "1", 10);
  const requestedHost = (searchParams.get("host") || "").toLowerCase().trim();
  const returnJson = searchParams.get("json") === "true";
  const streamOnly = searchParams.get("stream") === "1" || searchParams.get("hls") === "1";
  const redirect = searchParams.get("redirect") === "1";

  if (!id) {
    return NextResponse.json({ error: "Falta el parámetro id (TMDB)" }, { status: 400 });
  }

  // 1. Intentar consultar caché de stream HLS en Base de Datos Supabase
  try {
    const cached = await getCachedStream({
      providerId: "cinecalidad",
      type,
      targetId: id,
      season: s,
      episode: e,
    });

    if (cached?.hlsUrl) {
      if (redirect) {
        return NextResponse.redirect(cached.hlsUrl, 307);
      }
      if (streamOnly) {
        return NextResponse.json(
          {
            success: true,
            fromCache: true,
            hlsUrl: cached.hlsUrl,
            backupHlsUrls: cached.backupHlsUrls,
            lang: "es",
          },
          {
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=1800, s-maxage=1800",
            },
          }
        );
      }
    }
  } catch {}

  // 2. Extraer stream fresco HLS directo desde Cinecalidad (Vimeos)
  try {
    const streamResult = await fetchCinecalidadStream({
      type,
      tmdbId: id,
      season: s,
      episode: e,
    });

    if (streamResult?.success && streamResult.hlsUrl) {
      // Guardar en caché Supabase (TTL de 12 horas)
      try {
        await setCachedStream({
          providerId: "cinecalidad",
          type,
          targetId: id,
          season: s,
          episode: e,
          hlsUrl: streamResult.hlsUrl,
          backupHlsUrls: streamResult.backupHlsUrls,
          ttlHours: 12,
        });
      } catch {}

      if (redirect) {
        return NextResponse.redirect(streamResult.hlsUrl, 307);
      }
      if (streamOnly) {
        return NextResponse.json(
          {
            success: true,
            fromCache: false,
            hlsUrl: streamResult.hlsUrl,
            backupHlsUrls: streamResult.backupHlsUrls,
            subtitles: streamResult.subtitles,
            lang: "es",
          },
          {
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=1800, s-maxage=1800",
            },
          }
        );
      }
    }
  } catch {}

  // 3. Fallback a lista de embeds iframe clásicos
  try {
    const embeds = await fetchCinecalidadEmbeds({
      type,
      tmdbId: id,
      season: s,
      episode: e,
    });

    if (embeds.length === 0) {
      return NextResponse.json(
        { error: "not_found", message: "Contenido no disponible en Cinecalidad" },
        { status: 404 }
      );
    }

    if (returnJson) {
      return NextResponse.json({
        ok: true,
        type,
        id,
        season: type === "tv" ? s : undefined,
        episode: type === "tv" ? e : undefined,
        embeds,
      });
    }

    let selected = embeds[0];
    if (requestedHost) {
      const match = embeds.find((item) =>
        String(item.host || item.server || "").toLowerCase().includes(requestedHost)
      );
      if (match) selected = match;
    }

    return NextResponse.redirect(selected.url, { status: 307 });
  } catch (err: any) {
    console.error("[CinecalidadApi] Error al consultar API de Cinecalidad:", err?.message || err);
    return NextResponse.json(
      { error: "server_error", message: err?.message || "Error al conectar con Cinecalidad" },
      { status: 500 }
    );
  }
}
