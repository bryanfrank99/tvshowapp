// Catálogo dual: TMDB si hay KEY, si no (o si falla) → fuentes free sin key.
// Las páginas no cambian: llaman lo mismo y funciona en ambos modos.
import { tmdb, hasKey } from "./tmdb";
import { withImdbIds, type Media } from "./imdb";
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
