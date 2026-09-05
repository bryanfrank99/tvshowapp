import { NextResponse } from "next/server";

// Mapa nombre-normalizado → logo usando la DB abierta de iptv-org (sin key).
// Se cachea 24h en servidor. ~36k entradas reducidas a un mapa compacto.
const norm = (s: string) =>
  (s || "").toLowerCase().replace(/\.[a-z]{2}$/, "").replace(/[^a-z0-9]+/g, "");

// Caché propia en memoria: el JSON supera el límite de 2MB de la caché de Next.
let cache: { t: number; data: any } | null = null;
const TTL = 86400 * 1000;

export async function GET() {
  try {
    if (cache && Date.now() - cache.t < TTL) return NextResponse.json({ logos: cache.data, cached: true });
    const r = await fetch("https://iptv-org.github.io/api/logos.json", { cache: "no-store" });
    if (!r.ok) throw new Error("http " + r.status);
    const j = await r.json();
    const map: Record<string, string> = {};
    for (const l of j) {
      if (!l?.url || !l?.channel) continue;
      const k = norm(String(l.channel));
      if (!k || map[k]) continue; // primera (en uso) gana
      if (l.in_use === false && map[k]) continue;
      map[k] = l.url;
    }
    cache = { t: Date.now(), data: map };
    return NextResponse.json({ logos: map });
  } catch {
    return NextResponse.json({ logos: {} }, { status: 502 });
  }
}
