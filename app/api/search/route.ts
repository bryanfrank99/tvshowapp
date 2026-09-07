import { NextRequest, NextResponse } from "next/server";
import { searchAll, getTrending } from "@/lib/catalog";

// Búsqueda para la página cliente. Sin ?q= devuelve populares.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  try {
    const results = q ? await searchAll(q) : await getTrending(20);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] }, { status: 502 });
  }
}
