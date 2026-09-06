// Volcado TMDB → SQLite (data/tmdb.db). Sin imágenes, solo metadata.
// Uso:
//   node scripts/sync-tmdb.mjs movie:550 tv:1399 person:3223 --lang es,en,pt
//   node scripts/sync-tmdb.mjs --popular movie 10 --lang es
//   node scripts/sync-tmdb.mjs --trending tv --lang es
// Lee TMDB_API_KEY de env o .env.local
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const f of [".env.local", ".env"]) {
  const p = join(root, f);
  if (existsSync(p)) {
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
const KEY = process.env.TMDB_API_KEY;
if (!KEY || KEY === "TU_API_KEY_AQUI") {
  console.error("Falta TMDB_API_KEY (env o .env.local)");
  process.exit(1);
}

const BASE = "https://api.themoviedb.org/3";
async function api(path, lang) {
  const sep = path.includes("?") ? "&" : "?";
  const r = await fetch(`${BASE}${path}${sep}api_key=${KEY}&language=${lang === "en" ? "en-US" : lang === "pt" ? "pt-BR" : "es-ES"}`);
  if (!r.ok) throw new Error(`TMDB ${r.status} ${path}`);
  return r.json();
}

const args = process.argv.slice(2);
let langs = ["es"];
const items = [];
let popular = null;
let trending = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--lang") langs = args[++i].split(",");
  else if (args[i] === "--popular") popular = { type: args[++i], n: Number(args[++i] || 10) };
  else if (args[i] === "--trending") trending = args[++i];
  else if (/^(movie|tv|person):.+/.test(args[i])) {
    const [type, id] = args[i].split(":");
    items.push({ type, id });
  }
}

// lib/db.ts es TypeScript puro (sin enums): Node 24 lo importa directo (type stripping).
const db = await import("../lib/db.ts");
let nTitles = 0, nEps = 0, nPeople = 0;

async function syncTitle(type, id) {
  for (const lang of langs) {
    const m = await api(`/${type}/${id}?append_to_response=credits,videos,release_dates`, lang);
    let imdb = null;
    try {
      const ex = await api(`/${type}/${id}/external_ids`, lang);
      imdb = ex.imdb_id || null;
    } catch {}
    const credits = {
      cast: (m.credits?.cast || []).slice(0, 20).map((c) => ({ id: c.id, name: c.name, character: c.character, photo: c.profile_path })),
      crew: (m.credits?.crew || []).slice(0, 20).map((c) => ({ id: c.id, name: c.name, job: c.job, photo: c.profile_path })),
    };
    db.saveTitle(type, id, lang, m, imdb, credits);
    nTitles++;
    console.log(`  [${lang}] ${type} ${id}: ${m.title || m.name}`);
    if (type === "tv") {
      const seasons = (m.seasons || []).filter((s) => s.season_number > 0);
      for (const s of seasons) {
        try {
          const det = await api(`/tv/${id}/season/${s.season_number}`, lang);
          db.saveSeason(id, s.season_number, lang, det);
          nEps += det.episodes?.length || 0;
          console.log(`    T${s.season_number}: ${det.episodes?.length || 0} eps`);
        } catch (e) {
          console.log(`    T${s.season_number}: error ${e.message}`);
        }
      }
    }
  }
}

async function syncPerson(id) {
  for (const lang of langs) {
    const p = await api(`/person/${id}?append_to_response=combined_credits`, lang);
    const works = ((p.combined_credits?.cast || [])).filter((x) => x.media_type === "movie" || x.media_type === "tv")
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, 30)
      .map((x) => ({ id: x.id, media_type: x.media_type, title: x.title || x.name, name: x.name || x.title, poster_path: x.poster_path, vote_average: x.vote_average }));
    db.savePerson(id, lang, p, works);
    nPeople++;
    console.log(`  [${lang}] person ${id}: ${p.name} (${works.length} obras)`);
  }
}

if (popular) {
  const map = { movie: "/movie/popular", tv: "/tv/popular", person: "/person/popular" };
  const d = await api(`${map[popular.type]}?sort_by=popularity.desc`, langs[0]);
  for (const it of (d.results || []).slice(0, popular.n)) {
    if (popular.type === "person") await syncPerson(it.id);
    else await syncTitle(popular.type === "movie" ? "movie" : "tv", it.id);
  }
} else if (trending) {
  const d = await api(`/trending/${trending}/week`, langs[0]);
  for (const it of (d.results || []).slice(0, 10)) {
    const t = it.media_type === "tv" ? "tv" : it.media_type === "movie" ? "movie" : null;
    if (t) await syncTitle(t, it.id);
  }
}
for (const it of items) {
  if (it.type === "person") await syncPerson(it.id);
  else await syncTitle(it.type, it.id);
}

console.log(`OK: ${nTitles} títulos, ${nEps} episodios, ${nPeople} personas → data/tmdb.db`);
try { console.log("DB:", JSON.stringify(db.dbStats())); } catch {}
try {
  const purged = db.pruneStale(30);
  if (purged) console.log(`Purga: ${purged} filas de >30 días eliminadas`);
} catch {}
process.exit(0);
