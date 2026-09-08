import { NextRequest, NextResponse } from "next/server";
import { searchAll, getTrending } from "@/lib/catalog";

// Búsqueda para la página cliente. Sin ?q= devuelve populares. ?page= pagina.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1"));
  try {
    const out = q ? await searchAll(q, page, 20) : await getTrending(page, 20);
    return NextResponse.json(out);
  } catch {
    return NextResponse.json({ items: [], hasMore: false }, { status: 502 });
  }
}
