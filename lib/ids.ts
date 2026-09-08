// Tipos y URLs IMDb puras (seguras para cliente y servidor).
export const imdbTitleUrl = (id: string) => `https://www.imdb.com/title/${id}/`;
export const imdbNameUrl = (nmId: string) => `https://www.imdb.com/name/${nmId}/`;
export const tmdbUrl = (type: "movie" | "tv", id: number | string) => `https://www.themoviedb.org/${type}/${id}`;
export const isTmdbNumeric = (id: number | string) => /^\d+$/.test(String(id));

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
  genres?: string[];
};
