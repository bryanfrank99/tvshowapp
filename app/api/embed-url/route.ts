import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import type { ProviderDef } from "@/lib/providers";

// Construye la URL de embed en SERVIDOR (la view_key de Vimeus nunca sale al cliente).
// GET /api/embed-url?provider=vidcore&type=movie&id=550&s=1&e=1
async function loadDefs(): Promise<{ defs: ProviderDef[]; key: string }> {
  const key = process.env.VIMEUS_VIEW_KEY || "";
  const remote = process.env.PROVIDERS_URL || "";
  if (remote) {
    try {
      const r = await fetch(remote, { next: { revalidate: 3600 } });
      if (r.ok) {
        const j = await r.json();
        const arr = Array.isArray(j) ? j : j.providers;
        if (Array.isArray(arr) && arr.length) return { defs: arr, key };
      }
    } catch {}
  }
  try {
    const raw = (await readFile(join(process.cwd(), "public", "providers.json"), "utf8")).replace(/^\uFEFF/, "");
    const j = JSON.parse(raw);
    const arr = Array.isArray(j) ? j : j.providers;
    return { defs: arr, key };
  } catch {
    return { defs: [], key };
  }
}

const fill = (tpl: string, id: string, s: string, e: string, key: string) => {
  const idparam = id.startsWith("tt") ? `imdb=${id}` : `tmdb=${id}`;
  return tpl
    .split("{id}").join(id).split("{s}").join(s).split("{e}").join(e)
    .split("{key}").join(key).split("{idparam}").join(idparam);
};

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const pid = q.get("provider") || "";
  const type = q.get("type") === "tv" ? "tv" : "movie";
  const id = q.get("id") || "";
  const s = q.get("s") || "1";
  const e = q.get("e") || "1";
  if (!pid || !id) return NextResponse.json({ error: "params" }, { status: 400 });
  const { defs, key } = await loadDefs();
  const def = defs.find((d) => d.id === pid);
  if (!def) return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  const tpl = type === "movie" ? def.movie : def.tv;
  return NextResponse.json({
    url: fill(tpl, id, s, e, def.key || key),
    needsTmdb: !!def.needsTmdb,
    name: def.name,
  });
}
