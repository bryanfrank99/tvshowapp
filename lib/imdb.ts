// Puente IMDb: IMDb no tiene API oficial → links + imdb_id vía TMDB external_ids.
import { tmdb } from "./tmdb";

export const imdbTitleUrl = (id: string) => `https://www.imdb.com/title/${id}/`;

export async function getImdbId(type: "movie" | "tv", tmdbId: string): Promise<string | null> {
  try {
    const ex = await tmdb<{ imdb_id: string | null }>(
      `/${type}/${tmdbId}/external_ids`,
      24 * 3600
    );
    return ex.imdb_id ?? null;
  } catch {
    return null;
  }
}

export type Media = {
  id: number | string;
  media_type?: string;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  first_air_date?: string;
  imdb_id?: string | null;
  rank?: number;
};

export async function withImdbIds(items: Media[], limit = 10): Promise<Media[]> {
  const slice = items.slice(0, limit);
  const ids = await Promise.all(
    slice.map((it) => {
      const t = it.media_type === "tv" || (it as any).first_air_date ? "tv" : "movie";
      return getImdbId(t as "movie" | "tv", String(it.id));
    })
  );
  return items.map((it, i) => (i < slice.length ? { ...it, imdb_id: ids[i] } : it));
}
