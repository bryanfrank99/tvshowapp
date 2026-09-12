// Catálogo dual paginado: TMDB si hay KEY, si no (o si falla) → free sin key.
// `page` empieza en 1. Todas devuelven { items, hasMore }.
import { tmdb, hasKey, getLang } from "./tmdb";
import { withImdbIds, type Media } from "./imdb";
import { getPerson, savePerson } from "./db";
import * as free from "./free";

export type Spot = { show: any; seasonNum: number; ep: any | null };
export type Page<T> = { items: T[]; hasMore: boolean };

async function tmdbOr<T>(fn: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  if (hasKey()) {
    try {
      return await fn();
    } catch {
      // cae al modo free (key inválida, cuota, red…)
    }
  }
  return fallback();
}

type Paged<T = any> = T & { total_pages?: number };

export async function getFeaturedToday(page = 1, per = 5): Promise<Page<Media>> {
  return tmdbOr(async () => {
    const d = await tmdb<Paged<{ results: Media[] }>>(`/trending/all/day?page=${page}`, 1800);
    const items = d.results.filter((x) => x.backdrop_path).slice(0, per);
    return { items, hasMore: page < (d.total_pages || 1) };
  }, async () => {
    const skip = (page - 1) * per;
    const [m, s] = await Promise.all([
      free.cineCatalog("movie", "top", Math.ceil(per / 2) + 2, page > 1 ? skip : 0),
      free.cineCatalog("series", "top", Math.ceil(per / 2) + 2, page > 1 ? skip : 0),
    ]);
    const items = [...m, ...s].slice(0, per);
    return { items, hasMore: items.length >= per };
  });
}

export async function getEpisodeSpotlight(page = 1, per = 6): Promise<Page<Spot>> {
  return tmdbOr(async () => {
    const d = await tmdb<Paged<{ results: any[] }>>(`/tv/on_the_air?page=${page}`, 3600);
    const items = await Promise.all(
      d.results.slice(0, per).map(async (s) => {
        try {
          const det = await tmdb<any>(`/tv/${s.id}`, 3600);
          const seasonNum = det.seasons?.find((x: any) => x.season_number > 0)?.season_number ?? 1;
          const season = await tmdb<any>(`/tv/${s.id}/season/${seasonNum}`, 3600);
          return { show: s, seasonNum, ep: season.episodes?.[0] ?? null };
        } catch {
          return { show: s, seasonNum: 1, ep: null };
        }
      })
    );
    return { items, hasMore: page < (d.total_pages || 1) };
  }, async () => {
    const skip = (page - 1) * per;
    const series = await free.cineCatalog("series", "top", per + 2, skip);
    const items = await Promise.all(
      series.slice(0, per).map(async (s) => {
        try {
          const meta = await free.cineMeta("series", String(s.id));
          const v = (meta.videos || []).find((v: any) => v.season && v.episode);
          return {
            show: { id: s.id, name: s.name || s.title, poster_path: s.poster_path, overview: meta.description || "" },
            seasonNum: v?.season ?? 1,
            ep: v ? { episode_number: v.episode, name: v.name || v.title, overview: v.overview || v.description, still_path: v.thumbnail ?? null } : null,
          };
        } catch {
          return { show: s, seasonNum: 1, ep: null };
        }
      })
    );
    return { items, hasMore: series.length >= per };
  });
}

export async function getTopPicks(page = 1, per = 12): Promise<Page<Media>> {
  const half = Math.ceil(per / 2);
  return tmdbOr(async () => {
    const [m, t] = await Promise.all([
      tmdb<Paged<{ results: Media[] }>>(`/movie/top_rated?page=${page}`, 3600),
      tmdb<Paged<{ results: Media[] }>>(`/tv/top_rated?page=${page}`, 3600),
    ]);
    const items = [
      ...m.results.slice(0, half).map((x) => ({ ...x, media_type: "movie" })),
      ...t.results.slice(0, half).map((x) => ({ ...x, media_type: "tv" })),
    ]
      .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
      .slice(0, per);
    return { items, hasMore: page < Math.min(m.total_pages || 1, t.total_pages || 1) };
  }, async () => {
    const skip = (page - 1) * half;
    const [m, s] = await Promise.all([
      free.cineCatalog("movie", "top", half + 1, skip),
      free.cineCatalog("series", "top", half + 1, skip),
    ]);
    const items = [...m, ...s].sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0)).slice(0, per);
    return { items, hasMore: m.length + s.length >= per };
  });
}

export async function getUpcoming(page = 1, per = 12): Promise<Page<Media>> {
  return tmdbOr(async () => {
    const d = await tmdb<Paged<{ results: Media[] }>>(`/movie/upcoming?page=${page}`, 3600);
    return { items: d.results.slice(0, per).map((x) => ({ ...x, media_type: "movie" })), hasMore: page < (d.total_pages || 1) };
  }, async () => {
    const items = await free.cineCatalog("movie", "top", per + 1, (page - 1) * per);
    return { items: items.slice(0, per), hasMore: items.length > per };
  });
}

export async function getMovies(page = 1, per = 24): Promise<Page<Media>> {
  return tmdbOr(async () => {
    const d = await tmdb<Paged<{ results: Media[] }>>(`/discover/movie?sort_by=popularity.desc&page=${page}`, 3600);
    return { items: d.results.slice(0, per).map((x) => ({ ...x, media_type: "movie" })), hasMore: page < (d.total_pages || 1) };
  }, async () => {
    const items = await free.cineCatalog("movie", "top", per + 1, (page - 1) * per);
    return { items: items.slice(0, per), hasMore: items.length > per };
  });
}

export async function getSeries(page = 1, per = 24): Promise<Page<Media>> {
  return tmdbOr(async () => {
    const d = await tmdb<Paged<{ results: Media[] }>>(`/discover/tv?sort_by=popularity.desc&page=${page}`, 3600);
    return { items: d.results.slice(0, per).map((x) => ({ ...x, media_type: "tv" })), hasMore: page < (d.total_pages || 1) };
  }, async () => {
    const items = await free.cineCatalog("series", "top", per + 1, (page - 1) * per);
    return { items: items.slice(0, per), hasMore: items.length > per };
  });
}

export async function getKidsMovies(page = 1, per = 12): Promise<Page<Media>> {
  return tmdbOr(async () => {
    const d = await tmdb<Paged<{ results: Media[] }>>(
      `/discover/movie?sort_by=popularity.desc&page=${page}&with_genres=10751|16&without_genres=27,53,80&certification_country=US&certification.lte=PG`,
      3600
    );
    return {
      items: d.results.slice(0, per).map((x) => ({ ...x, media_type: "movie" })),
      hasMore: page < (d.total_pages || 1),
    };
  }, async () => {
    const items = await free.cineCatalogByGenre("movie", "Animation", per + 1);
    return { items: items.slice(0, per), hasMore: items.length > per };
  });
}

export async function getKidsSeries(page = 1, per = 12): Promise<Page<Media>> {
  return tmdbOr(async () => {
    const d = await tmdb<Paged<{ results: Media[] }>>(
      `/discover/tv?sort_by=popularity.desc&page=${page}&with_genres=10762|10751&without_genres=27,53,80,18,10763,10764,10767&vote_count.gte=5`,
      3600
    );
    return {
      items: d.results.slice(0, per).map((x) => ({ ...x, media_type: "tv" })),
      hasMore: page < (d.total_pages || 1),
    };
  }, async () => {
    const items = await free.cineCatalogByGenre("series", "Animation", per + 1);
    return { items: items.slice(0, per), hasMore: items.length > per };
  });
}

export async function getKids(page = 1, per = 24): Promise<Page<Media>> {
  const half = Math.ceil(per / 2);
  return tmdbOr(async () => {
    const [m, t] = await Promise.all([
      tmdb<Paged<{ results: Media[] }>>(
        `/discover/movie?sort_by=popularity.desc&page=${page}&with_genres=10751|16&without_genres=27,53,80&certification_country=US&certification.lte=PG`,
        3600
      ),
      tmdb<Paged<{ results: Media[] }>>(
        `/discover/tv?sort_by=popularity.desc&page=${page}&with_genres=10762|10751&without_genres=27,53,80,18,10763,10764,10767&vote_count.gte=5`,
        3600
      ),
    ]);
    const movies = (m.results || []).slice(0, half).map((x) => ({ ...x, media_type: "movie" }));
    const series = (t.results || []).slice(0, half).map((x) => ({ ...x, media_type: "tv" }));

    const combined: Media[] = [];
    const maxLen = Math.max(movies.length, series.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < movies.length) combined.push(movies[i]);
      if (i < series.length) combined.push(series[i]);
    }

    return {
      items: combined.slice(0, per),
      hasMore: page < Math.min(m.total_pages || 1, t.total_pages || 1),
    };
  }, async () => {
    const [m, s] = await Promise.all([
      free.cineCatalogByGenre("movie", "Animation", half + 1),
      free.cineCatalogByGenre("series", "Animation", half + 1),
    ]);
    const combined: Media[] = [];
    const maxLen = Math.max(m.length, s.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < m.length) combined.push(m[i]);
      if (i < s.length) combined.push(s[i]);
    }
    return { items: combined.slice(0, per), hasMore: m.length + s.length >= per };
  });
}

export async function getTrending(page = 1, per = 20): Promise<Page<Media>> {
  return tmdbOr(async () => {
    const d = await tmdb<Paged<{ results: Media[] }>>(`/trending/all/week?page=${page}`, 600);
    const items = d.results.filter((x) => x.media_type === "movie" || x.media_type === "tv").slice(0, per);
    return { items, hasMore: page < (d.total_pages || 1) };
  }, async () => {
    const skip = (page - 1) * Math.ceil(per / 2);
    const [m, s] = await Promise.all([
      free.cineCatalog("movie", "top", Math.ceil(per / 2) + 1, skip),
      free.cineCatalog("series", "top", Math.ceil(per / 2) + 1, skip),
    ]);
    const items = [...m, ...s].slice(0, per);
    return { items, hasMore: m.length + s.length > per };
  });
}

export async function getTop10ImdbWeek(): Promise<Media[]> {
  return tmdbOr(async () => {
    const d = await tmdb<{ results: Media[] }>("/trending/all/week", 3600);
    const ranked = [...d.results]
      .filter((x) => x.title || x.name)
      .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
      .slice(0, 10)
      .map((x, i) => ({
        ...x,
        media_type: x.media_type || ((x as any).first_air_date ? "tv" : "movie"),
        rank: i + 1,
      }));
    return withImdbIds(ranked, 10);
  }, async () => {
    // En modo free el rating IMDb es NATIVO (Cinemeta trae imdbRating real).
    const [m, s] = await Promise.all([free.cineCatalog("movie", "top", 8), free.cineCatalog("series", "top", 8)]);
    return [...m, ...s]
      .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
      .slice(0, 10)
      .map((x, i) => ({ ...x, rank: i + 1 }));
  });
}

export async function searchAll(q: string, page = 1, per = 20): Promise<Page<Media>> {
  if (hasKey()) {
    try {
      const r = await tmdb<Paged<any>>(`/search/multi?query=${encodeURIComponent(q)}&page=${page}`, 300);
      const items = (r.results || []).filter((x: any) => x.media_type === "movie" || x.media_type === "tv").slice(0, per);
      return { items, hasMore: page < (r.total_pages || 1) };
    } catch { /* fallback free */ }
  }
  // Free sin paginado real: página 1 con todo lo encontrado.
  const [cine, tv] = await Promise.all([free.cineSearch(q).catch(() => []), free.tvSearch(q).catch(() => [])]);
  const seen = new Set<string>();
  const all = [...cine, ...tv].filter((x) => {
    const k = String(x.id);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { items: page === 1 ? all : [], hasMore: false };
}

// Títulos por género. TMDB: discover; free: filtra los tops (traen géneros).
export async function getByGenre(id: string, name: string, page = 1, per = 24): Promise<Page<Media>> {
  return tmdbOr<Page<Media>>(async () => {
    const [m, tv] = await Promise.all([
      tmdb<Paged<{ results: Media[] }>>(`/discover/movie?with_genres=${id}&sort_by=popularity.desc&page=${page}`, 3600),
      tmdb<Paged<{ results: Media[] }>>(`/discover/tv?with_genres=${id}&sort_by=popularity.desc&page=${page}`, 3600),
    ]);
    const items = [
      ...m.results.slice(0, Math.ceil(per / 2)).map((x) => ({ ...x, media_type: "movie" })),
      ...tv.results.slice(0, Math.ceil(per / 2)).map((x) => ({ ...x, media_type: "tv" })),
    ];
    return { items, hasMore: page < Math.min(m.total_pages || 1, tv.total_pages || 1) };
  }, async () => {
    if (page > 1) return { items: [], hasMore: false };
    const [mm, ss] = await Promise.all([free.cineCatalog("movie", "top", 60), free.cineCatalog("series", "top", 60)]);
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const want = norm(name);
    const items = [...mm, ...ss]
      .filter((x) => (x.genres || []).some((g) => { const ng = norm(String(g)); return ng === want || ng.includes(want) || want.includes(ng); }))
      .slice(0, per);
    return { items, hasMore: false };
  });
}

// Obras de una persona por nombre. TMDB: search+combined_credits; free: TVMaze.
export async function getPersonWorks(name: string): Promise<{ person: any; works: Media[] }> {
  if (hasKey()) {
    try {
      const lang = getLang();
      const s = await tmdb<any>(`/search/person?query=${encodeURIComponent(name)}`, 3600);
      const p = (s.results || [])[0];
      if (!p) throw new Error("not found");
      const hit = await getPerson(p.id, lang);
      if (hit) {
        return {
          person: { name: hit.name, photo: hit.photo, known: hit.known_for || "" },
          works: (hit.works || []).map((x: any) => ({
            id: x.id, media_type: x.media_type, title: x.title, name: x.name,
            poster_path: x.poster_path ?? null, vote_average: x.vote_average ?? 0,
          })),
        };
      }
      const det = await tmdb<any>(`/person/${p.id}?append_to_response=combined_credits`, 3600);
      const cast = ((det.combined_credits?.cast || []) as any[])
        .filter((x) => x.media_type === "movie" || x.media_type === "tv")
        .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
        .slice(0, 24)
        .map((x) => ({ id: x.id, media_type: x.media_type, title: x.title, name: x.name, poster_path: x.poster_path ?? null, vote_average: x.vote_average ?? 0 }));
      await savePerson(p.id, lang, det, cast);
      return { person: { name: det.name, photo: det.profile_path || null, known: det.known_for_department || "" }, works: cast };
    } catch { /* fallback free */ }
  }
  const r = await fetch(`https://api.tvmaze.com/search/people?q=${encodeURIComponent(name)}`, { next: { revalidate: 3600 } });
  const arr = await r.json();
  const person = arr?.[0]?.person;
  if (!person) return { person: { name }, works: [] };
  const cr = await fetch(`https://api.tvmaze.com/people/${person.id}/castcredits?embed=show`, { next: { revalidate: 3600 } });
  const credits = await cr.json();
  const seen = new Set<number>();
  const works: Media[] = [];
  for (const c of credits) {
    const sh = c._embedded?.show;
    if (!sh || seen.has(sh.id)) continue;
    seen.add(sh.id);
    works.push({
      id: sh.externals?.imdb || `tvmaze:${sh.id}`, media_type: "tv", name: sh.name,
      poster_path: sh.image?.medium ?? null, vote_average: sh.rating?.average ?? 0,
      imdb_id: sh.externals?.imdb || null,
    });
    if (works.length >= 24) break;
  }
  return { person: { name: person.name, photo: person.image?.medium || null, known: "" }, works };
}

const MOVIE_TO_TV_GENRES: Record<number, number> = {
  28: 10759,  // Action -> Action & Adventure
  12: 10759,  // Adventure -> Action & Adventure
  16: 16,     // Animation
  35: 35,     // Comedy
  80: 80,     // Crime
  99: 99,     // Documentary
  18: 18,     // Drama
  10751: 10751, // Family
  14: 10765,  // Fantasy -> Sci-Fi & Fantasy
  36: 10768,  // History -> War & Politics
  27: 9648,   // Horror -> Mystery
  10402: 35,  // Music -> Comedy
  9648: 9648, // Mystery
  10749: 18,  // Romance -> Drama
  878: 10765, // Sci-Fi -> Sci-Fi & Fantasy
  53: 80,     // Thriller -> Crime
  10752: 10768, // War -> War & Politics
  37: 37,     // Western
};

const TV_TO_MOVIE_GENRES: Record<number, number[]> = {
  10759: [28, 12],   // Action & Adventure -> Action, Adventure
  16: [16],          // Animation
  35: [35],          // Comedy
  80: [80],          // Crime
  99: [99],          // Documentary
  18: [18],          // Drama
  10751: [10751],    // Family
  10762: [10751, 16],// Kids -> Family, Animation
  9648: [9648],      // Mystery
  10765: [878, 14],  // Sci-Fi & Fantasy -> Sci-Fi, Fantasy
  10768: [10752, 36],// War & Politics -> War, History
  37: [37],          // Western
};

export async function getSimilarTitles(
  type: "movie" | "tv",
  id: string | number,
  genres?: { id?: any; name?: string }[] | string[]
): Promise<Media[]> {
  const isMov = type === "movie";
  const otherType: "movie" | "tv" = isMov ? "tv" : "movie";
  const numId = String(id);
  const isFree = free.isImdbId(id) || !hasKey();

  if (!isFree) {
    try {
      // 1. Recomendaciones y similares del mismo tipo (película -> películas, serie -> series)
      const [recsRes, simRes, kwsRes] = await Promise.all([
        tmdb<any>(`/${type}/${id}/recommendations`, 3600).catch(() => ({ results: [] })),
        tmdb<any>(`/${type}/${id}/similar`, 3600).catch(() => ({ results: [] })),
        tmdb<any>(`/${type}/${id}/keywords`, 3600).catch(() => ({})),
      ]);

      const sameRaw = [...(recsRes.results || []), ...(simRes.results || [])];
      const sameSeen = new Set<string>();
      const same: Media[] = sameRaw
        .filter((x: any) => {
          if (!x || !x.poster_path || String(x.id) === numId || sameSeen.has(String(x.id))) return false;
          if (!x.title && !x.name) return false;
          sameSeen.add(String(x.id));
          return true;
        })
        .map((x: any) => ({
          ...x,
          media_type: type,
        }));

      // 2. Recomendaciones cruzadas (película -> series, serie -> películas)
      const kwsList = (isMov ? kwsRes.keywords : kwsRes.results) || [];
      const topKws = kwsList.slice(0, 3).map((k: any) => k.id).filter(Boolean).join("|");

      // Mapear géneros entre formatos
      const rawGenreIds: number[] = (genres || [])
        .map((g: any) => (typeof g === "object" && g != null ? Number(g.id) : null))
        .filter((n): n is number => n != null && Number.isFinite(n));

      let crossGenreIds: number[] = [];
      if (isMov) {
        crossGenreIds = Array.from(new Set(rawGenreIds.map((gid) => MOVIE_TO_TV_GENRES[gid]).filter(Boolean)));
      } else {
        crossGenreIds = Array.from(new Set(rawGenreIds.flatMap((gid) => TV_TO_MOVIE_GENRES[gid] || []).filter(Boolean)));
      }

      let crossRaw: any[] = [];
      // Buscar primero por temáticas exactas (keywords)
      if (topKws) {
        const kwRes = await tmdb<any>(`/discover/${otherType}?with_keywords=${encodeURIComponent(topKws)}&sort_by=popularity.desc`, 3600).catch(() => ({ results: [] }));
        crossRaw.push(...(kwRes.results || []));
      }

      // Complementar con géneros equivalentes
      if (crossRaw.length < 10 && crossGenreIds.length > 0) {
        const genreStr = crossGenreIds.slice(0, 3).join(",");
        const genreRes = await tmdb<any>(`/discover/${otherType}?with_genres=${genreStr}&sort_by=popularity.desc`, 3600).catch(() => ({ results: [] }));
        crossRaw.push(...(genreRes.results || []));
      }

      // Fallback a los más votados del otro tipo
      if (crossRaw.length < 6) {
        const fallbackRes = await tmdb<any>(`/discover/${otherType}?sort_by=vote_count.desc`, 3600).catch(() => ({ results: [] }));
        crossRaw.push(...(fallbackRes.results || []));
      }

      const crossSeen = new Set<string>();
      const cross: Media[] = crossRaw
        .filter((x: any) => {
          if (!x || !x.poster_path || String(x.id) === numId || crossSeen.has(String(x.id))) return false;
          if (!x.title && !x.name) return false;
          crossSeen.add(String(x.id));
          return true;
        })
        .map((x: any) => ({
          ...x,
          media_type: otherType,
        }));

      // 3. Intercalar de forma balanceada (películas y series similares)
      const combined: Media[] = [];
      const totalMax = Math.max(same.length, cross.length);
      for (let i = 0; i < totalMax && combined.length < 20; i++) {
        if (same[i]) combined.push(same[i]);
        if (cross[i]) combined.push(cross[i]);
      }

      if (combined.length > 0) return combined;
    } catch {
      // Fallback si falla TMDB
    }
  }

  // Fallback modo Free (Cinemeta)
  try {
    const genreName = (genres || []).map((g: any) => (typeof g === "string" ? g : g?.name)).filter(Boolean)[0] || "Action";
    const [mList, sList] = await Promise.all([
      free.cineCatalogByGenre("movie", genreName, 10).catch(() => []),
      free.cineCatalogByGenre("series", genreName, 10).catch(() => []),
    ]);

    const mFiltered = mList.filter((x) => String(x.id) !== numId && !!x.poster_path);
    const sFiltered = sList.filter((x) => String(x.id) !== numId && !!x.poster_path);

    const combined: Media[] = [];
    const max = Math.max(mFiltered.length, sFiltered.length);
    for (let i = 0; i < max && combined.length < 20; i++) {
      if (isMov) {
        if (mFiltered[i]) combined.push(mFiltered[i]);
        if (sFiltered[i]) combined.push(sFiltered[i]);
      } else {
        if (sFiltered[i]) combined.push(sFiltered[i]);
        if (mFiltered[i]) combined.push(mFiltered[i]);
      }
    }
    return combined;
  } catch {
    return [];
  }
}
