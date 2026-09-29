import assert from "node:assert";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("==========================================================================");
console.log("🧪 TESTING SPEC 059: FLEXIBLE CATALOG AVAILABILITY CHECK (PROBE & JSON & TXT)");
console.log("==========================================================================");

const modulePath = pathToFileURL(path.join(rootDir, "lib", "redeflix-availability.ts")).href;
const {
  isProbeUrl,
  normalizeProbeUrl,
  interpolateProbeUrl,
  isRedeflixAvailable,
  checkCatalogAvailability,
  isRedeflixProvider,
  clearRedeflixCache,
} = await import(modulePath);

// Limpiar cachés antes de comenzar
clearRedeflixCache();

// 1. Verificación de utilidades de detección y normalización
console.log("\n1. Verificando detección y normalización de Probe URLs...");
assert.strictEqual(isProbeUrl("https://v2.watchplay.shop/movie/{id}"), true, "Debe detectar {id}");
assert.strictEqual(isProbeUrl("https://v2.watchplay.shop/tvshow/{id}/{s}/{e}"), true, "Debe detectar {id}/{s}/{e}");
assert.strictEqual(isProbeUrl("https://v2.watchplay.shop/movie/969681"), true, "Debe detectar URL puntual con ID numérico");
assert.strictEqual(isProbeUrl("https://v2.watchplay.shop/tvshow/1396/1/1"), true, "Debe detectar URL puntual con serie/temp/ep");
assert.strictEqual(isProbeUrl("https://redeflixapi.store/list-movie-ids.txt"), false, "TXT en lote no debe ser probe");
assert.strictEqual(isProbeUrl("https://redeflixapi.store/list-tv-ids.txt"), false, "JSON en lote no debe ser probe");
console.log("  ✓ Detección de Probe URLs correcta");

// Normalización
assert.strictEqual(
  normalizeProbeUrl("https://v2.watchplay.shop/movie/969681", "movie"),
  "https://v2.watchplay.shop/movie/{id}",
  "Debe normalizar /movie/969681 a /movie/{id}"
);
assert.strictEqual(
  normalizeProbeUrl("https://v2.watchplay.shop/tvshow/1396/1/1", "tv"),
  "https://v2.watchplay.shop/tvshow/{id}/{s}/{e}",
  "Debe normalizar /tvshow/1396/1/1 a /tvshow/{id}/{s}/{e}"
);

// Interpolación
assert.strictEqual(
  interpolateProbeUrl("https://v2.watchplay.shop/movie/{id}", { id: "969681" }),
  "https://v2.watchplay.shop/movie/969681",
  "Debe interpolar {id}"
);
assert.strictEqual(
  interpolateProbeUrl("https://v2.watchplay.shop/tvshow/{id}/{s}/{e}", { id: "1396", season: 2, episode: 5 }),
  "https://v2.watchplay.shop/tvshow/1396/2/5",
  "Debe interpolar {id}/{s}/{e}"
);
// Si se le pasa el enlace puntual de ejemplo directamente, debe interpolar correctamente el ID solicitado
assert.strictEqual(
  interpolateProbeUrl("https://v2.watchplay.shop/movie/969681", { id: "12345" }),
  "https://v2.watchplay.shop/movie/12345",
  "Debe reemplazar el ID de ejemplo por el ID solicitado"
);
console.log("  ✓ Normalización e interpolación validadas");

// 2. Comprobación real de Probe URL en Películas (WatchPlay)
console.log("\n2. Comprobando Probe URL real para Películas (https://v2.watchplay.shop/movie/{id})...");

const isAvailableMovie = await isRedeflixAvailable({
  type: "movie",
  tmdbId: "969681",
  movieListUrl: "https://v2.watchplay.shop/movie/{id}",
});
console.log("  TMDB 969681 disponible en WatchPlay:", isAvailableMovie);
assert.strictEqual(isAvailableMovie, true, "TMDB 969681 debe estar disponible en WatchPlay");

const isUnavailableMovie = await isRedeflixAvailable({
  type: "movie",
  tmdbId: "9999999999999",
  movieListUrl: "https://v2.watchplay.shop/movie/{id}",
});
console.log("  TMDB 9999999999999 disponible en WatchPlay:", isUnavailableMovie);
assert.strictEqual(isUnavailableMovie, false, "ID inexistente debe reportarse como NO disponible");

// 3. Comprobación real de Probe URL en Series (WatchPlay)
console.log("\n3. Comprobando Probe URL real para Series (https://v2.watchplay.shop/tvshow/{id}/{s}/{e})...");

const isAvailableTv = await checkCatalogAvailability({
  type: "tv",
  tmdbId: "1396",
  season: 1,
  episode: 1,
  tvListUrl: "https://v2.watchplay.shop/tvshow/{id}/{s}/{e}",
});
console.log("  TMDB 1396 T1E1 disponible en WatchPlay:", isAvailableTv);
assert.strictEqual(isAvailableTv, true, "TMDB 1396 T1E1 (Breaking Bad) debe estar disponible");

const isUnavailableTv = await checkCatalogAvailability({
  type: "tv",
  tmdbId: "9999999999999",
  season: 1,
  episode: 1,
  tvListUrl: "https://v2.watchplay.shop/tvshow/{id}/{s}/{e}",
});
console.log("  TMDB 9999999999999 T1E1 disponible en WatchPlay:", isUnavailableTv);
assert.strictEqual(isUnavailableTv, false, "Serie inexistente debe reportarse como NO disponible");

// 4. Verificación de probe con link puntual de ejemplo directo
console.log("\n4. Comprobando con URLs puntuales directas ingresadas por el usuario...");
const isAvailableFromDirectUrl = await isRedeflixAvailable({
  type: "movie",
  tmdbId: "969681",
  movieListUrl: "https://v2.watchplay.shop/movie/969681",
});
assert.strictEqual(isAvailableFromDirectUrl, true, "Debe soportar URL con ID de ejemplo directo");
console.log("  ✓ URLs directas de ejemplo soportadas sin fricción");

// 5. Verificación de detección de proveedor
console.log("\n5. Verificando isRedeflixProvider con Probe URLs...");
assert.strictEqual(
  isRedeflixProvider({ id: "custom1", movie_list_url: "https://v2.watchplay.shop/movie/{id}" }),
  true,
  "Proveedor con Probe URL debe ser detectado como activo para verificación de catálogo"
);
console.log("  ✓ Detección de proveedor exitosa");

console.log("\n==========================================================================");
console.log("🎉 TODAS LAS PRUEBAS DE LA SPEC 059 PASARON SATISFACTORIAMENTE.");
console.log("==========================================================================\n");
