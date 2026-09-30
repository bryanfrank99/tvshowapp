import { NextRequest, NextResponse } from "next/server";
import { fetchMegaEmbedStream } from "@/lib/megaembed";

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

  const result = await fetchMegaEmbedStream({
    id,
    type,
    season: s,
    episode: e,
  });

  if (!result || !result.success) {
    return NextResponse.json(
      {
        error: "stream_not_found",
        message: "No se pudo extraer stream directo de MegaEmbed",
        details: result?.error,
        debugStatus: result?.debugStatus,
        preview: result?.debugHtmlPreview,
      },
      { status: 404 }
    );
  }

  if (redirect && result.hlsUrl) {
    return NextResponse.redirect(result.hlsUrl, 307);
  }

  return NextResponse.json(
    {
      success: true,
      hlsUrl: result.hlsUrl,
      mp4Url: result.mp4Url,
      allSources: result.allSources,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=1800, s-maxage=1800",
      },
    }
  );
}
