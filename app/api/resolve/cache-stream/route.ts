import { NextRequest, NextResponse } from "next/server";
import { setCachedStream } from "@/lib/stream-cache";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { providerId, type, targetId, season, episode, hlsUrl, backupHlsUrls, ttlHours } = body;

    if (!providerId || !type || !targetId || !hlsUrl) {
      return NextResponse.json(
        { error: "bad_request", message: "Faltan parámetros obligatorios (providerId, type, targetId, hlsUrl)" },
        { status: 400 }
      );
    }

    const saved = await setCachedStream({
      providerId: String(providerId),
      type: type === "tv" ? "tv" : "movie",
      targetId: String(targetId),
      season: Number(season) || 1,
      episode: Number(episode) || 1,
      hlsUrl: String(hlsUrl),
      backupHlsUrls: Array.isArray(backupHlsUrls) ? backupHlsUrls : [],
      ttlHours: Number(ttlHours) || 24,
    });

    return NextResponse.json({
      success: saved,
      disabled: !saved,
      savedInDb: saved,
      providerId,
      targetId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "server_error", message: (err as Error)?.message || "Error al guardar caché de stream" },
      { status: 500 }
    );
  }
}
