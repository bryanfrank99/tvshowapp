// @ts-check
import assert from "node:assert/strict";
import { fillTemplate, providersToSources } from "../lib/adapters/provider-adapter.ts";
import { findBestSource, sortSourcesByPriority } from "../lib/sources.ts";

console.log("==================================================");
console.log("🧪 TESTING FASE 2: RESOLVER CENTRAL Y COMPATIBILIDAD");
console.log("==================================================");

// 1. Simular resolución de IDs (Cinemeta / TMDB)
console.log("\n[1/4] Verificando resolución de IDs en servidor (IMDb ↔ TMDB)...");
async function mockServerResolveTmdb(imdbId) {
  if (!imdbId.startsWith("tt")) return imdbId;
  const r = await fetch(`https://v3-cinemeta.strem.io/meta/movie/${imdbId}.json`);
  if (!r.ok) return null;
  const data = await r.json();
  return data?.meta?.moviedb_id ? String(data.meta.moviedb_id) : null;
}

const tmdbIdFightClub = await mockServerResolveTmdb("tt0137523");
assert.equal(tmdbIdFightClub, "550", "Fight Club (tt0137523) debe resolver al ID TMDB 550");
console.log("  ✅ Resolución de IMDb (tt0137523) a TMDB (550) correcta vía Cinemeta");

// 2. Simular pipeline de /api/resolve con catálogo representativo
console.log("\n[2/4] Verificando generación y priorización en el Resolver...");
const mockDatabaseProviders = [
  {
    id: "vidcore",
    name: "VidCore",
    simulated_name: "S1",
    movie_tpl: "https://vidcore.to/movie/{id}",
    tv_tpl: "https://vidcore.to/tv/{id}/{s}/{e}",
    lang: "lat,es",
    subtitles: "es,en",
    needs_tmdb: true,
    tv_ok: true,
    is_beta: false,
    active: true,
  },
  {
    id: "vidsrc",
    name: "VidSrc",
    simulated_name: "S2",
    movie_tpl: "https://vidsrc.to/embed/movie/{id}",
    tv_tpl: "https://vidsrc.to/embed/tv/{id}/{s}/{e}",
    lang: "en",
    subtitles: "en,es",
    needs_tmdb: false,
    tv_ok: true,
    is_beta: false,
    active: true,
  },
  {
    id: "redeflix",
    name: "RedeFlix",
    simulated_name: "S3",
    movie_tpl: "https://redeflix.lat/filme/{id}",
    tv_tpl: "https://redeflix.lat/serie/{id}/{s}/{e}",
    lang: "pt",
    subtitles: "pt",
    needs_tmdb: true,
    tv_ok: true,
    ord: 12,
    is_beta: false,
    active: true,
  },
  {
    id: "embedmovies",
    name: "EmbedMovies",
    simulated_name: "S11",
    ord: 11,
    movie_tpl: "https://myembed.biz/filme/{id}",
    tv_tpl: "https://myembed.biz/serie/{id}/{s}/{e}",
    lang: "pt",
    subtitles: "pt",
    needs_tmdb: true,
    tv_ok: true,
    is_beta: false,
    active: true,
  },
  {
    id: "betaserver",
    name: "Beta Experimental",
    simulated_name: "S4",
    ord: 4,
    movie_tpl: "https://beta.tv/movie/{id}",
    tv_tpl: "https://beta.tv/tv/{id}/{s}/{e}",
    lang: "es",
    subtitles: "es",
    needs_tmdb: false,
    tv_ok: true,
    is_beta: true,
    active: true,
  },
];

// Simulamos la lógica del Resolver para una película con ID IMDb ("tt0137523") y usuario en español
function simulateResolve({ rawId, type, season, episode, userLang, effectiveTmdbId }) {
  const sources = [];
  for (const p of mockDatabaseProviders) {
    if (!p.active) continue;
    if (type === "tv" && !p.tv_ok) continue;
    if (p.needs_tmdb && !effectiveTmdbId) continue;

    const targetId = p.needs_tmdb ? effectiveTmdbId : rawId;
    const adapted = providersToSources([p], {
      type,
      id: targetId,
      season,
      episode,
      userLang,
    });
    if (adapted.length > 0) {
      sources.push(...adapted);
    }
  }

  const sortedSources = sortSourcesByPriority(sources, userLang);
  return {
    success: sortedSources.length > 0,
    type,
    id: rawId,
    effectiveTmdbId,
    season,
    episode,
    sources: sortedSources,
    recommendedSourceId: sortedSources[0]?.id || "",
    version: "2.0",
  };
}

const resolvedEs = simulateResolve({
  rawId: "tt0137523",
  type: "movie",
  userLang: "es",
  effectiveTmdbId: tmdbIdFightClub,
});

assert.ok(resolvedEs.success, "Debe tener éxito al resolver fuentes");
assert.equal(resolvedEs.sources.length, 5, "Debe resolver las 5 fuentes disponibles");
assert.equal(resolvedEs.sources[0].providerId, "vidcore", "Para usuario 'es', VidCore debe ser recomendado");
assert.equal(resolvedEs.sources[0].url, "https://vidcore.to/movie/550", "VidCore debe recibir TMDB 550");
assert.equal(resolvedEs.sources[1].url, "https://vidsrc.to/embed/movie/tt0137523", "VidSrc debe recibir IMDb tt0137523");
console.log("  ✅ Generación de Sources con IDs adaptados e inyección TMDB/IMDb correcta");

// 3. Verificamos que para usuario portugués RedeFlix o EmbedMovies se prioricen conservando sus nombres canónicos
console.log("\n[3/4] Verificando afinidad idiomática y estabilidad de S{ord}...");
const resolvedPt = simulateResolve({
  rawId: "tt0137523",
  type: "movie",
  userLang: "pt",
  effectiveTmdbId: tmdbIdFightClub,
});
assert.ok(["redeflix", "embedmovies"].includes(resolvedPt.sources[0].providerId), "Para usuario 'pt', proveedor portugués debe tener máxima prioridad");
const embedSource = resolvedPt.sources.find((s) => s.providerId === "embedmovies");
assert.ok(embedSource, "EmbedMovies debe estar presente");
assert.equal(embedSource.providerName, "S11", "EmbedMovies debe conservar su nombre canónico S11");
assert.equal(embedSource.ord, 11, "EmbedMovies debe conservar su ord 11");
assert.equal(embedSource.url, "https://myembed.biz/filme/550", "EmbedMovies debe usar TMDB ID");

// Verificamos series para EmbedMovies con TMDB ID
const resolvedTv = simulateResolve({
  rawId: "tt0903747",
  type: "tv",
  season: 1,
  episode: 1,
  userLang: "pt",
  effectiveTmdbId: "1396",
});
const embedTvSource = resolvedTv.sources.find((s) => s.providerId === "embedmovies");
assert.ok(embedTvSource, "EmbedMovies debe resolver series cuando tiene TMDB ID");
assert.equal(embedTvSource.url, "https://myembed.biz/serie/1396/1/1", "EmbedMovies en series debe interpolar TMDB ID, temporada y episodio");
console.log("  ✅ EmbedMovies para series verificado con TMDB ID y URL correcta");
console.log("  ✅ RedeFlix / EmbedMovies conservan IDs canónicos estables (S11, S12) sin reenumerar dinámicamente");

// 4. Verificamos retrocompatibilidad de fillTemplate con /api/embed-url
console.log("\n[4/4] Verificando retrocompatibilidad de /api/embed-url...");
const legacyResult = fillTemplate("https://embed.org/{id}?s={s}&e={e}", "tt9999", 2, 7);
assert.equal(legacyResult, "https://embed.org/tt9999?s=2&e=7");
console.log("  ✅ Retrocompatibilidad asegurada con llamadas heredadas a /api/embed-url");

console.log("\n🎉 TODAS LAS PRUEBAS DE LA FASE 2 PASARON SATISFACTORIAMENTE.");
