// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/supa";
import { checkSession, SESSION_COOKIE } from "@/lib/access";
import { providersToSources, type ProviderAdapterInput } from "@/lib/adapters/provider-adapter";
import { parseLangs, parseSubs } from "@/lib/providers";
import { sortSourcesByPriority, type ResolveResponse, type Source } from "@/lib/sources";

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

    // 2. Consulta de proveedores y versión de catálogo
    const [provRes, verRes] = await Promise.all([
      sb
        .from("providers")
        .select("id, name, ord, movie_tpl, tv_tpl, needs_tmdb, tv_ok, entry_key, lang, subtitles, is_beta")
        .eq("active", true)
        .order("ord"),
      sb.from("config").select("value").eq("key", "providers_version").maybeSingle(),
    ]);

    if (provRes.error || !provRes.data) {
      return NextResponse.json({ error: "db", message: "Error cargando proveedores" }, { status: 500 });
    }

    const providersData = provRes.data;
    const version = (verRes.data as any)?.value || "1.0";

    // 3. Resolución de IDs según los requerimientos de los proveedores activos
    const isImdb = rawId.startsWith("tt");
    let effectiveTmdbId: string | undefined = !isImdb ? rawId : undefined;
    let effectiveImdbId: string | undefined = isImdb ? rawId : undefined;

    const needsTmdbCount = providersData.filter((p: any) => !!p.needs_tmdb).length;

    if (isImdb && needsTmdbCount > 0) {
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

    // 4. Adaptación y construcción de fuentes disponibles
    const eligibleProviders: ProviderAdapterInput[] = [];
    let serverIndex = 1;

    for (const p of providersData) {
      const requiresTmdb = !!p.needs_tmdb;
      // Mantener todos los proveedores disponibles; si falta TMDB ID, usar el ID original como fallback
      const targetId = requiresTmdb
        ? (effectiveTmdbId || rawId)
        : (effectiveImdbId || rawId);

      const serverOrd = typeof p.ord === "number" ? p.ord : serverIndex++;
      const canonicalSimulatedName = `S${serverOrd}`;

      eligibleProviders.push({
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
      });
    }

    // 5. Transformación y ordenamiento estricto por prioridad lingüística
    const rawSources: Source[] = [];
    for (const prov of eligibleProviders) {
      const targetId = prov.needs_tmdb ? (effectiveTmdbId as string) : (effectiveImdbId || rawId);
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

    // Ordenar TODAS las fuentes según afinidad lingüística real
    const sorted = sortSourcesByPriority(rawSources, userLang);

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
