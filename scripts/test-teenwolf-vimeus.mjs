// @ts-check
import assert from "node:assert/strict";
import { providersToSources } from "../lib/adapters/provider-adapter.ts";
import { sortSourcesByPriority } from "../lib/sources.ts";

console.log("==================================================");
console.log("🧪 TESTING RESOLUCIÓN DE SERIE tt1567432 (TEEN WOLF)");
console.log("==================================================");

// Proveedores reales incluyendo los 14 de Supabase
const providers = [
  { id: "vidcore", name: "VidCore", movie_tpl: "https://vidcore.io/movie/{id}", tv_tpl: "https://vidcore.io/tv/{id}/{s}/{e}", needs_tmdb: false, lang: "en", subtitles: "en", active: true },
  { id: "embos", name: "Embos", movie_tpl: "https://embos.top/movie/?mid={id}", tv_tpl: "https://embos.top/tv/?mid={id}&s={s}&e={e}", needs_tmdb: true, lang: "en", subtitles: "es,en,pt,multi", active: true },
  { id: "vidapi", name: "VidAPI", movie_tpl: "https://vidapi.xyz/embed/movie/{id}", tv_tpl: "https://vidapi.xyz/embed/tv/{id}/{s}/{e}", needs_tmdb: false, lang: "en", subtitles: "es,en,pt", active: true },
  { id: "streambetter", name: "StreamBetter", movie_tpl: "https://streambetter.shop/filme/{id}", tv_tpl: "https://streambetter.shop/serie/{id}/{s}/{e}", needs_tmdb: true, lang: "pt", subtitles: "pt", active: true },
  { id: "vidzy", name: "Vidzy", movie_tpl: "https://vidzy.org/movie/{id}", tv_tpl: "https://vidzy.org/serie/{id}/{s}/{e}", needs_tmdb: true, lang: "en", subtitles: "en", active: true },
  { id: "vimeus", name: "Vimeus", movie_tpl: "https://vimeus.com/e/movie?{idparam}&view_key={key}", tv_tpl: "https://vimeus.com/e/serie?{idparam}&se={s}&ep={e}&view_key={key}", needs_tmdb: true, lang: "en,es,lat", subtitles: "es,en", active: true },
  { id: "superembed", name: "SuperEmbed", movie_tpl: "https://multiembed.mov/?video_id={id}{tmdbflag}", tv_tpl: "https://multiembed.mov/?video_id={id}{tmdbflag}&s={s}&e={e}", needs_tmdb: false, lang: "en", subtitles: "en", active: true },
  { id: "moviesapi", name: "MoviesAPI", movie_tpl: "https://moviesapi.to/movie/{id}", tv_tpl: "https://moviesapi.to/tv/{id}/{s}/{e}", needs_tmdb: false, lang: "en", subtitles: "en,multi,pt,es", active: true },
  { id: "cinesrc", name: "CineSrc", movie_tpl: "https://cinesrc.st/embed/movie/{id}", tv_tpl: "https://cinesrc.st/embed/tv/{id}?s={s}&e={e}", needs_tmdb: true, lang: "en", subtitles: "es,en,pt,multi", active: true },
  { id: "vidzee", name: "VidZee", movie_tpl: "https://player.vidzee.wtf/embed/movie/{id}", tv_tpl: "https://player.vidzee.wtf/embed/tv/{id}/{s}/{e}", needs_tmdb: true, lang: "en", subtitles: "en,pt,multi,es", active: true },
  { id: "embedmovies", name: "EmbedMovies", movie_tpl: "https://myembed.biz/filme/{id}", tv_tpl: "https://myembed.biz/serie/{id}/{s}/{e}", needs_tmdb: false, lang: "pt", subtitles: "pt", active: true },
  { id: "redeflix", name: "RedeFlix", movie_tpl: "https://redeflixapi.store/filme/{id}", tv_tpl: "https://redeflixapi.store/serie/{id}/{s}/{e}", needs_tmdb: true, lang: "pt", subtitles: "pt", active: true },
  { id: "pipocacine", name: "PipocaCine", movie_tpl: "https://pipocacine.lat/embed/{id}", tv_tpl: "https://pipocacine.lat/embed/{id}/{s}/{e}", needs_tmdb: true, lang: "pt,lat", subtitles: "pt", active: true },
  { id: "megaembed", name: "MegaEmbed", movie_tpl: "https://megaembed.me/movie/{id}", tv_tpl: "https://megaembed.me/tv/{id}/{s}/{e}", needs_tmdb: false, lang: "pt,en", subtitles: "pt,es,en", active: true },
];

const effectiveTmdbId = "34524"; // Teen Wolf TMDB
const rawId = "tt1567432";

const rawSources = [];
for (const p of providers) {
  const targetId = p.needs_tmdb ? (effectiveTmdbId || rawId) : rawId;
  const adapted = providersToSources([p], {
    type: "tv",
    id: targetId,
    season: 1,
    episode: 1,
    userLang: "es",
  });
  if (adapted.length > 0) rawSources.push(...adapted);
}

const sorted = sortSourcesByPriority(rawSources, "es");
const sources = sorted.map((s, idx) => ({ ...s, providerName: `S${idx + 1}` }));

console.log(`\nTotal de fuentes activas resueltas: ${sources.length} de ${providers.length}`);
console.log("Orden para Teen Wolf (usuario en español):");
for (const s of sources) {
  console.log(`  ${s.providerName.padEnd(4)} -> ${s.providerId.padEnd(14)} (${s.languages.join(",")}) [subs: ${s.subtitles.map(x=>x.id).join(",")}]`);
}

assert.equal(sources.length, 14, "Los 14 servidores activos DEBEN aparecer en la lista");
assert.equal(sources[0].providerId, "vimeus", "Vimeus debe ser S1 recomendado para español");


console.log("\nFuentes resueltas para Teen Wolf en español:", sources.map(s => `${s.providerName} (${s.providerId}) -> URL: ${s.url}`));

const vimeusSource = sources.find(s => s.providerId === "vimeus");
assert.ok(vimeusSource, "Vimeus DEBE aparecer en las fuentes para series");
assert.equal(vimeusSource.providerName, "S1", "Vimeus debe ser S1 para español");
assert.ok(vimeusSource.url.includes("serie?tmdb=34524&se=1&ep=1"), "URL debe contener se=1&ep=1 y tmdb=34524");

const movieOnlySource = sources.find(s => s.providerId === "movieonly");
assert.equal(movieOnlySource, undefined, "Movie Only sin tv_tpl debe ser omitido");

console.log("\n🎉 VIMEUS Y SERVIDORES DE SERIES FUNCIONAN AL 100%");
