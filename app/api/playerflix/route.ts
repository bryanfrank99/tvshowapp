import { NextRequest, NextResponse } from "next/server";
import { fetchPlayerFlixStreams } from "@/lib/playerflix";
import { getCachedStream, setCachedStream } from "@/lib/stream-cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const id = (q.get("id") || "").trim();
  const type = q.get("type") === "tv" ? "tv" : "movie";
  const s = parseInt(q.get("s") || "1", 10) || 1;
  const e = parseInt(q.get("e") || "1", 10) || 1;
  const redirect = q.get("redirect") === "1";

  if (!id) {
    return NextResponse.json(
      { error: "params", message: "Falta parámetro 'id' (TMDB ID)" },
      { status: 400 }
    );
  }

  // 1. Consultar caché en Base de Datos Supabase
  try {
    const cached = await getCachedStream({
      providerId: "playerflix",
      type,
      targetId: id,
      season: s,
      episode: e,
    });

    if (cached?.hlsUrl) {
      if (redirect) {
        return NextResponse.redirect(cached.hlsUrl, 307);
      }
      return NextResponse.json(
        {
          success: true,
          fromCache: true,
          hlsUrl: cached.hlsUrl,
          backupHlsUrls: cached.backupHlsUrls,
          lang: "pt",
        },
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=1800, s-maxage=1800",
          },
        }
      );
    }
  } catch {}

  // 2. Extraer streams frescos desde PlayerFlix
  const result = await fetchPlayerFlixStreams({
    id,
    type,
    season: s,
    episode: e,
  });

  if (!result || !result.success || result.streams.length === 0) {
    return NextResponse.json(
      {
        error: "stream_not_found",
        message: "No se pudieron obtener streams desde PlayerFlix",
        details: result?.error,
        debugStatus: result?.debugStatus,
      },
      { status: 404 }
    );
  }

  // 3. Persistir stream HLS primario en la base de datos Supabase
  if (result.primaryHlsUrl) {
    try {
      await setCachedStream({
        providerId: "playerflix",
        type,
        targetId: id,
        season: s,
        episode: e,
        hlsUrl: result.primaryHlsUrl,
        backupHlsUrls: result.backupHlsUrls,
        ttlHours: 24,
      });
    } catch {}
  }

  if (redirect && result.primaryHlsUrl) {
    return NextResponse.redirect(result.primaryHlsUrl, 307);
  }

  return NextResponse.json(
    {
      success: true,
      fromCache: false,
      title: result.title,
      hlsUrl: result.primaryHlsUrl,
      backupHlsUrls: result.backupHlsUrls,
      streams: result.streams,
      lang: result.lang || "pt",
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=1800, s-maxage=1800",
      },
    }
  );
}
