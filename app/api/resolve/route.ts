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

    // 2. Consulta de proveedores, versión, prioridades lingüísticas y configuración HLS
    const [provRes, verRes, primaryRes, availRes, prioritiesRes, hlsConfigRes] = await Promise.all([
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
    ]);

    if (provRes.error || !provRes.data) {
      return NextResponse.json({ error: "db", message: "Error cargando proveedores" }, { status: 500 });
    }

    let hlsConfigMap: Record<string, { enabled: boolean; extractor: string }> = {
      megaembed: { enabled: true, extractor: "megaembed" },
      watchplay: { enabled: true, extractor: "watchplay" },
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
        } as ProviderAdapterInput;
      })
    );

    const eligibleProviders = eligibleProviderResults.filter(Boolean) as ProviderAdapterInput[];

    // 5. Transformación concurrente y ordenamiento estricto por prioridad lingüística
    const sourceBatches = await Promise.all(
      eligibleProviders.map(async (prov): Promise<Source[]> => {
        const provSources: Source[] = [];
        const targetId = prov.needs_tmdb ? (effectiveTmdbId as string) : (effectiveImdbId || rawId);

        // Si es Cinecalidad (S19), consultamos la caché de BD de streams M3U8 o extraemos el stream HLS directo con audio Latino
        if (prov.id === "cinecalidad" || String(prov.movie_tpl || "").includes("cinecalidad")) {
          let cachedHls: { hlsUrl: string; backupHlsUrls?: string[] } | null = null;
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
          let subtitles: any[] = [];

          if (!directHlsUrl) {
            try {
              const { fetchCinecalidadStream } = await import("@/lib/cinecalidad");
              const extractPromise = fetchCinecalidadStream({
                type,
                tmdbId: targetId,
                season: s,
                episode: e,
              });
              const timeoutPromise = new Promise<any>((resolve) => setTimeout(() => resolve(null), 5500));
              const fresh = await Promise.race([extractPromise, timeoutPromise]);
              if (fresh?.success && fresh.hlsUrl) {
                directHlsUrl = fresh.hlsUrl;
                subtitles = (fresh.subtitles || []).map((st: any, idx: number) => ({
                  id: `sub-cc-${idx}`,
                  lang: "es",
                  label: st.label || "Español",
                  url: st.file,
                  isDefault: st.default,
                }));

                const { setCachedStream } = await import("@/lib/stream-cache");
                setCachedStream({
                  providerId: prov.id,
                  type,
                  targetId,
                  season: s,
                  episode: e,
                  hlsUrl: fresh.hlsUrl,
                  backupHlsUrls: fresh.backupHlsUrls,
                  ttlHours: 12,
                }).catch(() => {});
              }
            } catch {}
          }

          if (directHlsUrl) {
            provSources.push({
              id: prov.id,
              providerId: prov.id,
              providerName: prov.simulated_name || prov.name,
              realName: prov.real_name || prov.name,
              ord: prov.ord,
              type: "hls",
              url: directHlsUrl,
              backupUrls: cachedHls?.backupHlsUrls || [],
              lang: "es",
              languages: ["es", "lat"],
              subtitles: subtitles.length > 0 ? subtitles : (prov.subtitles || []),
              priority: 120, // Máxima prioridad para reproducción directa HLS
              isBeta: false,
              needsTmdb: prov.needs_tmdb,
              tvOk: prov.tv_ok,
            });
            return provSources; // Ya agregamos el servidor S19 como stream nativo HLS
          }

          // Fallback a embeds iframe clásicos si no se pudo extraer stream directo
          try {
            const { fetchCinecalidadEmbeds } = await import("@/lib/cinecalidad");
            const embeds = await fetchCinecalidadEmbeds({
              type,
              tmdbId: targetId,
              season: s,
              episode: e,
            });
            if (embeds && embeds.length > 0) {
              embeds.forEach((emb, idx) => {
                const hostName = emb.host ? ` (${emb.host.split(".")[0]})` : "";
                provSources.push({
                  id: idx === 0 ? `${prov.id}-iframe` : `${prov.id}-iframe-${idx + 1}`,
                  providerId: prov.id,
                  providerName: prov.simulated_name || prov.name,
                  realName: `${prov.real_name || prov.name}${hostName}`,
                  ord: prov.ord,
                  type: "iframe",
                  url: emb.url,
                  lang: "es",
                  languages: ["es", "lat"],
                  subtitles: [],
                  priority: 90,
                  isBeta: false,
                  needsTmdb: true,
                  tvOk: true,
                });
              });
              return provSources;
            }
          } catch {}
        }

        // Si es MegaEmbed (S14), consultamos la caché de BD o extraemos en vivo el stream HLS
        if (prov.id === "megaembed" || String(prov.movie_tpl || "").includes("megaembed")) {
          let directHlsUrl: string | undefined;
          let backupUrls: string[] = [];

          try {
            const { getCachedStream } = await import("@/lib/stream-cache");
            const cachedHls = await getCachedStream({
              providerId: prov.id,
              type,
              targetId,
              season: s,
              episode: e,
            });
            if (cachedHls?.hlsUrl) {
              directHlsUrl = cachedHls.hlsUrl;
              backupUrls = cachedHls.backupHlsUrls || [];
            }
          } catch {}

          if (!directHlsUrl) {
            try {
              const { fetchMegaEmbedStream } = await import("@/lib/megaembed");
              const extractPromise = fetchMegaEmbedStream({
                id: targetId,
                type,
                season: s,
                episode: e,
              });
              const timeoutPromise = new Promise<any>((resolve) => setTimeout(() => resolve(null), 5500));
              const fresh = await Promise.race([extractPromise, timeoutPromise]);
              if (fresh?.success && fresh.hlsUrl) {
                directHlsUrl = fresh.hlsUrl;
                backupUrls = fresh.backupHlsUrls || [];

                const { setCachedStream } = await import("@/lib/stream-cache");
                setCachedStream({
                  providerId: prov.id,
                  type,
                  targetId,
                  season: s,
                  episode: e,
                  hlsUrl: fresh.hlsUrl,
                  backupHlsUrls: fresh.backupHlsUrls,
                  ttlHours: 12,
                }).catch(() => {});
              }
            } catch {}
          }

          if (directHlsUrl) {
            provSources.push({
              id: prov.id,
              providerId: prov.id,
              providerName: prov.simulated_name || prov.name,
              realName: prov.real_name || prov.name,
              ord: prov.ord,
              type: "hls",
              url: directHlsUrl,
              backupUrls,
              lang: (prov.lang as any) || "pt",
              languages: prov.languages || ["pt"],
              subtitles: prov.subtitles || [],
              priority: 120, // Mayor prioridad para selección automática en TV
              isBeta: false,
              needsTmdb: prov.needs_tmdb,
              tvOk: prov.tv_ok,
            });
            return provSources; // Ya agregamos el servidor S14 con su stream directo HLS
          }
        }

        // Si es WatchPlay (S18), consultamos la caché de BD de streams M3U8 o extraemos rápidamente
        if (prov.id === "watchplay" || String(prov.movie_tpl || "").includes("watchplay.shop")) {
          let cachedHls: { hlsUrl: string; backupHlsUrls?: string[] } | null = null;
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

          if (!cachedHls?.hlsUrl) {
            try {
              const { fetchWatchPlayStream } = await import("@/lib/watchplay");
              const extractPromise = fetchWatchPlayStream({
                id: targetId,
                type,
                season: s,
                episode: e,
              });
              const timeoutPromise = new Promise<any>((resolve) => setTimeout(() => resolve(null), 5500));
              const fresh = await Promise.race([extractPromise, timeoutPromise]);
              if (fresh?.success && fresh.hlsUrl) {
                cachedHls = { hlsUrl: fresh.hlsUrl, backupHlsUrls: fresh.backupHlsUrls };
                const { setCachedStream } = await import("@/lib/stream-cache");
                setCachedStream({
                  providerId: prov.id,
                  type,
                  targetId,
                  season: s,
                  episode: e,
                  hlsUrl: fresh.hlsUrl,
                  backupHlsUrls: fresh.backupHlsUrls,
                }).catch(() => {});
              }
            } catch {}
          }

          if (cachedHls?.hlsUrl) {
            provSources.push({
              id: prov.id,
              providerId: prov.id,
              providerName: prov.simulated_name || prov.name,
              realName: prov.real_name || prov.name,
              ord: prov.ord,
              type: "hls",
              url: cachedHls.hlsUrl,
              backupUrls: cachedHls.backupHlsUrls,
              lang: (prov.lang as any) || "pt",
              languages: prov.languages || ["pt"],
              subtitles: prov.subtitles || [],
              priority: 120, // Mayor prioridad para selección automática en TV
              isBeta: false,
              needsTmdb: prov.needs_tmdb,
              tvOk: prov.tv_ok,
            });
            return provSources;
          }
        }

        // Si es NasriPlay (S17), consultamos la caché de BD de streams M3U8 o extraemos el stream HLS directo con audio Latino
        if (prov.id === "nasriplay" || String(prov.movie_tpl || "").includes("nsrplay.space")) {
          let cachedHls: { hlsUrl: string; backupHlsUrls?: string[] } | null = null;
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

          if (!directHlsUrl || !fetchedEmbeds || fetchedEmbeds.length === 0) {
            try {
              const { fetchNasriPlayStream } = await import("@/lib/nasriplay");
              const extractPromise = fetchNasriPlayStream({
                id: targetId,
                type,
                season: s,
                episode: e,
              });
              const timeoutPromise = new Promise<any>((resolve) => setTimeout(() => resolve(null), 5500));
              const fresh = await Promise.race([extractPromise, timeoutPromise]);
              if (fresh) {
                if (fresh.embeds && fresh.embeds.length > 0) {
                  fetchedEmbeds = fresh.embeds;
                }
                if (fresh.success && fresh.hlsUrl) {
                  directHlsUrl = fresh.hlsUrl;
                  backupUrls = fresh.backupHlsUrls || [];

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

          if (directHlsUrl) {
            provSources.push({
              id: prov.id,
              providerId: prov.id,
              providerName: prov.simulated_name || prov.name,
              realName: prov.real_name || prov.name,
              ord: prov.ord,
              type: "hls",
              url: directHlsUrl,
              backupUrls,
              lang: "es",
              languages: ["es", "lat"],
              subtitles: prov.subtitles || [],
              priority: 120, // Máxima prioridad para reproducción directa HLS
              isBeta: false,
              needsTmdb: prov.needs_tmdb,
              tvOk: prov.tv_ok,
            });
          }

          // UNIFICACIÓN DE S17: Todos los sub-proveedores resueltos de NasriPlay unidos en una sola tarjeta Source con embedOptions
          const primaryEmbedUrl =
            (fetchedEmbeds && fetchedEmbeds.length > 0 && fetchedEmbeds[0].url) ||
            `https://nsrplay.space/embed/${type}/${targetId}${type === "tv" ? `/${s}/${e}` : ""}`;

          provSources.push({
            id: `${prov.id}-iframe`,
            providerId: prov.id,
            providerName: prov.simulated_name || prov.name,
            realName: prov.real_name || prov.name,
            ord: prov.ord,
            type: "iframe",
            url: primaryEmbedUrl,
            embedOptions: fetchedEmbeds && fetchedEmbeds.length > 0 ? fetchedEmbeds : undefined,
            lang: "es",
            languages: ["es", "lat"],
            subtitles: prov.subtitles || [],
            priority: 95,
            isBeta: false,
            needsTmdb: true,
            tvOk: true,
          });
          return provSources; // Ya agregamos el servidor S17 unificado (con direct HLS si existía + único iframe con embedOptions)
        }

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
        return provSources;
      })
    );

    const rawSources: Source[] = sourceBatches.flat();

    // Ordenar TODAS las fuentes según afinidad lingüística real y prioridad de servidor por idioma
    const sorted = sortSourcesByPriority(rawSources, userLang, primaryByLang);

    // 4. Unificación de servidores compatibles con HLS aislados estrictamente por idioma de audio
    // REGLA: Los servidores HLS en modo beta (isBeta: true) NUNCA se colocan dentro de la pool unificada.
    // Se mantienen como fuentes independientes para permitir testearlos individualmente.
    const hlsPoolSources = sorted.filter((s) => s.type === "hls" && !s.isBeta);
    const standaloneSources = sorted.filter((s) => s.type !== "hls" || s.isBeta);
    let sources: Source[] = sorted;

    if (hlsPoolSources.length > 0) {
      // Agrupar por familia de idioma
      const hlsByLang = new Map<string, Source[]>();
      for (const src of hlsPoolSources) {
        const audios = src.languages && src.languages.length ? src.languages : [src.lang];
        const fam = getLanguageFamily(audios[0] || src.lang);
        const existing = hlsByLang.get(fam) || [];
        existing.push(src);
        hlsByLang.set(fam, existing);
      }

      const consolidatedHls: Source[] = [];
      for (const [langFam, groupSources] of hlsByLang.entries()) {
        if (!groupSources.length) continue;
        const primaryHls = { ...groupSources[0] };

        const urlServerMap: Record<string, string> = {};
        const getServerTag = (s: Source) =>
          typeof s.ord === "number" && s.ord > 0
            ? `S${s.ord}`
            : s.providerName?.match(/^S\d+/i)
            ? s.providerName.toUpperCase()
            : `S${s.ord || 1}`;

        urlServerMap[primaryHls.url] = getServerTag(primaryHls);

        // Los backups SOLO se enlazan entre servidores HLS del mismo idioma de audio
        if (groupSources.length > 1) {
          const otherBackupUrls = groupSources
            .slice(1)
            .flatMap((s) => {
              const tag = getServerTag(s);
              const urls = [s.url, ...(s.backupUrls || [])].filter(Boolean);
              for (const u of urls) {
                if (!urlServerMap[u]) urlServerMap[u] = tag;
              }
              return urls;
            })
            .filter((u) => u && u !== primaryHls.url);

          primaryHls.backupUrls = Array.from(
            new Set([...(primaryHls.backupUrls || []), ...otherBackupUrls])
          ).filter((u) => u && u !== primaryHls.url);
        } else {
          primaryHls.backupUrls = Array.from(
            new Set(primaryHls.backupUrls || [])
          ).filter((u) => u && u !== primaryHls.url);
        }

        for (const u of primaryHls.backupUrls || []) {
          if (!urlServerMap[u]) urlServerMap[u] = getServerTag(primaryHls);
        }

        primaryHls.urlServerMap = urlServerMap;
        primaryHls.providerName = "HLS";
        primaryHls.realName = `HLS (${langFam.toUpperCase()})`;
        primaryHls.ord = 0;
        primaryHls.lang = langFam as any;
        primaryHls.languages = [langFam as any];
        const maxPriority = Math.max(...groupSources.map((s) => s.priority || 100), 120);
        primaryHls.priority = maxPriority;
        consolidatedHls.push(primaryHls);
      }

      // Reordenar conservando afinidad lingüística, pool HLS en pos 0 y servidores individuales/beta
      sources = sortSourcesByPriority([...consolidatedHls, ...standaloneSources], userLang, primaryByLang);
    }

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
