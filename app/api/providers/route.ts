// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/supa";
import { checkSession, SESSION_COOKIE } from "@/lib/access";
import { parseLangs, parseSubs } from "@/lib/providers";

// Catálogo para el cliente (sin templates ni keys). Requiere sesión.
export async function GET(req: NextRequest) {
  const sess = await checkSession(req.cookies.get(SESSION_COOKIE)?.value).catch(() => null);
  if (!sess) return NextResponse.json({ error: "locked" }, { status: 401 });
  try {
    const sb = supa();
    let provData: any[] = [];
    try {
      const pRes = await sb.from("providers").select("id,name,needs_tmdb,tv_ok,lang,subtitles").eq("active", true).order("ord");
      if (!pRes.error && pRes.data) {
        provData = pRes.data;
      } else {
        const pRes2 = await sb.from("providers").select("id,name,needs_tmdb,tv_ok,lang").eq("active", true).order("ord");
        if (!pRes2.error && pRes2.data) {
          provData = pRes2.data;
        } else {
          const base = await sb.from("providers").select("id,name,needs_tmdb,tv_ok").eq("active", true).order("ord");
          if (base.data) provData = base.data;
        }
      }
    } catch {
      try {
        const base = await sb.from("providers").select("id,name,needs_tmdb,tv_ok").eq("active", true).order("ord");
        if (base.data) provData = base.data;
      } catch {}
    }

    const [l, c] = await Promise.all([
      sb.from("live_sources").select("id,name,format,list_url").eq("active", true).order("ord"),
      sb.from("config").select("value").eq("key", "providers_version").maybeSingle(),
    ]);

    return NextResponse.json({
      providers: provData.map((x: any) => {
        const languages = parseLangs(x.lang, x.id);
        const subtitles = parseSubs(x.subtitles, x.id);
        return {
          id: x.id,
          name: x.name,
          lang: languages[0] || "multi",
          languages,
          subtitles,
          needsTmdb: !!x.needs_tmdb,
          tvOk: !!x.tv_ok,
        };
      }),
      live: (l.data || []).map((x: any) => ({ id: x.id, name: x.name, format: x.format, list: x.list_url })),
      version: c.data?.value || "",
    });
  } catch {
    return NextResponse.json({ error: "db" }, { status: 500 });
  }
}


