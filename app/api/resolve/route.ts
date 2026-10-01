// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/supa";
import { checkSession, SESSION_COOKIE } from "@/lib/access";
import { providersToSources, type ProviderAdapterInput } from "@/lib/adapters/provider-adapter";
import { parseLangs, parseSubs } from "@/lib/providers";
import { sortSourcesByPriority, type ResolveResponse, type Source } from "@/lib/sources";
import { isRedeflixProvider, isRedeflixAvailable } from "@/lib/redeflix-availability";

// In-memory cache de resolución IMDb ↔ TMDB en servidor (TTL 24 horas)
const idMapCache = new Map<string, { tmdb?: string; imdb?: string; exp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function getServerTmdbId(type: "movie" | "tv", imdbId: string): Promise<string | null> {
  const cacheKey = `${type}:${imdbId}`;
  const hit = idMapCache.get(cacheKey);
  if (hit && hit.exp > Date.now() && hit.tmdb) {
    return hit.tmdb;
  }

  try {
    const stremioType = type === "movie" ? "movie" : "series";
    const res = await fetch(`https://v3-cinemeta.strem.io/meta/${stremioType}/${imdbId}.json`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const moviedbId = data?.meta?.moviedb_id ? String(data.meta.moviedb_id) : null;
    if (moviedbId) {
      idMapCache.set(cacheKey, { tmdb: moviedbId, imdb: imdbId, exp: Date.now() + CACHE_TTL_MS });
    }
    return moviedbId;
  } catch {
    return null;
  }
}

async function getServerImdbId(type: "movie" | "tv", tmdbId: string): Promise<string | null> {
  const cacheKey = `${type}:${tmdbId}`;
  const hit = idMapCache.get(cacheKey);
  if (hit && hit.exp > Date.now() && hit.imdb) {
    return hit.imdb;
  }

  const tmdbKey = process.env.TMDB_KEY || process.env.TMDB_API_KEY || "";
  if (!tmdbKey) return null;

  try {
    const res = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}/external_ids?api_key=${tmdbKey}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const imdbId = data?.imdb_id ? String(data.imdb_id) : null;
    if (imdbId) {
      idMapCache.set(cacheKey, { tmdb: tmdbId, imdb: imdbId, exp: Date.now() + CACHE_TTL_MS });
    }
    return imdbId;
  } catch {
    return null;
  }
}

/**
 * GET /api/resolve?type=movie|tv&id=...&s=1&e=1&lang=es
 *
 * Endpoint central del Resolver:
 * 1. Valida la sesión del usuario.
 * 2. Resuelve identificadores (IMDb ↔ TMDB) según los requisitos de los servidores.
 * 3. Consulta la base de datos de proveedores activos.
 * 4. Construye una lista homogénea de fuentes `Source[]` con URLs listas y seguras.
 * 5. Ordena las fuentes por prioridad y afinidad idiomática.
 */
export async function GET(req: NextRequest) {
  // 1. Control de acceso / Sesión (vía cookie o cabecera Bearer)
  const token =
    req.cookies.get(SESSION_COOKIE)?.value ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const sess = await checkSession(token).catch(() => null);
  if (!sess) {
    return NextResponse.json({ error: "locked", message: "Acceso no autorizado" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams;
  const rawId = (q.get("id") || "").trim();
  const type = (q.get("type") === "tv" ? "tv" : "movie") as "movie" | "tv";
  const s = Math.max(1, parseInt(q.get("s") || "1", 10) || 1);
  const e = Math.max(1, parseInt(q.get("e") || "1", 10) || 1);
  const langParam = q.get("lang");
  const langCookie = req.cookies.get("tvshow_lang")?.value;
  const userLang = (langParam || langCookie || "es").toLowerCase().trim();

  if (!rawId) {
    return NextResponse.json({ error: "params", message: "Falta parámetro 'id'" }, { status: 400 });
  }

  try {
    const sb = supa();

    // 2. Consulta de proveedores, versión, prioridades lingüísticas y configuración HLS / Extractores / Modo de Streams
    const [provRes, verRes, primaryRes, availRes, prioritiesRes, hlsConfigRes, allowEmbedRes, extConfigsRes, streamModesRes] = await Promise.all([
      sb
        .from("providers")
        .select("*")
        .eq("active", true)
        .order("ord"),
      sb.from("config").select("value").eq("key", "providers_version").maybeSingle(),
      sb.from("config").select("value").eq("key", "primary_providers_by_lang").maybeSingle(),
      sb.from("config").select("value").eq("key", "provider_availability_urls").maybeSingle(),
      sb.from("config").select("value").eq("key", "provider_priorities_by_lang").maybeSingle(),
      sb.from("config").select("value").eq("key", "provider_hls_config").maybeSingle(),
      sb.from("config").select("value").eq("key", "allow_embed_fallback").maybeSingle(),
      sb.from("config").select("value").eq("key", "provider_extractor_configs").maybeSingle(),
      sb.from("config").select("value").eq("key", "provider_stream_modes").maybeSingle(),
    ]);

    if (provRes.error || !provRes.data) {
      return NextResponse.json({ error: "db", message: "Error cargando proveedores" }, { status: 500 });
    }

    const allowEmbedFallback = allowEmbedRes?.data?.value === "true";
    let providerStreamModes: Record<string, "hls" | "embed" | "both"> = {};
    try {
      if (streamModesRes?.data?.value) {
        providerStreamModes = JSON.parse(streamModesRes.data.value);
      }
    } catch {}
    let fallbackExtractorConfigs: Record<string, any> = {};
    try {
      if (extConfigsRes?.data?.value) {
        fallbackExtractorConfigs = JSON.parse(extConfigsRes.data.value);
      }
    } catch {}

    try {
      const { EXTRACTOR_PRESETS } = await import("@/lib/hls-engine");
      for (const [key, preset] of Object.entries(EXTRACTOR_PRESETS)) {
        if (!fallbackExtractorConfigs[key]) {
          fallbackExtractorConfigs[key] = preset.template;
        }
      }
    } catch {}

    let hlsConfigMap: Record<string, { enabled: boolean; extractor: string }> = {
      megaembed: { enabled: true, extractor: "megaembed" },
      watchplay: { enabled: true, extractor: "watchplay" },
      playerflix: { enabled: true, extractor: "playerflix" },
    };
    try {
      if (hlsConfigRes.data?.value) {
        hlsConfigMap = { ...hlsConfigMap, ...JSON.parse(hlsConfigRes.data.value) };
      }
    } catch {}

    const providersData = provRes.data;
    const version = (verRes.data as any)?.value || "1.0";

    let primaryByLang: Record<string, string[] | string> = {};
    try {
      if (prioritiesRes?.data?.value) {
        primaryByLang = JSON.parse(prioritiesRes.data.value);
      } else if (primaryRes.data?.value) {
        primaryByLang = JSON.parse(primaryRes.data.value);
      }
    } catch {}

    let fallbackAvailUrls: Record<string, any> = {};
    try {
      if (availRes.data?.value) {
        fallbackAvailUrls = JSON.parse(availRes.data.value);
      }
    } catch {}

    // 3. Resolución de IDs según los requerimientos de los proveedores activos
    const isImdb = rawId.startsWith("tt");
    let effectiveTmdbId: string | undefined = !isImdb ? rawId : undefined;
    let effectiveImdbId: string | undefined = isImdb ? rawId : undefined;

    const needsTmdbCount = providersData.filter((p: any) => !!p.needs_tmdb).length;
    const hasAvailCheck = providersData.some(
      (p: any) => p.movie_list_url || p.tv_list_url || fallbackAvailUrls[p.id] || isRedeflixProvider(p)
    );

    if (isImdb && (needsTmdbCount > 0 || hasAvailCheck)) {
      const resolvedTmdb = await getServerTmdbId(type, rawId);
      if (resolvedTmdb) {
        effectiveTmdbId = resolvedTmdb;
      }
    } else if (!isImdb) {
      const resolvedImdb = await getServerImdbId(type, rawId);
      if (resolvedImdb) {
        effectiveImdbId = resolvedImdb;
      }
    }

    const defaultVimeusKey = process.env.VIMEUS_VIEW_KEY || "";

    // 4. Adaptación y construcción concurrente de fuentes disponibles con timeout
    const eligibleProviderResults = await Promise.all(
      providersData.map(async (p: any, idx: number) => {
        const provAvail = fallbackAvailUrls[p.id] || {};
        const movieListUrl = p.movie_list_url || provAvail.movie_list_url || "";
        const tvListUrl = p.tv_list_url || provAvail.tv_list_url || "";
        const animeListUrl = p.anime_list_url || provAvail.anime_list_url || "";
        const doramaListUrl = p.dorama_list_url || provAvail.dorama_list_url || "";

        // Filtrar servidor si el contenido no está disponible en sus listas de catálogo
        if (isRedeflixProvider({ ...p, movie_list_url: movieListUrl, tv_list_url: tvListUrl })) {
          if (!effectiveTmdbId && !effectiveImdbId) {
            return null;
          }
          try {
            const availPromise = isRedeflixAvailable({
              type,
              tmdbId: effectiveTmdbId,
              imdbId: effectiveImdbId,
              season: s,
              episode: e,
              movieListUrl,
              tvListUrl,
              animeListUrl,
              doramaListUrl,
              needsTmdb: !!p.needs_tmdb,
            });
            const timeoutPromise = new Promise<boolean>((resolve) =>
              setTimeout(() => resolve(true), 1500)
            );
            const isAvail = await Promise.race([availPromise, timeoutPromise]);
            if (!isAvail) return null;
          } catch {
            // En caso de fallo de red puntual, conservar proveedor como fallback
          }
        }

        const requiresTmdb = !!p.needs_tmdb;
        const targetId = requiresTmdb
          ? (effectiveTmdbId || rawId)
          : (effectiveImdbId || rawId);

        const serverOrd = typeof p.ord === "number" ? p.ord : idx + 1;
        const canonicalSimulatedName = `S${serverOrd}`;

        return {
          id: p.id,
          name: canonicalSimulatedName,
          real_name: p.name,
          simulated_name: canonicalSimulatedName,
          ord: serverOrd,
          movie_tpl: p.movie_tpl,
          tv_tpl: p.tv_tpl,
          needs_tmdb: requiresTmdb,
          tv_ok: !!p.tv_ok,
          lang: p.lang,
          languages: parseLangs(p.lang, p.id),
          subtitles: parseSubs(p.subtitles, p.id),
          is_beta: !!p.is_beta,
          entry_key: p.entry_key || defaultVimeusKey,
          key: p.entry_key || defaultVimeusKey,
          extractor_config: p.extractor_config || fallbackExtractorConfigs[p.id],
        } as ProviderAdapterInput & { extractor_config?: any };
      })
    );

    const eligibleProviders = eligibleProviderResults.filter(Boolean) as ProviderAdapterInput[];

    // 5. Transformación concurrente y ordenamiento estricto por prioridad lingüística
    const sourceBatches = await Promise.all(
      eligibleProviders.map(async (prov): Promise<Source[]> => {
        const provSources: Source[] = [];
        const targetId = prov.needs_tmdb ? (effectiveTmdbId as string) : (effectiveImdbId || rawId);

        const extConfig = (prov as any).extractor_config || fallbackExtractorConfigs[prov.id];

        // 1. Consulta en caché de streams M3U8 para entrega instantánea
        let cachedHls: { hlsUrl: string; backupHlsUrls?: string[]; embeds?: any[] } | null = null;
        try {
          const { getCachedStream } = await import("@/lib/stream-cache");
          cachedHls = await getCachedStream({
            providerId: prov.id,
            type,
            targetId,
            season: s,
            episode: e,
          });
        } catch {}

        let directHlsUrl = cachedHls?.hlsUrl;
        let backupUrls = cachedHls?.backupHlsUrls || [];
        let fetchedEmbeds: any[] | undefined = cachedHls?.embeds;
        let subtitles: any[] = prov.subtitles || [];

        // 2. Si no está en caché o falta metadata, ejecutar extracción declarativa uniforme
        if (!directHlsUrl || !fetchedEmbeds || fetchedEmbeds.length === 0) {
          try {
            const { runHlsExtractor } = await import("@/lib/hls-engine");
            const extractPromise = runHlsExtractor({
              providerId: prov.id,
              config: extConfig,
              movieTpl: prov.movie_tpl,
              tvTpl: prov.tv_tpl,
              type,
              id: targetId,
              season: s,
              episode: e,
            });
            const timeoutPromise = new Promise<any>((resolve) => setTimeout(() => resolve(null), 25000));
            const fresh = await Promise.race([extractPromise, timeoutPromise]);

            if (fresh) {
              if (fresh.embeds && fresh.embeds.length > 0) {
                fetchedEmbeds = fresh.embeds;
              }
              if (fresh.success && fresh.hlsUrl) {
                directHlsUrl = fresh.hlsUrl;
                backupUrls = fresh.backupHlsUrls || [];

                if (fresh.subtitles && fresh.subtitles.length > 0) {
                  subtitles = fresh.subtitles.map((st: any, idx: number) => ({
                    id: `sub-${prov.id}-${idx}`,
                    lang: (prov.lang as any) || "es",
                    label: st.label || "Español",
                    url: st.file || st.url,
                    isDefault: !!st.default,
                  }));
                }

                const { setCachedStream } = await import("@/lib/stream-cache");
                setCachedStream({
                  providerId: prov.id,
                  type,
                  targetId,
                  season: s,
                  episode: e,
                  hlsUrl: fresh.hlsUrl,
                  backupHlsUrls: fresh.backupHlsUrls,
                  embeds: fresh.embeds,
                  ttlHours: 12,
                }).catch(() => {});
              }
            }
          } catch {}
        }

        const srvTag = prov.ord ? `S${prov.ord}` : (prov.simulated_name || prov.id.toUpperCase());

        const cleanSubtitles = Array.isArray(subtitles)
          ? subtitles.filter((st: any) => st && typeof st === "object" && typeof st.url === "string")
          : [];

        const provStreamMode: "hls" | "embed" | "both" =
          providerStreamModes[prov.id] ||
          (prov.id === "playerflix" ? "both" : (directHlsUrl || hlsConfigMap[prov.id]?.enabled ? "hls" : "embed"));

        const allowHls = provStreamMode === "hls" || provStreamMode === "both";
        const allowEmbed = provStreamMode === "embed" || provStreamMode === "both";

        // 3. Emisión de fuente HLS nativa de máxima prioridad si está permitida para este proveedor
        if (allowHls && directHlsUrl) {
          provSources.push({
            id: `${prov.id}-hls`,
            providerId: prov.id,
            providerName: `HLS - ${srvTag}`,
            realName: `${prov.real_name || prov.name} (HLS)`,
            ord: prov.ord,
            type: "hls",
            url: directHlsUrl,
            backupUrls,
            lang: (prov.lang as any) || "multi",
            languages: prov.languages || [(prov.lang as any) || "multi"],
            subtitles: cleanSubtitles,
            priority: 120, // Máxima prioridad para reproducción directa en TV
            isBeta: !!prov.is_beta,
            needsTmdb: prov.needs_tmdb,
            tvOk: prov.tv_ok,
          });
        }

        // 4. Emisión de tarjeta iframe si está permitida (o si HLS falló completamente para evitar dejar sin video)
        const shouldEmitEmbed = allowEmbed || (!directHlsUrl && provStreamMode === "hls");

        if (shouldEmitEmbed) {
          if (fetchedEmbeds && fetchedEmbeds.length > 0) {
            const primaryEmbedUrl = fetchedEmbeds[0].url;
            provSources.push({
              id: `${prov.id}-iframe`,
              providerId: prov.id,
              providerName: prov.simulated_name || srvTag,
              realName: prov.real_name || prov.name,
              ord: prov.ord,
              type: "iframe",
              url: primaryEmbedUrl,
              embedOptions: fetchedEmbeds.map((emb: any) => ({
                name: emb.name || emb.host || emb.server || prov.name,
                server: emb.server || "online",
                host: emb.host || emb.server || prov.name,
                language: emb.language || emb.lang || (prov.lang === "pt" ? "Português" : "Latino"),
                url: emb.url,
                embed: emb.embed || emb.url,
                label: emb.label || emb.host || emb.name,
                lang: emb.lang || emb.language,
                budget: emb.budget,
                icon: emb.icon,
              })),
              options: fetchedEmbeds.map((emb: any) => ({
                embed: emb.embed || emb.url,
                lang: emb.lang || (prov.lang === "pt" ? "pt-br" : "es-419"),
                label: emb.label || emb.host || emb.name,
                budget: emb.budget || "success",
                icon: emb.icon,
              })),
              lang: (prov.lang as any) || "multi",
              languages: prov.languages || [(prov.lang as any) || "multi"],
              subtitles: cleanSubtitles,
              priority: 95,
              isBeta: !!prov.is_beta,
              needsTmdb: prov.needs_tmdb,
              tvOk: prov.tv_ok,
            });
          } else if (!directHlsUrl || provStreamMode === "embed") {
            // Fallback a iframe básico si no se obtuvo HLS o si el modo es explícitamente embed
            const adapted = providersToSources([prov], {
              type,
              id: targetId,
              season: s,
              episode: e,
              userLang,
              envKey: prov.entry_key,
            });
            if (adapted.length > 0) {
              provSources.push(...adapted);
            }
          }
        }

        return provSources;
      })
    );

    const rawSources: Source[] = sourceBatches.flat();
    const finalSourcesToRank = rawSources;

    // Ordenar TODAS las fuentes según afinidad lingüística real y prioridad de servidor por idioma.
    // Spec 085: Cada servidor HLS nativo se entrega como fuente independiente (HLS - S14, HLS - S18, etc.)
    // con sus propios backups, permitiendo selección directa y fallback limpio entre servidores.
    const sources: Source[] = sortSourcesByPriority(finalSourcesToRank, userLang, primaryByLang);

    const recommendedSourceId = sources[0]?.id || "";

    const responsePayload: ResolveResponse = {
      success: sources.length > 0,
      type,
      id: rawId,
      effectiveTmdbId,
      effectiveImdbId,
      season: type === "tv" ? s : undefined,
      episode: type === "tv" ? e : undefined,
      sources,
      recommendedSourceId,
      version,
    };

    return NextResponse.json(responsePayload, {
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("[Resolver Error]:", err);
    return NextResponse.json(
      { error: "server_error", message: String(err?.message || err) },
      { status: 500 }
    );
  }
}
