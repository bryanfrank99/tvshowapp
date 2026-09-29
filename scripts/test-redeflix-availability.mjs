import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

console.log("==========================================================");
console.log("🧪 TESTING SPEC 056: REDEFLIX CONTENT AVAILABILITY CHECK");
console.log("==========================================================");

const modulePath = pathToFileURL(path.join(rootDir, "lib", "redeflix-availability.ts")).href;
const {
  isRedeflixProvider,
  isRedeflixAvailable,
  getRedeflixMovieSet,
  getRedeflixTvMap,
  getRedeflixCacheStats,
  clearRedeflixCache,
} = await import(modulePath);

// 1. Verificación de identificación de proveedor
console.log("\n1. Verificando detección de proveedor RedeFlix...");
assert.equal(isRedeflixProvider({ id: "redeflix" }), true, "id redeflix debe ser detectado");
assert.equal(isRedeflixProvider({ id: "REDEFLIX" }), true, "id case-insensitive debe ser detectado");
assert.equal(isRedeflixProvider({ id: "other", movie_tpl: "https://redeflixapi.store/filme/{id}" }), true, "movie_tpl con redeflixapi.store debe ser detectado");
assert.equal(isRedeflixProvider({ id: "other", tv_tpl: "https://redeflixapi.store/serie/{id}/{s}/{e}" }), true, "tv_tpl con redeflixapi.store debe ser detectado");
assert.equal(isRedeflixProvider({ id: "vimeus", movie_tpl: "https://vimeus.com/e/{key}/{id}" }), false, "proveedor vimeus no debe ser confundido");
assert.equal(isRedeflixProvider(null), false, "null debe retornar false");
assert.equal(isRedeflixProvider(undefined), false, "undefined debe retornar false");
console.log("  ✓ isRedeflixProvider: OK");

// 2. Verificación de catálogo de películas
console.log("\n2. Verificando disponibilidad de películas...");
clearRedeflixCache();

const movieStartTime = Date.now();
const movie550Available = await isRedeflixAvailable({ type: "movie", tmdbId: "550" }); // Fight Club
const movieFetchDuration = Date.now() - movieStartTime;
console.log(`  Descarga y consulta inicial de películas: ${movieFetchDuration}ms`);
assert.equal(movie550Available, true, "Película 550 (Fight Club) DEBE estar disponible");

const fakeMovieAvailable = await isRedeflixAvailable({ type: "movie", tmdbId: "999999999" });
assert.equal(fakeMovieAvailable, false, "Película 999999999 NO debe estar disponible");

const invalidTmdbAvailable = await isRedeflixAvailable({ type: "movie", tmdbId: "tt0137523" });
assert.equal(invalidTmdbAvailable, false, "IMDb ID sin resolver a TMDB numérico no debe ser aceptado");

const emptyTmdbAvailable = await isRedeflixAvailable({ type: "movie", tmdbId: "" });
assert.equal(emptyTmdbAvailable, false, "ID vacío no debe ser aceptado");

// Comprobación de caché caliente O(1)
const cacheWarmStart = Date.now();
const movie550Cached = await isRedeflixAvailable({ type: "movie", tmdbId: "550" });
const cacheWarmDuration = Date.now() - cacheWarmStart;
assert.equal(movie550Cached, true);
assert.ok(cacheWarmDuration < 5, `Consulta en caché debe ser casi instantánea (<5ms, fue ${cacheWarmDuration}ms)`);
console.log(`  ✓ Caché en caliente de películas O(1): ${cacheWarmDuration}ms`);

// 3. Verificación de catálogo de series y episodios
console.log("\n3. Verificando disponibilidad de series y episodios...");
const tvStartTime = Date.now();
const tv1664Available = await isRedeflixAvailable({ type: "tv", tmdbId: "1664", season: 1, episode: 1 }); // Spider-man animada
const tvFetchDuration = Date.now() - tvStartTime;
console.log(`  Descarga y consulta inicial de series: ${tvFetchDuration}ms`);
assert.equal(tv1664Available, true, "Serie 1664 S1E1 DEBE estar disponible");

// Episodio inexistente en serie existente
const tv1664BadEp = await isRedeflixAvailable({ type: "tv", tmdbId: "1664", season: 1, episode: 99 });
assert.equal(tv1664BadEp, false, "Serie 1664 S1E99 NO debe estar disponible");

// Serie inexistente
const tvFakeAvailable = await isRedeflixAvailable({ type: "tv", tmdbId: "999999999", season: 1, episode: 1 });
assert.equal(tvFakeAvailable, false, "Serie 999999999 NO debe estar disponible");

// Verificación a nivel de serie sin especificar episodio
const tvSeriesGeneral = await isRedeflixAvailable({ type: "tv", tmdbId: "1664" });
assert.equal(tvSeriesGeneral, true, "Consulta general de serie 1664 debe ser true si existe");

// Verificación específica de animes (list-anime-ids.txt)
const animeAvailable = await isRedeflixAvailable({ type: "tv", tmdbId: "11000", season: 1, episode: 1 });
assert.equal(animeAvailable, true, "Anime 11000 (G.I. Joe Sigma 6) S1E1 DEBE estar disponible");

// Verificación específica de doramas (list-dorama-ids.txt)
const doramaAvailable = await isRedeflixAvailable({ type: "tv", tmdbId: "38084", season: 1, episode: 1 });
assert.equal(doramaAvailable, true, "Dorama 38084 (MM!) S1E1 DEBE estar disponible");
console.log("  ✓ Verificación específica de animes y doramas: OK");

// 4. Verificación de estadísticas de caché
console.log("\n4. Verificando estadísticas de caché en memoria...");
const stats = getRedeflixCacheStats();
assert.ok(stats.moviesCount > 20000, `Debe haber más de 20,000 películas indexadas (hay ${stats.moviesCount})`);
assert.ok(stats.tvSeriesCount > 6000, `Debe haber más de 6,000 series indexadas (hay ${stats.tvSeriesCount})`);
assert.equal(stats.isMoviesCached, true);
assert.equal(stats.isTvCached, true);
console.log(`  ✓ Películas en memoria: ${stats.moviesCount}`);
console.log(`  ✓ Series en memoria: ${stats.tvSeriesCount}`);

// 5. Simulación de comportamiento en /api/resolve
console.log("\n5. Simulando filtrado dinámico en resolución de fuentes...");
const mockProviders = [
  { id: "vimeus", name: "Vimeus", ord: 1, active: true },
  { id: "vidcore", name: "VidCore", ord: 2, active: true },
  { id: "redeflix", name: "RedeFlix", ord: 12, movie_tpl: "https://redeflixapi.store/filme/{id}", active: true, needs_tmdb: true },
];

async function simulateResolve(type, tmdbId) {
  const eligible = [];
  for (const p of mockProviders) {
    if (isRedeflixProvider(p)) {
      const isAvail = await isRedeflixAvailable({ type, tmdbId });
      if (!isAvail) continue;
    }
    eligible.push({ ...p, canonicalName: `S${p.ord}` });
  }
  return eligible;
}

const resolveAvailable = await simulateResolve("movie", "550");
assert.ok(resolveAvailable.some(p => p.id === "redeflix"), "RedeFlix DEBE aparecer para película 550");
assert.equal(resolveAvailable.find(p => p.id === "redeflix").canonicalName, "S12", "RedeFlix conserva su ID canónico S12");

const resolveUnavailable = await simulateResolve("movie", "999999999");
assert.ok(!resolveUnavailable.some(p => p.id === "redeflix"), "RedeFlix NO DEBE aparecer para película no indexada 999999999");
assert.equal(resolveUnavailable.length, 2, "Los demás servidores deben conservarse intactos");
assert.equal(resolveUnavailable[0].canonicalName, "S1", "S1 conserva su nombre canónico");
assert.equal(resolveUnavailable[1].canonicalName, "S2", "S2 conserva su nombre canónico");
console.log("  ✓ Simulación de resolución exitosa: filtrado transparente y nombres canónicos estables");

console.log("\n🎉 TODAS LAS PRUEBAS DE LA SPEC 056 PASARON SATISFACTORIAMENTE.\n");
