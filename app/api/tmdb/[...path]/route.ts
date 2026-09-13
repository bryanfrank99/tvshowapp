import { NextRequest, NextResponse } from "next/server";
import { getNowPlayingIds } from "@/lib/theaters-server";
import { isMovieInTheaters } from "@/lib/theaters";

const BASE = "https://api.themoviedb.org/3";

// Proxy para uso cliente ocasional; la KEY vive solo en servidor.
export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const key = process.env.TMDB_API_KEY;
  if (!key || key === "TU_API_KEY_AQUI") return NextResponse.json({ error: "NO_KEY" }, { status: 500 });
  const lv = req.cookies.get("tvshow_lang")?.value;
  const lang = lv === "en" ? "en-US" : lv === "pt" ? "pt-BR" : "es-ES";
  const forwardParams = new URLSearchParams(req.nextUrl.searchParams);
  forwardParams.set("api_key", key);
  if (!forwardParams.has("language")) forwardParams.set("language", lang);
  const path = "/" + (params.path || []).join("/");
  const url = `${BASE}${path}?${forwardParams.toString()}`;
  const r = await fetch(url, { next: { revalidate: 3600 } });
  const j = await r.json();

  if (params.path?.[0] === "movie" && j && j.id) {
    try {
      const nowPlayingIds = await getNowPlayingIds();
      j.in_theaters = nowPlayingIds.has(Number(j.id)) || isMovieInTheaters(j);
    } catch {}
  }

  return NextResponse.json(j, { status: r.status });
}
