// Fuentes 100% gratuitas SIN API KEY (CORS abierto):
// - Cinemeta (Stremio): pelis+series con IDs IMDb nativos, posters, ratings IMDb, episodios.
// - TVMaze: series al aire, búsqueda, cast/personas, lookup por IMDb.
// Se normaliza todo a la forma Media/TMDB-like para reutilizar componentes y player.
import type { Media } from "./imdb";

const CINEMETA = "https://v3-cinemeta.strem.io";
const TVMAZE = "https://api.tvmaze.com";

async function j<T = any>(url: string, revalidate = 3600): Promise<T> {
  const r = await fetch(url, { next: { revalidate } });
  if (!r.ok) throw new Error(`FREE ${r.status} ${url}`);
  return r.json();
}

export const isImdbId = (id: string | number) => typeof id === "string" && id.startsWith("tt");
const num = (v: any) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };

// ---------- Cinemeta ----------
function cineMedia(m: any, type: "movie" | "tv"): Media {
  return {
    id: m.id,
    media_type: type,
    title: type === "movie" ? m.name : undefined,
    name: type === "tv" ? m.name : undefined,
    poster_path: m.poster ?? null,
    backdrop_path: m.backdrop ?? m.background ?? null,
    vote_average: num(m.imdbRating),
    imdb_id: m.id,
  };
}

export async function cineCatalog(type: "movie" | "series", list = "top", n = 12): Promise<Media[]> {
  const d = await j<{ metas: any[] }>(`${CINEMETA}/catalog/${type}/${list}.json`, 3600);
  const t = type === "movie" ? "movie" : "tv";
  return (d.metas || []).slice(0, n).map((m) => cineMedia(m, t as "movie" | "tv"));
}

export async function cineSearch(q: string, n = 12): Promise<Media[]> {
  const [m, s] = await Promise.all([
    j<{ metas: any[] }>(`${CINEMETA}/catalog/movie/top/search=${encodeURIComponent(q)}.json`, 300).catch(() => ({ metas: [] })),
    j<{ metas: any[] }>(`${CINEMETA}/catalog/series/top/search=${encodeURIComponent(q)}.json`, 300).catch(() => ({ metas: [] })),
  ]);
  return [
    ...(m.metas || []).slice(0, n).map((x) => cineMedia(x, "movie")),
    ...(s.metas || []).slice(0, n).map((x) => cineMedia(x, "tv")),
  ].slice(0, n * 2);
}

export async function cineMeta(type: "movie" | "series", imdb: string) {
  const d = await j<{ meta: any }>(`${CINEMETA}/meta/${type}/${imdb}.json`, 3600);
  return d.meta;
}

export function cineMovieDetail(m: any, imdb: string) {
  return {
    id: imdb,
    title: m.name,
    overview: m.description || "",
    poster_path: m.poster ?? null,
    backdrop_path: m.backdrop ?? m.background ?? null,
    vote_average: num(m.imdbRating),
    release_date: m.year ? String(m.year) : "",
    runtime: (m.runtime || "").replace(" min", "") || "?",
    imdb_id: imdb,
    credits: { cast: (m.cast || []).slice(0, 8).map((n: string) => ({ id: n, name: n })) },
  };
}

export function cineSeasons(m: any) {
  const vids = (m.videos || []).filter((v: any) => v.season && v.episode);
  const map = new Map<number, any[]>();
  for (const v of vids) {
    if (!map.has(v.season)) map.set(v.season, []);
    map.get(v.season)!.push(v);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([season_number, eps]) => ({ season_number, episode_count: eps.length }));
}

export function cineEpisodes(m: any, season: number) {
  return (m.videos || [])
    .filter((v: any) => v.season === season)
    .sort((a: any, b: any) => a.episode - b.episode)
    .map((v: any) => ({
      episode_number: v.episode,
      name: v.name || v.title || `Episodio ${v.episode}`,
      overview: v.overview || v.description || "",
      still_path: v.thumbnail ?? null,
      vote_average: num(v.rating),
      air_date: (v.released || v.firstAired || "").slice(0, 10),
    }));
}

export function cineSeriesDetail(m: any, imdb: string) {
  return {
    id: imdb,
    name: m.name,
    overview: m.description || "",
    poster_path: m.poster ?? null,
    backdrop_path: m.backdrop ?? m.background ?? null,
    vote_average: num(m.imdbRating),
    first_air_date: m.year ? String(m.year) : "",
    number_of_seasons: cineSeasons(m).length,
    number_of_episodes: (m.videos || []).length,
    imdb_id: imdb,
    seasons: [{ season_number: 0, episode_count: 0 }, ...cineSeasons(m)],
  };
}

// ---------- TVMaze (búsqueda de series) ----------
export async function tvSearch(q: string, n = 12): Promise<Media[]> {
  const d = await j<any[]>(`${TVMAZE}/search/shows?q=${encodeURIComponent(q)}`, 300);
  return d.slice(0, n).map(({ show: s }: any) => ({
    id: s.externals?.imdb || `tvmaze:${s.id}`,
    media_type: "tv", name: s.name,
    poster_path: s.image?.medium ?? null,
    backdrop_path: s.image?.original ?? null,
    vote_average: num(s.rating?.average),
    imdb_id: s.externals?.imdb || null,
  }));
}
