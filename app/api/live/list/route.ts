import { NextResponse } from "next/server";

// Proxy genérico para listas de canales (evita CORS). Solo hosts permitidos.
const ALLOWED = ["streambetter.shop", "tvf90.com"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("url") || "";
  let host = "";
  try { host = new URL(target).hostname; } catch {}
  if (!ALLOWED.some((h) => host === h || host.endsWith("." + h))) {
    return NextResponse.json({ error: "host no permitido" }, { status: 403 });
  }
  try {
    const r = await fetch(target, { next: { revalidate: 300 } });
    if (!r.ok) throw new Error("http " + r.status);
    return NextResponse.json(await r.json());
  } catch {
    return NextResponse.json({ error: "fetch" }, { status: 502 });
  }
}
