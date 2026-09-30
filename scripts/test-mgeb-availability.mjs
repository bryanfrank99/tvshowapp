import {
  getRedeflixMovieSet,
  getRedeflixTvMap,
  isRedeflixAvailable,
} from "../lib/redeflix-availability.ts";

async function runTests() {
  console.log("====================================================");
  console.log("  TEST SUITE: MGEB.TOP CATALOG AVAILABILITY CHECK   ");
  console.log("====================================================\n");

  let passes = 0;
  let failures = 0;

  // TEST 1: Catálogo de Películas (https://mgeb.top/api/movie)
  console.log("TEST 1: Descargando catálogo de películas (https://mgeb.top/api/movie)...");
  try {
    const movieSet = await getRedeflixMovieSet("https://mgeb.top/api/movie");
    console.log(`  Total películas detectadas: ${movieSet.size}`);

    if (movieSet.size > 10000 && movieSet.has("693134")) {
      console.log("  [PASS] Catálogo parseado correctamente con >10,000 títulos y Dune 2 (693134) presente");
      passes++;
    } else {
      console.error("  [FAIL] Catálogo de películas vacío o no contiene 693134");
      failures++;
    }
  } catch (err) {
    console.error("  [FAIL] Error en TEST 1:", err.message);
    failures++;
  }

  // TEST 2: Catálogo de Series (https://mgeb.top/api/series)
  console.log("\nTEST 2: Descargando catálogo de series (https://mgeb.top/api/series)...");
  try {
    const tvMap = await getRedeflixTvMap({ tvUrl: "https://mgeb.top/api/series" });
    console.log(`  Total series detectadas: ${tvMap.size}`);

    if (tvMap.size > 5000 && tvMap.has("100088") && tvMap.has("1396")) {
      console.log("  [PASS] Catálogo parseado correctamente con >5,000 series, The Last of Us (100088) y Breaking Bad (1396) presentes");
      passes++;
    } else {
      console.error("  [FAIL] Catálogo de series vacío o incompleto");
      failures++;
    }
  } catch (err) {
    console.error("  [FAIL] Error en TEST 2:", err.message);
    failures++;
  }

  // TEST 3: Verificación Dual de Películas con isRedeflixAvailable
  console.log("\nTEST 3: Verificación de disponibilidad de películas...");
  try {
    const validMovie = await isRedeflixAvailable({
      type: "movie",
      tmdbId: "693134",
      movieListUrl: "https://mgeb.top/api/movie",
      needsTmdb: true,
    });

    const invalidMovie = await isRedeflixAvailable({
      type: "movie",
      tmdbId: "999999999",
      movieListUrl: "https://mgeb.top/api/movie",
      needsTmdb: true,
    });

    if (validMovie === true && invalidMovie === false) {
      console.log("  [PASS] Película existente (693134) -> true | Película inexistente (999999999) -> false");
      passes++;
    } else {
      console.error(`  [FAIL] Falló verificación de películas: valid=${validMovie}, invalid=${invalidMovie}`);
      failures++;
    }
  } catch (err) {
    console.error("  [FAIL] Error en TEST 3:", err.message);
    failures++;
  }

  // TEST 4: Verificación Dual de Series con isRedeflixAvailable (Soportando comodín *)
  console.log("\nTEST 4: Verificación de disponibilidad de series...");
  try {
    const validTv = await isRedeflixAvailable({
      type: "tv",
      tmdbId: "100088",
      season: 1,
      episode: 1,
      tvListUrl: "https://mgeb.top/api/series",
      needsTmdb: true,
    });

    const invalidTv = await isRedeflixAvailable({
      type: "tv",
      tmdbId: "999999999",
      season: 1,
      episode: 1,
      tvListUrl: "https://mgeb.top/api/series",
      needsTmdb: true,
    });

    if (validTv === true && invalidTv === false) {
      console.log("  [PASS] Serie existente (100088 T1E1) -> true | Serie inexistente (999999999) -> false");
      passes++;
    } else {
      console.error(`  [FAIL] Falló verificación de series: valid=${validTv}, invalid=${invalidTv}`);
      failures++;
    }
  } catch (err) {
    console.error("  [FAIL] Error en TEST 4:", err.message);
    failures++;
  }

  console.log("\n====================================================");
  console.log(` RESULTADOS: ${passes} PASARON, ${failures} FALLARON`);
  console.log("====================================================");

  if (failures > 0) {
    process.exit(1);
  }
}

runTests();
