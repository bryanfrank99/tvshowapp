import { fetchWatchPlayStream } from "../lib/watchplay.ts";

async function runTests() {
  console.log("=================================================");
  console.log("   TEST SUITE: WATCHPLAY NATIVE STREAM EXTRACTOR ");
  console.log("=================================================\n");

  let passes = 0;
  let failures = 0;

  // Test 1: Película existente (Fight Club - TMDB 550)
  console.log("TEST 1: Extrayendo stream HLS para película (Fight Club TMDB 550)...");
  try {
    const movieRes = await fetchWatchPlayStream({
      id: "550",
      type: "movie",
    });

    if (movieRes && movieRes.success && movieRes.hlsUrl) {
      console.log("  [PASS] Stream HLS obtenido:", movieRes.hlsUrl.slice(0, 75) + "...");
      passes++;

      // Verificar conectividad y CORS de la playlist m3u8
      console.log("  Verificando conectividad y cabeceras CORS de la playlist fMP4...");
      const hlsCheck = await fetch(movieRes.hlsUrl);
      const cors = hlsCheck.headers.get("access-control-allow-origin");
      const ctype = hlsCheck.headers.get("content-type");

      if (hlsCheck.status === 200 && cors === "*") {
        console.log(`  [PASS] HTTP ${hlsCheck.status}, Content-Type: ${ctype}, CORS: ${cors}`);
        passes++;
      } else {
        console.error(`  [FAIL] Playlist no válida: HTTP ${hlsCheck.status}, CORS: ${cors}`);
        failures++;
      }
    } else {
      console.error("  [FAIL] No se obtuvo stream para película TMDB 550:", movieRes);
      failures++;
    }
  } catch (err) {
    console.error("  [FAIL] Error inesperado en TEST 1:", err.message);
    failures++;
  }

  // Test 2: Episodio de Serie existente (Breaking Bad T01E01 - TMDB 1396)
  console.log("\nTEST 2: Extrayendo stream HLS para serie (Breaking Bad TMDB 1396 T01E01)...");
  try {
    const tvRes = await fetchWatchPlayStream({
      id: "1396",
      type: "tv",
      season: 1,
      episode: 1,
    });

    if (tvRes && tvRes.success && tvRes.hlsUrl) {
      console.log("  [PASS] Stream TV obtenido:", tvRes.hlsUrl.slice(0, 75) + "...");
      console.log("  Idioma asignado:", tvRes.lang);
      passes++;

      // Verificar conectividad y CORS
      const hlsCheck = await fetch(tvRes.hlsUrl);
      const cors = hlsCheck.headers.get("access-control-allow-origin");
      if (hlsCheck.status === 200 && cors === "*") {
        console.log(`  [PASS] HTTP ${hlsCheck.status}, CORS: ${cors}`);
        passes++;
      } else {
        console.error(`  [FAIL] Playlist de serie no válida: HTTP ${hlsCheck.status}, CORS: ${cors}`);
        failures++;
      }
    } else {
      console.error("  [FAIL] No se obtuvo stream para serie TMDB 1396 S01E01:", tvRes);
      failures++;
    }
  } catch (err) {
    console.error("  [FAIL] Error inesperado en TEST 2:", err.message);
    failures++;
  }

  // Test 3: ID Inexistente (Manejo seguro sin colapso)
  console.log("\nTEST 3: Probando ID inexistente (999999999)...");
  try {
    const invalidRes = await fetchWatchPlayStream({
      id: "999999999",
      type: "movie",
    });

    if (!invalidRes || !invalidRes.success) {
      console.log("  [PASS] ID inexistente manejado correctamente retornando fallo controlado");
      passes++;
    } else {
      console.error("  [FAIL] Se esperaba fallo pero devolvió éxito:", invalidRes);
      failures++;
    }
  } catch (err) {
    console.error("  [FAIL] Error en TEST 3:", err.message);
    failures++;
  }

  console.log("\n=================================================");
  console.log(` RESULTADOS: ${passes} PASARON, ${failures} FALLARON`);
  console.log("=================================================");

  if (failures > 0) {
    process.exit(1);
  }
}

runTests();
