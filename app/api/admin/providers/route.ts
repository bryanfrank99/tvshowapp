// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/supa";
import { needAdmin } from "@/lib/access";
import { parseLangs, parseSubs } from "@/lib/providers";

// GET lista completa (con templates) · PUT upsert · PATCH toggle · DELETE
export async function GET(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;
  const sb = supa();
  const [p, c] = await Promise.all([
    sb.from("providers").select("*").order("ord"),
    sb.from("config").select("value").eq("key", "providers_version").maybeSingle(),
  ]);
  if (p.error) return NextResponse.json({ error: "db" }, { status: 500 });
  const enriched = (p.data || []).map((x: any) => {
    const languages = parseLangs(x.lang, x.id);
    const subtitles = parseSubs(x.subtitles, x.id);
    return {
      ...x,
      lang: languages.join(","),
      languages,
      subtitles,
      is_beta: !!x.is_beta,
    };
  });
  return NextResponse.json({ providers: enriched, version: c.data?.value || "" });
}

export async function PUT(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;
  let b: any = {};
  try { b = await req.json(); } catch {}
  if (!b.id || !b.name || !b.movie_tpl || !b.tv_tpl) {
    return NextResponse.json({ error: "params" }, { status: 400 });
  }

  let langStr = "multi";
  if (Array.isArray(b.languages) && b.languages.length) {
    langStr = b.languages.join(",");
  } else if (b.lang) {
    langStr = String(b.lang);
  }

  let subStr = "";
  if (Array.isArray(b.subtitles)) {
    subStr = b.subtitles.join(",");
  } else if (b.subtitles) {
    subStr = String(b.subtitles);
  }

  const row = {
    id: String(b.id), name: String(b.name),
    movie_tpl: String(b.movie_tpl), tv_tpl: String(b.tv_tpl),
    needs_tmdb: !!b.needs_tmdb, tv_ok: !!b.tv_ok,
    entry_key: String(b.entry_key || ""),
    lang: langStr,
    subtitles: subStr,
    is_beta: !!b.is_beta,
    active: b.active !== false, ord: Number(b.ord) || 0,
    updated_at: new Date().toISOString(),
  };

  try {
    const { error } = await supa().from("providers").upsert(row, { onConflict: "id" });
    if (error) throw error;
  } catch {
    // Fallback sin columna is_beta si no se ha corrido la migración SQL aún
    try {
      const { is_beta: _b, ...rowNoBeta } = row;
      const { error: err1 } = await supa().from("providers").upsert(rowNoBeta, { onConflict: "id" });
      if (err1) throw err1;
    } catch {
      // Fallback sin is_beta ni subtitles
      try {
        const { is_beta: _b, subtitles: _s, ...rowNoSub } = row;
        const { error: err2 } = await supa().from("providers").upsert(rowNoSub, { onConflict: "id" });
        if (err2) throw err2;
      } catch {
        const { is_beta: _b, lang: _l, subtitles: _s, ...baseRow } = row;
        const { error: baseErr } = await supa().from("providers").upsert(baseRow, { onConflict: "id" });
        if (baseErr) return NextResponse.json({ error: "db" }, { status: 500 });
      }
    }
  }
  await bump();
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;
  let b: any = {};
  try { b = await req.json(); } catch {}
  if (!b.id) return NextResponse.json({ error: "params" }, { status: 400 });
  const patch: any = { updated_at: new Date().toISOString() };
  if (typeof b.active === "boolean") patch.active = b.active;
  if (typeof b.is_beta === "boolean") patch.is_beta = b.is_beta;
  const { error } = await supa().from("providers").update(patch).eq("id", b.id);
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  await bump();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "params" }, { status: 400 });
  const { error } = await supa().from("providers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  await bump();
  return NextResponse.json({ ok: true });
}

async function bump() {
  try {
    const sb = supa();
    const { data } = await sb.from("config").select("value").eq("key", "providers_version").maybeSingle();
    const v = String(Number(data?.value || 0) + 1);
    await sb.from("config").upsert({ key: "providers_version", value: v }, { onConflict: "key" });
  } catch {}
}




