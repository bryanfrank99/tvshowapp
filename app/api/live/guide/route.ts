import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import { gunzipSync } from "zlib";

// EPG XMLTV por país (iptv-epg.org, sin key, actualizado cada ~4h).
// Devuelve mapa nombre-normalizado → { now, next }. Caché 1h en servidor.
const COUNTRIES = ["mx", "ar", "co", "pe", "br", "pt", "es"];

// Caché propia en memoria: los XML superan el límite de 2MB de la caché de Next.
let cache: { t: number; data: any } | null = null;
const TTL = 3600 * 1000;

const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/^[a-z]{2}\s*-\s*/, "").replace(/[^a-z0-9]+/g, "");

function parseTime(s: string): number {
  // "20260905210000 +0000"
  const m = s.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/);
  if (!m) return 0;
  const [, Y, M, D, h, mi, sec, tz] = m;
  const off = tz ? `${tz.slice(0, 3)}:${tz.slice(3)}` : "Z";
  return Date.parse(`${Y}-${M}-${D}T${h}:${mi}:${sec}${off}`);
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.t < TTL) return NextResponse.json({ guide: cache.data, cached: true });
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
    const map: Record<string, { now: any; next: any }> = {};
    await Promise.all(
      COUNTRIES.map(async (c) => {
        try {
          const r = await fetch(`https://iptv-epg.org/files/epg-${c}.xml.gz`, { cache: "no-store" });
          if (!r.ok) return;
          const xml = gunzipSync(Buffer.from(await r.arrayBuffer())).toString();
          const j = parser.parse(xml);
          const chans = Array.isArray(j.tv?.channel) ? j.tv.channel : [j.tv?.channel].filter(Boolean);
          const names: Record<string, string> = {};
          for (const ch of chans) {
            const dn = Array.isArray(ch["display-name"]) ? ch["display-name"][0] : ch["display-name"];
            const nm = typeof dn === "object" ? dn["#text"] || "" : String(dn || "");
            if (ch.id && nm) names[ch.id] = norm(nm);
          }
          const progs = Array.isArray(j.tv?.programme) ? j.tv.programme : [j.tv?.programme].filter(Boolean);
          const now = Date.now();
          const byCh: Record<string, { now?: any; next?: any }> = {};
          for (const p of progs) {
            if (!p?.channel) continue;
            const start = parseTime(p.start || "");
            const stop = parseTime(p.stop || "");
            if (!start || !stop) continue;
            const e = (byCh[p.channel] = byCh[p.channel] || {});
            const title = typeof p.title === "object" ? p.title["#text"] || "" : String(p.title || "");
            const icon = typeof p.icon === "object" ? p.icon.src || "" : String(p.icon || "");
            if (start <= now && now < stop && !e.now) e.now = { title, start, stop, icon };
            else if (start > now && !e.next) e.next = { title, start, stop, icon };
            if (e.now && e.next) continue;
          }
          for (const [cid, v] of Object.entries(byCh)) {
            const k = names[cid];
            if (!k || map[k]) continue;
            map[k] = {
              now: v.now ? { t: v.now.title, s: v.now.start, e: v.now.stop, img: v.now.icon || "" } : null,
              next: v.next ? { t: v.next.title, s: v.next.start, e: v.next.stop } : null,
            } as any;
          }
        } catch {}
      })
    );
    cache = { t: Date.now(), data: map };
    return NextResponse.json({ guide: map });
  } catch {
    return NextResponse.json({ guide: {} }, { status: 502 });
  }
}
