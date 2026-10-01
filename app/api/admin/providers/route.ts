// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/supa";
import { needAdmin, needSuperAdmin } from "@/lib/access";
import { parseLangs, parseSubs } from "@/lib/providers";
import { EXTRACTOR_PRESETS, runHlsExtractor } from "@/lib/hls-engine";

// GET lista completa (con templates, extractor_configs y prioridades por idioma) · PUT upsert · PATCH toggle · DELETE
export async function GET(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;
  const sb = supa();
  const [p, c, primaryRes, availRes, prioritiesRes, hlsConfigRes, extractorConfigsRes, allowEmbedFallbackRes] = await Promise.all([
    sb.from("providers").select("*").order("ord"),
    sb.from("config").select("value").eq("key", "providers_version").maybeSingle(),
    sb.from("config").select("value").eq("key", "primary_providers_by_lang").maybeSingle(),
    sb.from("config").select("value").eq("key", "provider_availability_urls").maybeSingle(),
    sb.from("config").select("value").eq("key", "provider_priorities_by_lang").maybeSingle(),
    sb.from("config").select("value").eq("key", "provider_hls_config").maybeSingle(),
    sb.from("config").select("value").eq("key", "provider_extractor_configs").maybeSingle(),
    sb.from("config").select("value").eq("key", "allow_embed_fallback").maybeSingle(),
  ]);
  if (p.error) return NextResponse.json({ error: "db" }, { status: 500 });

  let fallbackHlsConfig: Record<string, { enabled: boolean; extractor: string }> = {
    megaembed: { enabled: true, extractor: "megaembed" },
    watchplay: { enabled: true, extractor: "watchplay" },
    cinecalidad: { enabled: true, extractor: "direct" },
    nasriplay: { enabled: true, extractor: "direct" },
  };
  try {
    if (hlsConfigRes.data?.value) {
      fallbackHlsConfig = { ...fallbackHlsConfig, ...JSON.parse(hlsConfigRes.data.value) };
    }
  } catch {}

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

  let prioritiesByLang: Record<string, string[]> = {
    es: primaryByLang.es ? [primaryByLang.es] : [],
    pt: primaryByLang.pt ? [primaryByLang.pt] : [],
    en: primaryByLang.en ? [primaryByLang.en] : [],
  };
  try {
    if (prioritiesRes.data?.value) {
      const parsed = JSON.parse(prioritiesRes.data.value);
      prioritiesByLang = {
        es: Array.isArray(parsed.es) ? parsed.es : prioritiesByLang.es,
        pt: Array.isArray(parsed.pt) ? parsed.pt : prioritiesByLang.pt,
        en: Array.isArray(parsed.en) ? parsed.en : prioritiesByLang.en,
      };
    }
  } catch {}

  let fallbackExtractorConfigs: Record<string, any> = {};
  try {
    if (extractorConfigsRes.data?.value) {
      fallbackExtractorConfigs = JSON.parse(extractorConfigsRes.data.value);
    }
  } catch {}

  const allowEmbedFallback = allowEmbedFallbackRes.data?.value === "true";

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

    const extCfg =
      x.extractor_config ||
      fallbackExtractorConfigs[x.id] ||
      EXTRACTOR_PRESETS[x.id]?.template ||
      (x.id === "cinecalidad" ? EXTRACTOR_PRESETS.vimeos_json.template :
       x.id === "nasriplay" ? EXTRACTOR_PRESETS.nasriplay_token.template :
       x.id === "playerflix" ? EXTRACTOR_PRESETS.playerflix.template :
       x.id === "megaembed" ? EXTRACTOR_PRESETS.megaembed.template :
       (x.id === "watchplay" || x.id === "EmbedMovies-V2") ? EXTRACTOR_PRESETS.watchplay.template :
       { preset: "direct_m3u8" });

    const hlsCfg = fallbackHlsConfig[x.id] || {
      enabled: x.id === "megaembed" || x.id === "watchplay" || x.id === "cinecalidad" || x.id === "nasriplay" || x.id === "playerflix",
      extractor: x.id === "megaembed" ? "megaembed" : x.id === "watchplay" ? "watchplay" : (x.id === "cinecalidad" || x.id === "nasriplay") ? "direct" : "none",
    };

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
      hls_enabled: !!hlsCfg.enabled,
      hls_extractor: hlsCfg.extractor || (hlsCfg.enabled ? "direct" : "none"),
      extractor_config: extCfg,
    };
  });

  return NextResponse.json({
    providers: enriched,
    version: c.data?.value || "",
    primary_providers_by_lang: primaryByLang,
    provider_priorities_by_lang: prioritiesByLang,
    provider_hls_config: fallbackHlsConfig,
    provider_extractor_configs: fallbackExtractorConfigs,
    allow_embed_fallback: allowEmbedFallback,
    extractor_presets: EXTRACTOR_PRESETS,
  });
}

export async function PUT(req: NextRequest) {
  const deny = await needSuperAdmin(req);
  if (deny) return deny;
  let b: any = {};
  try {
    b = await req.json();
  } catch {}

  // Acción 0A: Probar Extractor HLS dinámico en vivo (Spec 096)
  if (b.action === "test_extractor") {
    const tmdbId = String(b.tmdbId || (b.type === "tv" ? "1399" : "550")).trim();
    const type = b.type === "tv" ? "tv" : "movie";
    const season = b.season ? parseInt(b.season, 10) : 1;
    const episode = b.episode ? parseInt(b.episode, 10) : 1;

    let config = b.extractor_config;
    if (typeof config === "string") {
      try {
        config = JSON.parse(config);
      } catch {}
    }

    const result = await runHlsExtractor({
      providerId: String(b.providerId || b.id || "test"),
      config,
      movieTpl: b.movie_tpl || b.movie_api_url,
      tvTpl: b.tv_tpl || b.tv_api_url,
      type,
      id: tmdbId,
      season,
      episode,
    });

    return NextResponse.json({
      ok: result.success,
      result,
    });
  }

  // Acción 0B: Conmutar interruptor global de embeds de respaldo
  if (b.action === "toggle_embed_fallback") {
    const allow = b.allow_embed_fallback !== undefined ? !!b.allow_embed_fallback : !!b.allow;
    await supa().from("config").upsert(
      {
        key: "allow_embed_fallback",
        value: String(allow),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );
    await bump();
    return NextResponse.json({ ok: true, allow_embed_fallback: allow });
  }

  // Acción 0: Probar URL o lista de disponibilidad de catálogo (modo válido o inválido)
  if (b.action === "test_availability") {
    const url = String(b.url || "").trim();
    const type = b.type === "movie" ? "movie" : "tv";
    const mode: "valid" | "invalid" = b.mode === "invalid" ? "invalid" : "valid";
    const defaultTmdb = mode === "invalid" ? "999999999" : (type === "tv" ? "1396" : "969681");
    const defaultImdb = mode === "invalid" ? "tt999999999" : (type === "tv" ? "tt0903747" : "tt6263850");
    const defaultSeason = mode === "invalid" ? 99 : 1;
    const defaultEpisode = mode === "invalid" ? 99 : 1;

    const tmdbId = String(b.tmdbId || defaultTmdb).trim();
    const imdbId = String(b.imdbId || defaultImdb).trim();
    const s = b.season ? parseInt(b.season, 10) : defaultSeason;
    const e = b.episode ? parseInt(b.episode, 10) : defaultEpisode;

    if (!url) {
      return NextResponse.json({ error: "Falta la URL para probar" }, { status: 400 });
    }

    try {
      const { isRedeflixAvailable, isProbeUrl, interpolateProbeUrl } = await import("@/lib/redeflix-availability");

      const probe = isProbeUrl(url);
      const effectiveUrl = probe
        ? interpolateProbeUrl(url, { tmdbId, imdbId, id: tmdbId, season: s, episode: e })
        : url;

      const isAvail = await isRedeflixAvailable({
        type,
        tmdbId,
        imdbId,
        season: s,
        episode: e,
        movieListUrl: type === "movie" ? url : undefined,
        tvListUrl: type === "tv" ? url : undefined,
      });

      return NextResponse.json({
        ok: true,
        available: isAvail,
        mode,
        isProbe: probe,
        testedUrl: effectiveUrl,
        type,
        tmdbId,
        imdbId,
        season: type === "tv" ? s : undefined,
        episode: type === "tv" ? e : undefined,
      });
    } catch (err: any) {
      return NextResponse.json(
        {
          ok: false,
          error: err?.message || "Error al verificar disponibilidad",
        },
        { status: 500 }
      );
    }
  }

  // Acción: Sincronizar catálogo persistente en Supabase (Bypass Cloudflare 403)
  if (b.action === "sync_catalog") {
    try {
      const { url, content } = b;
      if (!url) {
        return NextResponse.json({ error: "Falta la URL para sincronizar" }, { status: 400 });
      }
      const cleanUrl = String(url).trim().replace(/\/+$/, "");
      let catalogText = content ? String(content).trim() : "";

      if (!catalogText) {
        const tryFetch = async (u: string) => {
          const res = await fetch(u, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
              Accept: "application/json, text/plain, */*",
            },
            signal: AbortSignal.timeout(10000),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.text();
        };

        try {
          catalogText = await tryFetch(cleanUrl);
        } catch {
          if (cleanUrl.includes("mgeb.top")) {
            const fallbackUrl = cleanUrl.replace("mgeb.top", "megaembed.com");
            try {
              catalogText = await tryFetch(fallbackUrl);
            } catch {}
          }
        }
      }

      if (!catalogText) {
        return NextResponse.json(
          { ok: false, error: "No se pudo descargar el catálogo (bloqueado por Cloudflare en datacenter)" },
          { status: 502 }
        );
      }

      let count = 0;
      try {
        const parsed = JSON.parse(catalogText);
        count = Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length;
      } catch {
        count = catalogText.split("\n").filter(Boolean).length;
      }

      const sb = supa();
      await sb.from("config").upsert([
        { key: `catalog_cache:${cleanUrl}`, value: catalogText },
        { key: `catalog_cache:${cleanUrl}/`, value: catalogText },
      ], { onConflict: "key" });

      const { clearRedeflixCache } = await import("@/lib/redeflix-availability");
      clearRedeflixCache();

      return NextResponse.json({
        ok: true,
        count,
        url: cleanUrl,
        syncedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err?.message || "Error al sincronizar catálogo" }, { status: 500 });
    }
  }

  // Acción 1A: Guardar sistema multicapa de prioridades por idioma
  if (b.action === "save_priorities_by_lang" || b.provider_priorities_by_lang) {
    const payload = b.provider_priorities_by_lang || {};
    const cleanPriorities = {
      es: Array.isArray(payload.es) ? payload.es.map(String).map((s) => s.trim()).filter(Boolean) : [],
      pt: Array.isArray(payload.pt) ? payload.pt.map(String).map((s) => s.trim()).filter(Boolean) : [],
      en: Array.isArray(payload.en) ? payload.en.map(String).map((s) => s.trim()).filter(Boolean) : [],
    };
    const cleanPrimary = {
      es: cleanPriorities.es[0] || "",
      pt: cleanPriorities.pt[0] || "",
      en: cleanPriorities.en[0] || "",
    };
    try {
      await Promise.all([
        supa()
          .from("config")
          .upsert(
            { key: "provider_priorities_by_lang", value: JSON.stringify(cleanPriorities) },
            { onConflict: "key" }
          ),
        supa()
          .from("config")
          .upsert(
            { key: "primary_providers_by_lang", value: JSON.stringify(cleanPrimary) },
            { onConflict: "key" }
          ),
      ]);
      await bump();
      return NextResponse.json({
        ok: true,
        provider_priorities_by_lang: cleanPriorities,
        primary_providers_by_lang: cleanPrimary,
      });
    } catch {
      return NextResponse.json({ error: "db" }, { status: 500 });
    }
  }

  // Acción 1B: Guardar servidor prioritario individual por idioma (retrocompatibilidad)
  if (b.action === "save_primary_by_lang" || b.primary_providers_by_lang) {
    const payload = b.primary_providers_by_lang || {};
    const cleanPrimary = {
      es: String(payload.es || "").trim(),
      pt: String(payload.pt || "").trim(),
      en: String(payload.en || "").trim(),
    };
    const cleanPriorities = {
      es: cleanPrimary.es ? [cleanPrimary.es] : [],
      pt: cleanPrimary.pt ? [cleanPrimary.pt] : [],
      en: cleanPrimary.en ? [cleanPrimary.en] : [],
    };
    try {
      await Promise.all([
        supa()
          .from("config")
          .upsert(
            { key: "primary_providers_by_lang", value: JSON.stringify(cleanPrimary) },
            { onConflict: "key" }
          ),
        supa()
          .from("config")
          .upsert(
            { key: "provider_priorities_by_lang", value: JSON.stringify(cleanPriorities) },
            { onConflict: "key" }
          ),
      ]);
      await bump();
      return NextResponse.json({
        ok: true,
        primary_providers_by_lang: cleanPrimary,
        provider_priorities_by_lang: cleanPriorities,
      });
    } catch {
      return NextResponse.json({ error: "db" }, { status: 500 });
    }
  }

  // Acción 1B: Guardar configuración de compatibilidad HLS por proveedor
  if (b.action === "save_hls_config" && b.provider_hls_config) {
    try {
      await supa().from("config").upsert(
        { key: "provider_hls_config", value: JSON.stringify(b.provider_hls_config) },
        { onConflict: "key" }
      );
      await bump();
      return NextResponse.json({
        ok: true,
        provider_hls_config: b.provider_hls_config,
      });
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

    if (b.hls_enabled !== undefined || b.hls_extractor) {
      const { data: currHls } = await sb
        .from("config")
        .select("value")
        .eq("key", "provider_hls_config")
        .maybeSingle();
      let hlsMap: Record<string, any> = {
        megaembed: { enabled: true, extractor: "megaembed" },
        watchplay: { enabled: true, extractor: "watchplay" },
        cinecalidad: { enabled: true, extractor: "direct" },
        nasriplay: { enabled: true, extractor: "direct" },
      };
      if (currHls?.value) {
        try {
          hlsMap = { ...hlsMap, ...JSON.parse(currHls.value) };
        } catch {}
      }
      hlsMap[row.id] = {
        enabled: !!b.hls_enabled,
        extractor: b.hls_extractor || (b.hls_enabled ? "direct" : "none"),
      };
      await sb
        .from("config")
        .upsert(
          { key: "provider_hls_config", value: JSON.stringify(hlsMap) },
          { onConflict: "key" }
        );
    }
    if (b.extractor_config !== undefined) {
      let parsedCfg = b.extractor_config;
      if (typeof parsedCfg === "string") {
        try {
          parsedCfg = JSON.parse(parsedCfg);
        } catch {}
      }
      const { data: currExtRes } = await sb
        .from("config")
        .select("value")
        .eq("key", "provider_extractor_configs")
        .maybeSingle();
      let extMap: Record<string, any> = {};
      if (currExtRes?.value) {
        try {
          extMap = JSON.parse(currExtRes.value);
        } catch {}
      }
      extMap[row.id] = parsedCfg;
      await sb.from("config").upsert(
        {
          key: "provider_extractor_configs",
          value: JSON.stringify(extMap),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
    }
  } catch {}

  // Intento de guardado en la tabla providers con fallback escalonado
  const parsedExtractorConfig =
    typeof b.extractor_config === "string"
      ? (() => {
          try {
            return JSON.parse(b.extractor_config);
          } catch {
            return {};
          }
        })()
      : b.extractor_config || {};

  try {
    const { error } = await supa()
      .from("providers")
      .upsert({ ...row, extractor_config: parsedExtractorConfig }, { onConflict: "id" });
    if (error) throw error;
  } catch {
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
