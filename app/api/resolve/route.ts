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

    // 2. Consulta de proveedores, versión y preferencias de prioridad lingüística
    const [provRes, verRes, primaryRes, availRes, prioritiesRes] = await Promise.all([
      sb
        .from("providers")
        .select("*")
        .eq("active", true)
        .order("ord"),
      sb.from("config").select("value").eq("key", "providers_version").maybeSingle(),
      sb.from("config").select("value").eq("key", "primary_providers_by_lang").maybeSingle(),
      sb.from("config").select("value").eq("key", "provider_availability_urls").maybeSingle(),
      sb.from("config").select("value").eq("key", "provider_priorities_by_lang").maybeSingle(),
    ]);

    if (provRes.error || !provRes.data) {
      return NextResponse.json({ error: "db", message: "Error cargando proveedores" }, { status: 500 });
    }

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

    // 5. Transformación y ordenamiento estricto por prioridad lingüística
    const rawSources: Source[] = [];
    for (const prov of eligibleProviders) {
      const targetId = prov.needs_tmdb ? (effectiveTmdbId as string) : (effectiveImdbId || rawId);

      // Si es Cinecalidad, resolvemos directamente los embeds de los reproductores con audio Latino
      if (prov.id === "cinecalidad" || String(prov.movie_tpl || "").includes("cinecalidad")) {
        try {
          const { fetchCinecalidadEmbeds } = await import("@/lib/cinecalidad");
          const embedsPromise = fetchCinecalidadEmbeds({
            type,
            tmdbId: targetId,
            season: s,
            episode: e,
          });
          const timeoutPromise = new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 1500));
          const embeds = await Promise.race([embedsPromise, timeoutPromise]);

          if (embeds && embeds.length > 0) {
            embeds.forEach((emb, idx) => {
              const hostName = emb.host ? ` (${emb.host.split(".")[0]})` : "";
              rawSources.push({
                id: idx === 0 ? `${prov.id}-iframe` : `${prov.id}-iframe-${idx + 1}`,
                providerId: prov.id,
                providerName: prov.simulated_name || prov.name,
                realName: `${prov.real_name || prov.name}${hostName}`,
                ord: prov.ord,
                type: "iframe",
                url: emb.url,
                lang: "es",
                languages: ["es"],
                subtitles: [],
                priority: 100,
                isBeta: false,
                needsTmdb: true,
                tvOk: true,
              });
            });
            continue;
          }
        } catch {}
      }

      // Si es MegaEmbed, consultamos la caché de BD de streams M3U8 para entrega instantánea (< 20ms)
      if (prov.id === "megaembed" || String(prov.movie_tpl || "").includes("megaembed")) {
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

        if (cachedHls?.hlsUrl) {
          // Asignar el stream HLS directamente al servidor S14 sin duplicar tarjeta
          rawSources.push({
            id: prov.id,
            providerId: prov.id,
            providerName: prov.simulated_name || prov.name,
            realName: prov.real_name || prov.name,
            ord: prov.ord,
            type: "hls",
            url: cachedHls.hlsUrl,
            backupUrls: cachedHls.backupHlsUrls,
            lang: (prov.lang as any) || "und",
            languages: prov.languages || ["und"],
            subtitles: prov.subtitles || [],
            priority: 120, // Mayor prioridad para selección automática en TV
            isBeta: false,
            needsTmdb: prov.needs_tmdb,
            tvOk: prov.tv_ok,
          });
          continue; // Ya agregamos el servidor S14 con su stream directo HLS
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
            const timeoutPromise = new Promise<any>((resolve) => setTimeout(() => resolve(null), 1500));
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
                ttlHours: 24,
              }).catch(() => {});
            }
          } catch {}
        }

        if (cachedHls?.hlsUrl) {
          rawSources.push({
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
          continue;
        }
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
        rawSources.push(...adapted);
      }
    }

    // Ordenar TODAS las fuentes según afinidad lingüística real y prioridad de servidor por idioma
    const sorted = sortSourcesByPriority(rawSources, userLang, primaryByLang);

    // Conservar identificadores canónicos (S{ord}) para coincidir 1:1 con administración
    const sources = sorted;

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
