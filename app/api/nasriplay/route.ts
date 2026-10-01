import { NextRequest, NextResponse } from "next/server";
import { fetchNasriPlayStream } from "@/lib/nasriplay";
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
      { error: "params", message: "Falta parámetro 'id'" },
      { status: 400 }
    );
  }

  // 1. Consultar caché en Base de Datos Supabase
  try {
    const cached = await getCachedStream({
      providerId: "nasriplay",
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
          backupHlsUrls: cached.backupHlsUrls || [],
          embeds: cached.embeds || [],
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
  } catch {}

  // 2. Extraer stream fresco desde nsrplay.space
  const result = await fetchNasriPlayStream({
    id,
    type,
    season: s,
    episode: e,
  });

  if (!result || !result.success || !result.hlsUrl) {
    // Si no hay HLS pero hay embeds (modo fallback iframe)
    if (result && result.embeds && result.embeds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          hlsUrl: null,
          iframeUrl: result.iframeUrl,
          embeds: result.embeds,
          title: result.title,
          message: result.error || "No se encontró stream directo HLS, disponible como iframe",
        },
        {
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    return NextResponse.json(
      {
        error: "stream_not_found",
        message: "No se pudo extraer stream directo de NasriPlay (S17)",
        details: result?.error,
        debugStatus: result?.debugStatus,
      },
      { status: 404 }
    );
  }

  // 3. Persistir en la base de datos Supabase
  try {
    await setCachedStream({
      providerId: "nasriplay",
      type,
      targetId: id,
      season: s,
      episode: e,
      hlsUrl: result.hlsUrl,
      backupHlsUrls: result.backupHlsUrls,
      embeds: result.embeds,
      ttlHours: 12,
    });
  } catch {}

  if (redirect) {
    return NextResponse.redirect(result.hlsUrl, 307);
  }

  return NextResponse.json(
    {
      success: true,
      fromCache: false,
      hlsUrl: result.hlsUrl,
      backupHlsUrls: result.backupHlsUrls || [],
      embeds: result.embeds || [],
      lang: "es",
      title: result.title,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=1800, s-maxage=1800",
      },
    }
  );
}
