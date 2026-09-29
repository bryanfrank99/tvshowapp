// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/supa";
import { needAdmin, needSuperAdmin } from "@/lib/access";
import { parseLangs, parseSubs } from "@/lib/providers";

// GET lista completa (con templates, URLs de disponibilidad y prioridad por idioma) · PUT upsert · PATCH toggle · DELETE
export async function GET(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;
  const sb = supa();
  const [p, c, primaryRes, availRes] = await Promise.all([
    sb.from("providers").select("*").order("ord"),
    sb.from("config").select("value").eq("key", "providers_version").maybeSingle(),
    sb.from("config").select("value").eq("key", "primary_providers_by_lang").maybeSingle(),
    sb.from("config").select("value").eq("key", "provider_availability_urls").maybeSingle(),
  ]);
  if (p.error) return NextResponse.json({ error: "db" }, { status: 500 });

  let fallbackAvailUrls: Record<string, any> = {};
  try {
    if (availRes.data?.value) {
      fallbackAvailUrls = JSON.parse(availRes.data.value);
    }
  } catch {}

  let primaryByLang: Record<string, string> = { es: "", pt: "", en: "" };
  try {
    if (primaryRes.data?.value) {
      primaryByLang = { ...primaryByLang, ...JSON.parse(primaryRes.data.value) };
    }
  } catch {}

  let activeIndex = 1;
  const enriched = (p.data || []).map((x: any) => {
    const languages = parseLangs(x.lang, x.id);
    const subtitles = parseSubs(x.subtitles, x.id);
    const simulated_name = x.active ? `S${typeof x.ord === "number" ? x.ord : activeIndex++}` : "S-";
    const provAvail = fallbackAvailUrls[x.id] || {};

    const isRedeflix = x.id === "redeflix" || String(x.movie_tpl || "").includes("redeflixapi.store");
    const movieListUrl =
      x.movie_list_url ||
      provAvail.movie_list_url ||
      (isRedeflix ? "https://redeflixapi.store/list-movie-ids.txt" : "");
    const tvListUrl =
      x.tv_list_url ||
      provAvail.tv_list_url ||
      (isRedeflix ? "https://redeflixapi.store/list-tv-ids.txt" : "");
    const animeListUrl =
      x.anime_list_url ||
      provAvail.anime_list_url ||
      (isRedeflix ? "https://redeflixapi.store/list-anime-ids.txt" : "");
    const doramaListUrl =
      x.dorama_list_url ||
      provAvail.dorama_list_url ||
      (isRedeflix ? "https://redeflixapi.store/list-dorama-ids.txt" : "");

    return {
      ...x,
      real_name: x.name,
      simulated_name,
      lang: languages.join(","),
      languages,
      subtitles,
      is_beta: !!x.is_beta,
      movie_list_url: movieListUrl,
      tv_list_url: tvListUrl,
      anime_list_url: animeListUrl,
      dorama_list_url: doramaListUrl,
    };
  });

  return NextResponse.json({
    providers: enriched,
    version: c.data?.value || "",
    primary_providers_by_lang: primaryByLang,
  });
}

export async function PUT(req: NextRequest) {
  const deny = await needSuperAdmin(req);
  if (deny) return deny;
  let b: any = {};
  try {
    b = await req.json();
  } catch {}

  // Acción 1: Guardar servidor prioritario por idioma
  if (b.action === "save_primary_by_lang" || b.primary_providers_by_lang) {
    const payload = b.primary_providers_by_lang || {};
    const cleanPrimary = {
      es: String(payload.es || "").trim(),
      pt: String(payload.pt || "").trim(),
      en: String(payload.en || "").trim(),
    };
    try {
      await supa()
        .from("config")
        .upsert(
          { key: "primary_providers_by_lang", value: JSON.stringify(cleanPrimary) },
          { onConflict: "key" }
        );
      await bump();
      return NextResponse.json({ ok: true, primary_providers_by_lang: cleanPrimary });
    } catch {
      return NextResponse.json({ error: "db" }, { status: 500 });
    }
  }

  // Acción 2: Guardar o actualizar proveedor
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
    id: String(b.id),
    name: String(b.name),
    movie_tpl: String(b.movie_tpl),
    tv_tpl: String(b.tv_tpl),
    needs_tmdb: !!b.needs_tmdb,
    tv_ok: !!b.tv_ok,
    entry_key: String(b.entry_key || ""),
    lang: langStr,
    subtitles: subStr,
    is_beta: !!b.is_beta,
    movie_list_url: String(b.movie_list_url || "").trim(),
    tv_list_url: String(b.tv_list_url || "").trim(),
    anime_list_url: String(b.anime_list_url || "").trim(),
    dorama_list_url: String(b.dorama_list_url || "").trim(),
    active: b.active !== false,
    ord: Number(b.ord) || 0,
    updated_at: new Date().toISOString(),
  };

  // Guardar en config como fallback siempre asegurado
  try {
    const sb = supa();
    const { data: currAvail } = await sb
      .from("config")
      .select("value")
      .eq("key", "provider_availability_urls")
      .maybeSingle();
    let map: Record<string, any> = {};
    if (currAvail?.value) {
      try {
        map = JSON.parse(currAvail.value);
      } catch {}
    }
    map[row.id] = {
      movie_list_url: row.movie_list_url,
      tv_list_url: row.tv_list_url,
      anime_list_url: row.anime_list_url,
      dorama_list_url: row.dorama_list_url,
    };
    await sb
      .from("config")
      .upsert(
        { key: "provider_availability_urls", value: JSON.stringify(map) },
        { onConflict: "key" }
      );
  } catch {}

  // Intento de guardado en la tabla providers con fallback escalonado
  try {
    const { error } = await supa().from("providers").upsert(row, { onConflict: "id" });
    if (error) throw error;
  } catch {
    // Fallback sin columnas de availability urls
    try {
      const {
        movie_list_url: _m,
        tv_list_url: _t,
        anime_list_url: _a,
        dorama_list_url: _d,
        ...rowNoAvail
      } = row;
      const { error: err0 } = await supa().from("providers").upsert(rowNoAvail, { onConflict: "id" });
      if (err0) throw err0;
    } catch {
      // Fallback sin is_beta
      try {
        const {
          movie_list_url: _m,
          tv_list_url: _t,
          anime_list_url: _a,
          dorama_list_url: _d,
          is_beta: _b,
          ...rowNoBeta
        } = row;
        const { error: err1 } = await supa().from("providers").upsert(rowNoBeta, { onConflict: "id" });
        if (err1) throw err1;
      } catch {
        // Fallback sin subtitles ni is_beta
        try {
          const {
            movie_list_url: _m,
            tv_list_url: _t,
            anime_list_url: _a,
            dorama_list_url: _d,
            is_beta: _b,
            subtitles: _s,
            ...rowNoSub
          } = row;
          const { error: err2 } = await supa().from("providers").upsert(rowNoSub, { onConflict: "id" });
          if (err2) throw err2;
        } catch {
          const {
            movie_list_url: _m,
            tv_list_url: _t,
            anime_list_url: _a,
            dorama_list_url: _d,
            is_beta: _b,
            lang: _l,
            subtitles: _s,
            ...baseRow
          } = row;
          const { error: baseErr } = await supa().from("providers").upsert(baseRow, { onConflict: "id" });
          if (baseErr) return NextResponse.json({ error: "db" }, { status: 500 });
        }
      }
    }
  }

  await bump();
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const deny = await needSuperAdmin(req);
  if (deny) return deny;
  let b: any = {};
  try {
    b = await req.json();
  } catch {}
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
  const deny = await needSuperAdmin(req);
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
