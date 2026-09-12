// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/supa";
import { checkSession, SESSION_COOKIE } from "@/lib/access";
import type { ProviderDef } from "@/lib/providers";

// Construye la URL de embed en SERVIDOR. Requiere sesión (código válido).
// La view_key de Vimeus nunca sale al cliente.
// GET /api/embed-url?provider=vidcore&type=movie&id=550&s=1&e=1
const fill = (tpl: string, id: string, s: string, e: string, key: string) => {
  const idparam = id.startsWith("tt") ? `imdb=${id}` : `tmdb=${id}`;
  const tmdbflag = id.startsWith("tt") ? "" : "&tmdb=1";
  return tpl
    .split("{id}").join(id).split("{s}").join(s).split("{e}").join(e)
    .split("{key}").join(key).split("{idparam}").join(idparam).split("{tmdbflag}").join(tmdbflag);
};

export async function GET(req: NextRequest) {
  const sess = await checkSession(req.cookies.get(SESSION_COOKIE)?.value).catch(() => null);
  if (!sess) return NextResponse.json({ error: "locked" }, { status: 401 });
  const q = req.nextUrl.searchParams;
  const pid = q.get("provider") || "";
  const type = q.get("type") === "tv" ? "tv" : "movie";
  const id = q.get("id") || "";
  const s = q.get("s") || "1";
  const e = q.get("e") || "1";
  if (!pid || !id) return NextResponse.json({ error: "params" }, { status: 400 });
  try {
    const sb = supa();
    const { data, error } = await sb
      .from("providers")
      .select("id,name,movie_tpl,tv_tpl,needs_tmdb,tv_ok,entry_key")
      .eq("id", pid)
      .eq("active", true)
      .maybeSingle();
    if (error || !data) return NextResponse.json({ error: "unknown provider" }, { status: 404 });
    const key = process.env.VIMEUS_VIEW_KEY || "";
    const tpl = type === "movie" ? data.movie_tpl : data.tv_tpl;
    return NextResponse.json({
      url: fill(tpl, id, s, e, (data as any).entry_key || key),
      needsTmdb: !!(data as any).needs_tmdb,
      name: (data as any).name,
    });
  } catch {
    return NextResponse.json({ error: "db" }, { status: 500 });
  }
}

