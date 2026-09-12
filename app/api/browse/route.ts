import { NextRequest, NextResponse } from "next/server";
import { getFeaturedToday, getEpisodeSpotlight, getTopPicks, getUpcoming, getMovies, getSeries, getKids, getTrending, searchAll, getByGenre } from "@/lib/catalog";

// Paginación genérica para "Cargar más". ?source=&page=&id=&name=&q=
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const source = q.get("source") || "";
  const page = Math.max(2, parseInt(q.get("page") || "2"));
  try {
    let out = { items: [] as any[], hasMore: false };
    switch (source) {
      case "featured": out = await getFeaturedToday(page, 5); break;
      case "spotlight": {
        const r = await getEpisodeSpotlight(page, 6);
        out = { items: r.items as any[], hasMore: r.hasMore };
        break;
      }
      case "picks": out = await getTopPicks(page, 12); break;
      case "upcoming": out = await getUpcoming(page, 12); break;
      case "movies": out = await getMovies(page, 24); break;
      case "series": out = await getSeries(page, 24); break;
      case "kids": out = await getKids(page, 24); break;
      case "trending": out = await getTrending(page, 20); break;
      case "genre": out = await getByGenre(q.get("id") || "0", q.get("name") || "", page, 24); break;
      case "search": out = await searchAll(q.get("q") || "", page, 20); break;
      default: return NextResponse.json({ error: "source" }, { status: 400 });
    }
    return NextResponse.json(out);
  } catch {
    return NextResponse.json({ items: [], hasMore: false }, { status: 502 });
  }
}
