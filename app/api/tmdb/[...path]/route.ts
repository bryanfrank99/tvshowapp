import { NextRequest, NextResponse } from "next/server";

const BASE = "https://api.themoviedb.org/3";

// Proxy para uso cliente ocasional; la KEY vive solo en servidor.
export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const key = process.env.TMDB_API_KEY;
  if (!key || key === "TU_API_KEY_AQUI") return NextResponse.json({ error: "NO_KEY" }, { status: 500 });
  const lv = req.cookies.get("tvshow_lang")?.value;
  const lang = lv === "en" ? "en-US" : lv === "pt" ? "pt-BR" : "es-ES";
  const path = "/" + (params.path || []).join("/");
  const url = `${BASE}${path}?api_key=${key}&language=${lang}`;
  const r = await fetch(url, { next: { revalidate: 3600 } });
  const j = await r.json();
  return NextResponse.json(j, { status: r.status });
}
