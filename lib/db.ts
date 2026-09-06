// Caché SQLite local de TMDB (sin imágenes: solo rutas/poster_path).
// Archivo: data/tmdb.db (ignorado en git). Vale para dev y self-host;
// en serverless (Vercel) el FS es efímero: allí actúa como caché por instancia.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";

const DB_PATH = process.env.SQLITE_PATH || join(process.cwd(), "data", "tmdb.db");

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!db) {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    const fresh = !existsSync(DB_PATH);
    db = new DatabaseSync(DB_PATH);
    db.exec("PRAGMA journal_mode = WAL;");
    if (fresh) initSchema(db);
    else ensureSchema(db);
  }
  return db;
}

function initSchema(d: DatabaseSync) {
  d.exec(`
    CREATE TABLE titles (
      tmdb_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('movie','tv')),
      lang TEXT NOT NULL DEFAULT 'es',
      title TEXT, original_title TEXT, overview TEXT, tagline TEXT,
      release_date TEXT, runtime INTEGER, status TEXT,
      budget INTEGER, revenue INTEGER, orig_lang TEXT, certification TEXT,
      vote_average REAL, vote_count INTEGER, popularity REAL,
      poster_path TEXT, backdrop_path TEXT,
      genres TEXT, -- JSON [{id,name}]
      imdb_id TEXT,
      seasons_info TEXT, -- JSON (tv)
      number_of_seasons INTEGER, number_of_episodes INTEGER,
      credits TEXT, -- JSON {cast:[...], crew:[...]}
      videos TEXT, -- JSON [{key,site,type,name}]
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (tmdb_id, type, lang)
    );
    CREATE TABLE seasons (
      tv_id INTEGER NOT NULL, season INTEGER NOT NULL, lang TEXT NOT NULL DEFAULT 'es',
      name TEXT, overview TEXT, air_date TEXT, episode_count INTEGER, poster_path TEXT,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (tv_id, season, lang)
    );
    CREATE TABLE episodes (
      tv_id INTEGER NOT NULL, season INTEGER NOT NULL, episode INTEGER NOT NULL, lang TEXT NOT NULL DEFAULT 'es',
      name TEXT, overview TEXT, air_date TEXT, runtime INTEGER,
      still_path TEXT, vote_average REAL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (tv_id, season, episode, lang)
    );
    CREATE TABLE people (
      tmdb_id INTEGER NOT NULL, lang TEXT NOT NULL DEFAULT 'es',
      name TEXT, photo TEXT, known_for TEXT, biography TEXT,
      works TEXT, -- JSON combined_credits recortado
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (tmdb_id, lang)
    );
  `);
}

function ensureSchema(d: DatabaseSync) {
  // Migraciones para DBs creadas antes: nuevas columnas de titles.
  for (const col of ["tagline TEXT", "status TEXT", "budget INTEGER", "revenue INTEGER", "orig_lang TEXT", "certification TEXT", "videos TEXT"]) {
    try { d.exec(`ALTER TABLE titles ADD COLUMN ${col}`); } catch {}
  }
}

// ---------- títulos ----------
export type TitleRow = any;

export function getTitle(type: string, id: number | string, lang: string, maxAgeMs = 7 * 86400 * 1000) {
  try {
    const row = getDb().prepare("SELECT * FROM titles WHERE tmdb_id=? AND type=? AND lang=?").get(Number(id), type, lang) as any;
    if (!row) return null;
    if (Date.now() - row.updated_at > maxAgeMs) return null; // caducado → revalidar
    for (const k of ["genres", "seasons_info", "credits", "videos"]) {
      try { row[k] = row[k] ? JSON.parse(row[k]) : (k === "credits" ? { cast: [], crew: [] } : []); } catch { row[k] = k === "credits" ? { cast: [], crew: [] } : []; }
    }
    return row;
  } catch {
    return null;
  }
}

export function saveTitle(type: string, id: number | string, lang: string, m: any, imdbId: string | null, credits: any) {
  const d = getDb();
  const vids = ((m.videos?.results || m.videos || []) as any[])
    .filter((v: any) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"))
    .slice(0, 5)
    .map((v: any) => ({ key: v.key, type: v.type, name: v.name }));
  d.prepare(`
    INSERT INTO titles (tmdb_id,type,lang,title,original_title,overview,tagline,release_date,runtime,status,
      budget,revenue,orig_lang,certification,
      vote_average,vote_count,popularity,poster_path,backdrop_path,genres,imdb_id,
      seasons_info,number_of_seasons,number_of_episodes,credits,videos,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(tmdb_id,type,lang) DO UPDATE SET
      title=excluded.title, original_title=excluded.original_title, overview=excluded.overview,
      tagline=excluded.tagline, release_date=excluded.release_date, runtime=excluded.runtime,
      status=excluded.status, budget=excluded.budget, revenue=excluded.revenue,
      orig_lang=excluded.orig_lang, certification=excluded.certification,
      vote_average=excluded.vote_average,
      vote_count=excluded.vote_count, popularity=excluded.popularity, poster_path=excluded.poster_path,
      backdrop_path=excluded.backdrop_path, genres=excluded.genres, imdb_id=excluded.imdb_id,
      seasons_info=excluded.seasons_info, number_of_seasons=excluded.number_of_seasons,
      number_of_episodes=excluded.number_of_episodes, credits=excluded.credits,
      videos=excluded.videos, updated_at=excluded.updated_at
  `).run(
    Number(id), type, lang,
    m.title || m.name || "", m.original_title || m.original_name || "", m.overview || "",
    m.tagline || "", m.release_date || m.first_air_date || "",
    m.runtime ?? m.episode_run_time?.[0] ?? null, m.status || "",
    m.budget ?? 0, m.revenue ?? 0, m.original_language || "",
    m.certification || certOf(m),
    m.vote_average ?? 0, m.vote_count ?? 0, m.popularity ?? 0,
    m.poster_path || null, m.backdrop_path || null,
    JSON.stringify(m.genres || []), imdbId,
    JSON.stringify(m.seasons || []), m.number_of_seasons ?? null, m.number_of_episodes ?? null,
    JSON.stringify(credits || { cast: [], crew: [] }), JSON.stringify(vids), Date.now()
  );
}

// Certificación US (ej. PG-13) desde release_dates (movie) o content_ratings (tv).
export function certOf(m: any): string {
  try {
    const us = (m.release_dates?.results || []).find((r: any) => r.iso_3166_1 === "US");
    const rel = (us?.release_dates || []).find((x: any) => x.certification) || (us?.release_dates || [])[0];
    if (rel?.certification) return rel.certification;
    const rt = (m.content_ratings?.results || []).find((r: any) => r.iso_3166_1 === "US");
    return rt?.rating || "";
  } catch {
    return "";
  }
}

// ---------- temporadas / episodios ----------
export function getEpisodes(tvId: number | string, season: number, lang: string, maxAgeMs = 7 * 86400 * 1000) {
  try {
    const rows = getDb().prepare("SELECT * FROM episodes WHERE tv_id=? AND season=? AND lang=? ORDER BY episode").all(Number(tvId), season, lang) as any[];
    if (!rows.length) return null;
    if (Date.now() - rows[0].updated_at > maxAgeMs) return null;
    return rows;
  } catch {
    return null;
  }
}

export function saveSeason(tvId: number | string, season: number, lang: string, det: any) {
  const d = getDb();
  const now = Date.now();
  d.prepare(`INSERT INTO seasons (tv_id,season,lang,name,overview,air_date,episode_count,poster_path,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(tv_id,season,lang) DO UPDATE SET
    name=excluded.name,overview=excluded.overview,air_date=excluded.air_date,
    episode_count=excluded.episode_count,poster_path=excluded.poster_path,updated_at=excluded.updated_at`)
    .run(Number(tvId), season, lang, det.name || "", det.overview || "", det.air_date || "", det.episodes?.length ?? 0, det.poster_path || null, now);
  const ins = d.prepare(`INSERT INTO episodes (tv_id,season,episode,lang,name,overview,air_date,runtime,still_path,vote_average,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(tv_id,season,episode,lang) DO UPDATE SET
    name=excluded.name,overview=excluded.overview,air_date=excluded.air_date,runtime=excluded.runtime,
    still_path=excluded.still_path,vote_average=excluded.vote_average,updated_at=excluded.updated_at`);
  for (const ep of det.episodes || []) {
    ins.run(Number(tvId), season, ep.episode_number, lang, ep.name || "", ep.overview || "",
      ep.air_date || "", ep.runtime ?? null, ep.still_path || null, ep.vote_average ?? 0, now);
  }
}

// ---------- personas ----------
export function getPerson(id: number | string, lang: string, maxAgeMs = 7 * 86400 * 1000) {
  try {
    const row = getDb().prepare("SELECT * FROM people WHERE tmdb_id=? AND lang=?").get(Number(id), lang) as any;
    if (!row || Date.now() - row.updated_at > maxAgeMs) return null;
    try { row.works = row.works ? JSON.parse(row.works) : []; } catch { row.works = []; }
    return row;
  } catch {
    return null;
  }
}

export function savePerson(id: number | string, lang: string, p: any, works: any[]) {
  getDb().prepare(`INSERT INTO people (tmdb_id,lang,name,photo,known_for,biography,works,updated_at)
    VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(tmdb_id,lang) DO UPDATE SET
    name=excluded.name,photo=excluded.photo,known_for=excluded.known_for,
    biography=excluded.biography,works=excluded.works,updated_at=excluded.updated_at`)
    .run(Number(id), lang, p.name || "", p.profile_path || null, p.known_for_department || "",
      p.biography || "", JSON.stringify(works || []), Date.now());
}

export function dbStats() {
  const d = getDb();
  const q = (sql: string) => (d.prepare(sql).get() as any)?.n ?? 0;
  return {
    titles: q("SELECT COUNT(*) n FROM titles"),
    seasons: q("SELECT COUNT(*) n FROM seasons"),
    episodes: q("SELECT COUNT(*) n FROM episodes"),
    people: q("SELECT COUNT(*) n FROM people"),
  };
}

// Purga filas no tocadas hace más de `days` (por defecto 30 = 4x la caducidad).
// Así lo nunca revisitado no acumula basura.
export function pruneStale(days = 30) {
  const cutoff = Date.now() - days * 86400 * 1000;
  const d = getDb();
  let total = 0;
  for (const t of ["titles", "seasons", "episodes", "people"]) {
    const r = d.prepare(`DELETE FROM ${t} WHERE updated_at < ?`).run(cutoff) as any;
    total += Number(r.changes || 0);
  }
  try { d.exec("VACUUM"); } catch {}
  return total;
}
