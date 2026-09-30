import { NextRequest, NextResponse } from "next/server";
import { fetchCinecalidadEmbeds } from "@/lib/cinecalidad";

/**
 * Endpoint de resolución y redirección transparente para Cinecalidad:
 * GET /api/cinecalidad?type=movie&id=1339713
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

  if (!id) {
    return NextResponse.json({ error: "Falta el parámetro id (TMDB)" }, { status: 400 });
  }

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

    // Si se solicitó la respuesta en formato JSON estructurado
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

    // Seleccionar el embed correspondiente (o filtrar por host solicitado)
    let selected = embeds[0];
    if (requestedHost) {
      const match = embeds.find((item) =>
        String(item.host || item.server || "").toLowerCase().includes(requestedHost)
      );
      if (match) selected = match;
    }

    // Redirección 307 al reproductor iframe HTML5 con AdBlock
    return NextResponse.redirect(selected.url, { status: 307 });
  } catch (err: any) {
    console.error("[CinecalidadApi] Error al consultar API de Cinecalidad:", err?.message || err);
    return NextResponse.json(
      { error: "server_error", message: err?.message || "Error al conectar con Cinecalidad" },
      { status: 500 }
    );
  }
}
