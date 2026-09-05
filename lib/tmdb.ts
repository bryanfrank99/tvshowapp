// Fetch TMDB solo-servidor (la KEY nunca sale al cliente).
const BASE = "https://api.themoviedb.org/3";

export function hasKey() {
  return !!process.env.TMDB_API_KEY && process.env.TMDB_API_KEY !== "TU_API_KEY_AQUI";
}

export async function tmdb<T = any>(path: string, revalidate = 3600): Promise<T> {
  const key = process.env.TMDB_API_KEY;
  if (!hasKey()) throw new Error("NO_KEY");
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}${path}${sep}api_key=${key}&language=es-ES`, { next: { revalidate } });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

export const img = (p: string | null | undefined, size: string = "w500") => {
  if (!p) return "https://via.placeholder.com/500x750?text=Sin+imagen";
  if (p.startsWith("http")) return p; // fuentes free (Cinemeta/TVMaze) ya traen URL completa
  return `https://image.tmdb.org/t/p/${size}${p}`;
};
