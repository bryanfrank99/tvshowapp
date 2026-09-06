// Puente IMDb (SOLO servidor): imdb_id vía TMDB external_ids.
// Tipos y URLs puras en ./ids (seguras para cliente).
import { tmdb } from "./tmdb";
import type { Media } from "./ids";

export { imdbTitleUrl } from "./ids";
export type { Media };

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
