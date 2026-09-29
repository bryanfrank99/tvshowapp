import assert from "node:assert";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("==========================================================================");
console.log("🧪 TESTING SPEC 060: DUAL ID CATALOG AVAILABILITY (IMDb & TMDB)");
console.log("==========================================================================");

const modulePath = pathToFileURL(path.join(rootDir, "lib", "redeflix-availability.ts")).href;
const {
  isProbeUrl,
  normalizeProbeUrl,
  interpolateProbeUrl,
  isRedeflixAvailable,
  checkCatalogAvailability,
  clearRedeflixCache,
  getRedeflixMovieSet,
  getRedeflixTvMap,
} = await import(modulePath);

clearRedeflixCache();

// 1. Detección y normalización con IMDb y TMDB
console.log("\n1. Verificando detección y normalización con IMDb y TMDB...");
assert.strictEqual(isProbeUrl("https://api.example.com/movie/{imdb}"), true, "Debe detectar {imdb}");
assert.strictEqual(isProbeUrl("https://api.example.com/movie/{tmdb}"), true, "Debe detectar {tmdb}");
assert.strictEqual(isProbeUrl("https://api.example.com/movie/{id}"), true, "Debe detectar {id}");
assert.strictEqual(isProbeUrl("https://api.example.com/movie/tt6263850"), true, "Debe detectar URL puntual con tt (IMDb)");
assert.strictEqual(isProbeUrl("https://api.example.com/movie/969681"), true, "Debe detectar URL puntual con ID numérico (TMDB)");
assert.strictEqual(isProbeUrl("https://api.example.com/tv/tt0903747/1/1"), true, "Debe detectar serie puntual con tt (IMDb)");

assert.strictEqual(
  normalizeProbeUrl("https://api.example.com/movie/tt6263850", "movie"),
  "https://api.example.com/movie/{imdb}",
  "Debe normalizar path con tt a {imdb}"
);

assert.strictEqual(
  normalizeProbeUrl("https://api.example.com/movie/969681", "movie"),
  "https://api.example.com/movie/{id}",
  "Debe normalizar path numérico a {id}"
);

assert.strictEqual(
  normalizeProbeUrl("https://api.example.com/tv/tt0903747/1/2", "tv"),
  "https://api.example.com/tv/{imdb}/{s}/{e}",
  "Debe normalizar tv con tt a {imdb}/{s}/{e}"
);
console.log("  ✓ Detección y normalización validadas");

// 2. Interpolación con IMDb, TMDB o Ambos
console.log("\n2. Verificando interpolación con IMDb, TMDB y formato dual...");

// Placeholder específico {imdb}
const urlImdb = interpolateProbeUrl("https://api.example.com/movie/{imdb}", {
  id: "969681",
  tmdbId: "969681",
  imdbId: "tt6263850",
});
assert.strictEqual(urlImdb, "https://api.example.com/movie/tt6263850", "Debe interpolar {imdb} con tt6263850");

// Placeholder específico {tmdb}
const urlTmdb = interpolateProbeUrl("https://api.example.com/movie/{tmdb}", {
  id: "969681",
  tmdbId: "969681",
  imdbId: "tt6263850",
});
assert.strictEqual(urlTmdb, "https://api.example.com/movie/969681", "Debe interpolar {tmdb} con 969681");

// Placeholder dual: {tmdb} y {imdb} en una misma URL
const urlDual = interpolateProbeUrl("https://api.example.com/check?tmdb={tmdb}&imdb={imdb}&season={s}&episode={e}", {
  id: "1396",
  tmdbId: "1396",
  imdbId: "tt0903747",
  season: 2,
  episode: 4,
});
assert.strictEqual(
  urlDual,
  "https://api.example.com/check?tmdb=1396&imdb=tt0903747&season=2&episode=4",
  "Debe interpolar simultáneamente {tmdb}, {imdb}, {s}, {e}"
);

// Fallback genérico {id} si provider necesita TMDB vs IMDb
const urlIdWithTmdb = interpolateProbeUrl("https://api.example.com/movie/{id}", {
  tmdbId: "969681",
  imdbId: "tt6263850",
  needsTmdb: true,
});
assert.strictEqual(urlIdWithTmdb, "https://api.example.com/movie/969681", "{id} debe usar tmdbId cuando needsTmdb=true");

const urlIdWithImdb = interpolateProbeUrl("https://api.example.com/movie/{id}", {
  tmdbId: "969681",
  imdbId: "tt6263850",
  needsTmdb: false,
});
assert.strictEqual(urlIdWithImdb, "https://api.example.com/movie/tt6263850", "{id} debe usar imdbId cuando needsTmdb=false");
console.log("  ✓ Interpolación dual y placeholders específicos validados");

// 3. Verificando disponibilidad con WatchPlay (Probe URL TMDB)
console.log("\n3. Comprobando Probe URL con TMDB e IMDb...");
const wpCheck = await isRedeflixAvailable({
  type: "movie",
  tmdbId: "969681",
  imdbId: "tt6263850",
  movieListUrl: "https://v2.watchplay.shop/movie/{tmdb}",
});
console.log("  WatchPlay con {tmdb}=969681 disponible:", wpCheck);
assert.strictEqual(wpCheck, true, "WatchPlay debe responder true con {tmdb}");

// 4. Verificación de coincidencia en lote (TXT y JSON con TMDB e IMDb)
console.log("\n4. Verificando coincidencia en catálogos de lote por TMDB e IMDb...");
// Simular un mock de fetch para comprobar getRedeflixMovieSet con JSON mixto
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async (url) => {
    if (url.includes("mock-mixed-movies.json")) {
      const data = [
        { tmdb_id: 1111, imdb_id: "tt1111111" },
        { id_tmdb: 2222, id_imdb: "tt2222222" },
        { id: "tt3333333" }, // solo IMDb
        { id: 4444 },         // solo TMDB
      ];
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(data),
        json: async () => data,
      };
    }
    if (url.includes("mock-mixed-tv.json")) {
      const data = [
        { tmdb_id: 5555, imdb_id: "tt5555555", episodios: { "1": { "2": "ep_url" } } },
        { id_imdb: "tt6666666", episodios: { "2": { "3": "ep_url" } } },
      ];
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(data),
        json: async () => data,
      };
    }
    return originalFetch(url);
  };

  const movieSet = await getRedeflixMovieSet("https://fake.domain/mock-mixed-movies.json");
  assert.strictEqual(movieSet.has("1111"), true, "Debe indexar tmdb_id 1111");
  assert.strictEqual(movieSet.has("tt1111111"), true, "Debe indexar imdb_id tt1111111");
  assert.strictEqual(movieSet.has("2222"), true, "Debe indexar id_tmdb 2222");
  assert.strictEqual(movieSet.has("tt2222222"), true, "Debe indexar id_imdb tt2222222");
  assert.strictEqual(movieSet.has("tt3333333"), true, "Debe indexar id tt3333333");
  assert.strictEqual(movieSet.has("4444"), true, "Debe indexar id 4444");
  console.log("  ✓ Catálogo de películas indexó correctamente tanto TMDB como IMDb");

  const tvMap = await getRedeflixTvMap({ tvUrl: "https://fake.domain/mock-mixed-tv.json" });
  assert.strictEqual(tvMap.has("5555"), true, "Debe indexar TMDB tv 5555");
  assert.strictEqual(tvMap.has("tt5555555"), true, "Debe indexar IMDb tv tt5555555");
  assert.strictEqual(tvMap.has("tt6666666"), true, "Debe indexar IMDb tv tt6666666");
  assert.strictEqual(Boolean(tvMap.get("5555")?.["1"]?.["2"]), true, "Debe contener S1E2 en 5555");
  assert.strictEqual(Boolean(tvMap.get("tt6666666")?.["2"]?.["3"]), true, "Debe contener S2E3 en tt6666666");
  console.log("  ✓ Catálogo de series indexó correctamente tanto TMDB como IMDb");

  // 5. Verificando isRedeflixAvailable con catálogo mixto consultando por TMDB o por IMDb
  const availByTmdb = await isRedeflixAvailable({
    type: "movie",
    tmdbId: "1111",
    movieListUrl: "https://fake.domain/mock-mixed-movies.json",
  });
  assert.strictEqual(availByTmdb, true, "Debe encontrar película usando solo tmdbId");

  const availByImdb = await isRedeflixAvailable({
    type: "movie",
    imdbId: "tt1111111",
    movieListUrl: "https://fake.domain/mock-mixed-movies.json",
  });
  assert.strictEqual(availByImdb, true, "Debe encontrar película usando solo imdbId");

  const availTvByImdb = await checkCatalogAvailability({
    type: "tv",
    imdbId: "tt6666666",
    season: 2,
    episode: 3,
    tvListUrl: "https://fake.domain/mock-mixed-tv.json",
  });
  assert.strictEqual(availTvByImdb, true, "Debe encontrar serie usando imdbId");

  console.log("  ✓ Búsqueda cruzada por TMDB o IMDb verificada con éxito");
} finally {
  globalThis.fetch = originalFetch;
}

console.log("\n==========================================================================");
console.log("✅ ALL DUAL ID CATALOG AVAILABILITY TESTS PASSED SUCCESSFULLY!");
console.log("==========================================================================");
