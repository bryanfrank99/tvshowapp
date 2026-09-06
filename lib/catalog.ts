// Catálogo dual: TMDB si hay KEY, si no (o si falla) → fuentes free sin key.
// Las páginas no cambian: llaman lo mismo y funciona en ambos modos.
import { tmdb, hasKey, getLang } from "./tmdb";
import { withImdbIds, type Media } from "./imdb";
import { getPerson, savePerson } from "./db";
import * as free from "./free";

export type Spot = { show: any; seasonNum: number; ep: any | null };

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

export async function getFeaturedToday(n = 5): Promise<Media[]> {
  return tmdbOr(async () => {
    const d = await tmdb<{ results: Media[] }>("/trending/all/day", 1800);
    return d.results.filter((x) => x.backdrop_path).slice(0, n);
  }, async () => {
    const [m, s] = await Promise.all([free.cineCatalog("movie", "top", 3), free.cineCatalog("series", "top", 3)]);
    return [...m, ...s].slice(0, n);
  });
}

export async function getEpisodeSpotlight(n = 6): Promise<Spot[]> {
  return tmdbOr(async () => {
    const d = await tmdb<{ results: any[] }>("/tv/on_the_air", 3600);
    return Promise.all(
      d.results.slice(0, n).map(async (s) => {
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
  }, async () => {
    const series = await free.cineCatalog("series", "top", n);
    return Promise.all(
      series.map(async (s) => {
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
  });
}

export async function getTopPicks(n = 12): Promise<Media[]> {
  return tmdbOr(async () => {
    const [m, t] = await Promise.all([
      tmdb<{ results: Media[] }>("/movie/top_rated", 3600),
      tmdb<{ results: Media[] }>("/tv/top_rated", 3600),
    ]);
    return [
      ...m.results.slice(0, n).map((x) => ({ ...x, media_type: "movie" })),
      ...t.results.slice(0, n).map((x) => ({ ...x, media_type: "tv" })),
    ]
      .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
      .slice(0, n);
  }, async () => {
    const [m, s] = await Promise.all([free.cineCatalog("movie", "top", n), free.cineCatalog("series", "top", n)]);
    return [...m, ...s].sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0)).slice(0, n);
  });
}

export async function getUpcoming(n = 12): Promise<Media[]> {
  return tmdbOr(async () => {
    const upcoming = await tmdb<{ results: Media[] }>("/movie/upcoming", 3600);
    return upcoming.results.slice(0, n).map((x) => ({ ...x, media_type: "movie" }));
  }, () => free.cineCatalog("movie", "top", n));
}

export async function getMovies(n = 24): Promise<Media[]> {
  return tmdbOr(async () => {
    const d = await tmdb<{ results: Media[] }>("/discover/movie?sort_by=popularity.desc", 3600);
    return d.results.slice(0, n).map((x) => ({ ...x, media_type: "movie" }));
  }, () => free.cineCatalog("movie", "top", n));
}

export async function getSeries(n = 24): Promise<Media[]> {
  return tmdbOr(async () => {
    const d = await tmdb<{ results: Media[] }>("/discover/tv?sort_by=popularity.desc", 3600);
    return d.results.slice(0, n).map((x) => ({ ...x, media_type: "tv" }));
  }, () => free.cineCatalog("series", "top", n));
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

export async function searchAll(q: string) {
  if (hasKey()) {
    try {
      const r = await tmdb<any>(`/search/multi?query=${encodeURIComponent(q)}`, 300);
      return (r.results || []).filter((x: any) => x.media_type === "movie" || x.media_type === "tv");
    } catch { /* fallback free */ }
  }
  const [cine, tv] = await Promise.all([free.cineSearch(q).catch(() => []), free.tvSearch(q).catch(() => [])]);
  const seen = new Set<string>();
  return [...cine, ...tv].filter((x) => {
    const k = String(x.id);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// Títulos por género. TMDB: discover; free: filtra los tops (traen géneros).
export async function getByGenre(id: string, name: string): Promise<Media[]> {
  return tmdbOr(async () => {
    const [m, tv] = await Promise.all([
      tmdb<{ results: Media[] }>(`/discover/movie?with_genres=${id}&sort_by=popularity.desc`, 3600),
      tmdb<{ results: Media[] }>(`/discover/tv?with_genres=${id}&sort_by=popularity.desc`, 3600),
    ]);
    return [
      ...m.results.slice(0, 12).map((x) => ({ ...x, media_type: "movie" })),
      ...tv.results.slice(0, 12).map((x) => ({ ...x, media_type: "tv" })),
    ];
  }, async () => {
    const [mm, ss] = await Promise.all([free.cineCatalog("movie", "top", 60), free.cineCatalog("series", "top", 60)]);
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const want = norm(name);
    return [...mm, ...ss]
      .filter((x) => (x.genres || []).some((g) => { const ng = norm(String(g)); return ng === want || ng.includes(want) || want.includes(ng); }))
      .slice(0, 24);
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
      const hit = getPerson(p.id, lang);
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
      savePerson(p.id, lang, det, cast);
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
