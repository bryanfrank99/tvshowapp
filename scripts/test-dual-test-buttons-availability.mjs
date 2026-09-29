import assert from "node:assert";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("==========================================================================");
console.log("🧪 TESTING: DUAL TEST BUTTONS (VALID & INVALID) FOR CATALOG AVAILABILITY");
console.log("==========================================================================");

const modulePath = pathToFileURL(path.join(rootDir, "lib", "redeflix-availability.ts")).href;
const {
  isProbeUrl,
  interpolateProbeUrl,
  isRedeflixAvailable,
  checkCatalogAvailability,
  clearRedeflixCache,
} = await import(modulePath);

clearRedeflixCache();

// 1. Simulación de la lógica de test_availability de la API para Películas
console.log("\n1. Probando casos Válido e Inválido en Probe URL de Películas (WatchPlay)...");

const movieProbeUrl = "https://v2.watchplay.shop/movie/{id}";

// Caso VÁLIDO: Película real (TMDB 969681)
const validMovieTarget = interpolateProbeUrl(movieProbeUrl, {
  id: "969681",
  tmdbId: "969681",
  imdbId: "tt6263850",
});
assert.strictEqual(validMovieTarget, "https://v2.watchplay.shop/movie/969681");

const validMovieAvail = await isRedeflixAvailable({
  type: "movie",
  tmdbId: "969681",
  imdbId: "tt6263850",
  movieListUrl: movieProbeUrl,
});
console.log("  [Test Válido] Película 969681 disponible:", validMovieAvail);
assert.strictEqual(validMovieAvail, true, "El caso válido debe retornar disponible=true");

// Caso INVÁLIDO: Película ficticia (TMDB 999999999)
const invalidMovieTarget = interpolateProbeUrl(movieProbeUrl, {
  id: "999999999",
  tmdbId: "999999999",
  imdbId: "tt999999999",
});
assert.strictEqual(invalidMovieTarget, "https://v2.watchplay.shop/movie/999999999");

const invalidMovieAvail = await isRedeflixAvailable({
  type: "movie",
  tmdbId: "999999999",
  imdbId: "tt999999999",
  movieListUrl: movieProbeUrl,
});
console.log("  [Test Inválido] Película 999999999 disponible:", invalidMovieAvail);
assert.strictEqual(invalidMovieAvail, false, "El caso inválido debe retornar disponible=false (404)");

// 2. Simulación de la lógica de test_availability de la API para Series
console.log("\n2. Probando casos Válido e Inválido en Probe URL de Series (WatchPlay)...");

const tvProbeUrl = "https://v2.watchplay.shop/tvshow/{id}/{s}/{e}";

// Caso VÁLIDO: Serie real Breaking Bad T1E1 (TMDB 1396)
const validTvTarget = interpolateProbeUrl(tvProbeUrl, {
  id: "1396",
  tmdbId: "1396",
  imdbId: "tt0903747",
  season: 1,
  episode: 1,
});
assert.strictEqual(validTvTarget, "https://v2.watchplay.shop/tvshow/1396/1/1");

const validTvAvail = await checkCatalogAvailability({
  type: "tv",
  tmdbId: "1396",
  imdbId: "tt0903747",
  season: 1,
  episode: 1,
  tvListUrl: tvProbeUrl,
});
console.log("  [Test Válido] Serie 1396 T1E1 disponible:", validTvAvail);
assert.strictEqual(validTvAvail, true, "El caso válido para serie debe retornar disponible=true");

// Caso INVÁLIDO: Serie ficticia T99E99 (TMDB 999999999)
const invalidTvTarget = interpolateProbeUrl(tvProbeUrl, {
  id: "999999999",
  tmdbId: "999999999",
  imdbId: "tt999999999",
  season: 99,
  episode: 99,
});
assert.strictEqual(invalidTvTarget, "https://v2.watchplay.shop/tvshow/999999999/99/99");

const invalidTvAvail = await checkCatalogAvailability({
  type: "tv",
  tmdbId: "999999999",
  imdbId: "tt999999999",
  season: 99,
  episode: 99,
  tvListUrl: tvProbeUrl,
});
console.log("  [Test Inválido] Serie 999999999 T99E99 disponible:", invalidTvAvail);
assert.strictEqual(invalidTvAvail, false, "El caso inválido para serie debe retornar disponible=false (404)");

// 3. Prueba específica con API JSON de MegaEmbed (el caso del usuario)
console.log("\n3. Probando Probe URL API JSON (MegaEmbed) en Películas y Series...");

const megaembedMovieUrl = "https://megaembedapi.site/api/status?imdb={imdb}&type=movie";

// Test Válido MegaEmbed Película
const megaValidMovie = await isRedeflixAvailable({
  type: "movie",
  tmdbId: "969681",
  imdbId: "tt6263850",
  movieListUrl: megaembedMovieUrl,
});
console.log("  [MegaEmbed Movie Válido] tt6263850 disponible:", megaValidMovie);
assert.strictEqual(megaValidMovie, true, "MegaEmbed con tt6263850 debe retornar disponible=true");

// Test Inválido MegaEmbed Película
const megaInvalidMovie = await isRedeflixAvailable({
  type: "movie",
  tmdbId: "999999999",
  imdbId: "tt999999999",
  movieListUrl: megaembedMovieUrl,
});
console.log("  [MegaEmbed Movie Inválido] tt999999999 disponible:", megaInvalidMovie);
assert.strictEqual(megaInvalidMovie, false, "MegaEmbed con tt999999999 debe retornar disponible=false");

// Test Válido e Inválido MegaEmbed Serie
const megaembedTvUrl = "https://megaembedapi.site/api/status?imdb={imdb}&type=tv&sea={s}&epi={e}";

const megaValidTv = await checkCatalogAvailability({
  type: "tv",
  tmdbId: "1396",
  imdbId: "tt0903747",
  season: 1,
  episode: 1,
  tvListUrl: megaembedTvUrl,
});
console.log("  [MegaEmbed TV Válido] tt0903747 S1E1 disponible:", megaValidTv);
assert.strictEqual(megaValidTv, true, "MegaEmbed TV con Breaking Bad S1E1 debe retornar disponible=true");

const megaInvalidTv = await checkCatalogAvailability({
  type: "tv",
  tmdbId: "999999999",
  imdbId: "tt999999999",
  season: 99,
  episode: 99,
  tvListUrl: megaembedTvUrl,
});
console.log("  [MegaEmbed TV Inválido] tt999999999 S99E99 disponible:", megaInvalidTv);
assert.strictEqual(megaInvalidTv, false, "MegaEmbed TV con ID ficticio debe retornar disponible=false");

console.log("\n==========================================================================");
console.log("✅ AMBOS BOTONES DE TEST (VÁLIDO E INVÁLIDO) Y JSON API VERIFICADOS CON ÉXITO!");
console.log("==========================================================================");
