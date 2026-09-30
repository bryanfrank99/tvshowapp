import { fetchMegaEmbedStream } from "../lib/megaembed.ts";

async function runTests() {
  console.log("=================================================");
  console.log("   TEST SUITE: MEGAEMBED NATIVE STREAM EXTRACTOR ");
  console.log("=================================================\n");

  let passes = 0;
  let failures = 0;

  // Test 1: Película existente (Dune Parte 2 - IMDb tt15239678 / TMDB 969681)
  console.log("TEST 1: Extrayendo stream HLS para película (tt15239678)...");
  try {
    const movieRes = await fetchMegaEmbedStream({
      id: "tt15239678",
      type: "movie",
    });

    if (movieRes && movieRes.success && movieRes.hlsUrl) {
      console.log("  [PASS] Stream HLS obtenido:", movieRes.hlsUrl.slice(0, 75) + "...");
      passes++;

      // Verificar conectividad y CORS del stream
      console.log("  Verificando conectividad y cabeceras CORS de la playlist maestra...");
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
      console.error("  [FAIL] No se obtuvo stream para película tt15239678");
      failures++;
    }
  } catch (err) {
    console.error("  [FAIL] Error inesperado en TEST 1:", err.message);
    failures++;
  }

  // Test 2: Episodio de Serie existente (The Last of Us S01E01 - IMDb tt3581920)
  console.log("\nTEST 2: Extrayendo stream HLS para serie (tt3581920 T01E01)...");
  try {
    const tvRes = await fetchMegaEmbedStream({
      id: "tt3581920",
      type: "tv",
      season: 1,
      episode: 1,
    });

    if (tvRes && tvRes.success && tvRes.hlsUrl) {
      console.log("  [PASS] Stream TV obtenido:", tvRes.hlsUrl.slice(0, 75) + "...");
      console.log("  Total de fuentes detectadas:", tvRes.allSources?.length || 0);
      passes++;
    } else {
      console.error("  [FAIL] No se obtuvo stream para serie tt3581920 S01E01");
      failures++;
    }
  } catch (err) {
    console.error("  [FAIL] Error inesperado en TEST 2:", err.message);
    failures++;
  }

  // Test 3: ID Inexistente (Manejo seguro sin colapso)
  console.log("\nTEST 3: Probando ID inexistente (tt999999999)...");
  try {
    const invalidRes = await fetchMegaEmbedStream({
      id: "tt999999999",
      type: "movie",
    });

    if (!invalidRes || !invalidRes.success) {
      console.log("  [PASS] ID inexistente manejado correctamente retornando null/fallo controlado");
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
