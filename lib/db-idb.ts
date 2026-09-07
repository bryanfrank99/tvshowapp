// Backend IndexedDB de la caché TMDB (modo estático / Capacitor).
// Misma API que lib/db.ts (SQLite) para que las páginas no cambien.
import type { TitleRow } from "./db-types";

const DB = "tvshow";
const STORE = "kv";
const mem = new Map<string, { v: any; t: number }>();

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}

async function get<T>(k: string): Promise<T | null> {
  try {
    const d = await idb();
    return await new Promise((res) => {
      const tx = d.transaction(STORE, "readonly").objectStore(STORE).get(k);
      tx.onsuccess = () => res((tx.result as any) ?? mem.get(k)?.v ?? null);
      tx.onerror = () => res(mem.get(k)?.v ?? null);
    });
  } catch {
    return mem.get(k)?.v ?? null;
  }
}

async function set(k: string, v: any) {
  mem.set(k, { v, t: Date.now() });
  try {
    const d = await idb();
    await new Promise<void>((res) => {
      const tx = d.transaction(STORE, "readwrite").objectStore(STORE).put(v, k);
      tx.onsuccess = () => res();
      tx.onerror = () => res();
    });
  } catch {}
}

const fresh = (t: number, maxAgeMs: number) => Date.now() - t < maxAgeMs;

// ---------- títulos ----------
export async function getTitle(type: string, id: number | string, lang: string, maxAgeMs = 7 * 86400 * 1000) {
  const e = await get<{ v: TitleRow; t: number }>(`t:${type}:${id}:${lang}`);
  if (!e || !fresh(e.t, maxAgeMs)) return null;
  return e.v;
}

export async function saveTitle(type: string, id: number | string, lang: string, m: any, imdbId: string | null, credits: any) {
  const { certOf } = await import("./db-cert");
  const vids = ((m.videos?.results || m.videos || []) as any[])
    .filter((v: any) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"))
    .slice(0, 5)
    .map((v: any) => ({ key: v.key, type: v.type, name: v.name }));
  await set(`t:${type}:${id}:${lang}`, {
    tmdb_id: Number(id), type, lang,
    title: m.title || m.name || "", original_title: m.original_title || m.original_name || "",
    overview: m.overview || "", tagline: m.tagline || "",
    release_date: m.release_date || m.first_air_date || "",
    runtime: m.runtime ?? m.episode_run_time?.[0] ?? null, status: m.status || "",
    budget: m.budget ?? 0, revenue: m.revenue ?? 0, orig_lang: m.original_language || "",
    certification: m.certification || certOf(m),
    vote_average: m.vote_average ?? 0, vote_count: m.vote_count ?? 0, popularity: m.popularity ?? 0,
    poster_path: m.poster_path || null, backdrop_path: m.backdrop_path || null,
    genres: m.genres || [], imdb_id: imdbId,
    seasons_info: m.seasons || [], number_of_seasons: m.number_of_seasons ?? null,
    number_of_episodes: m.number_of_episodes ?? null,
    credits: credits || { cast: [], crew: [] }, videos: vids,
    updated_at: Date.now(),
  });
}

export { certOf } from "./db-cert";

// ---------- temporadas / episodios ----------
export async function getEpisodes(tvId: number | string, season: number, lang: string, maxAgeMs = 7 * 86400 * 1000) {
  const e = await get<{ v: any[]; t: number }>(`eps:${tvId}:${season}:${lang}`);
  if (!e || !e.v?.length || !fresh(e.t, maxAgeMs)) return null;
  return e.v;
}

export async function saveSeason(tvId: number | string, season: number, lang: string, det: any) {
  await set(`eps:${tvId}:${season}:${lang}`, (det.episodes || []).map((ep: any) => ({
    episode: ep.episode_number, name: ep.name || "", overview: ep.overview || "",
    air_date: ep.air_date || "", runtime: ep.runtime ?? null,
    still_path: ep.still_path || null, vote_average: ep.vote_average ?? 0,
    updated_at: Date.now(),
  })));
}

// ---------- personas ----------
export async function getPerson(id: number | string, lang: string, maxAgeMs = 7 * 86400 * 1000) {
  const e = await get<{ v: any; t: number }>(`p:${id}:${lang}`);
  if (!e || !fresh(e.t, maxAgeMs)) return null;
  return e.v;
}

export async function savePerson(id: number | string, lang: string, p: any, works: any[]) {
  await set(`p:${id}:${lang}`, {
    tmdb_id: Number(id), lang, name: p.name || "", photo: p.profile_path || null,
    known_for: p.known_for_department || "", biography: p.biography || "",
    works: works || [], updated_at: Date.now(),
  });
}

export async function dbStats() {
  return { titles: 0, seasons: 0, episodes: 0, people: 0, backend: "idb" };
}

export async function pruneStale(_days = 30) {
  return 0;
}
