/**
 * Suite de Pruebas: Spec 065 - Extracción y Reproducción de Breaking Bad T1 E1
 * Verifica que el extractor de MegaEmbed selecciona el stream funcional (evitando 520)
 * y que el manifiesto HLS sea válido y reproducible.
 *
 * Uso: node scripts/test-breaking-bad-stream.mjs
 */

import { fetchMegaEmbedStream } from "../lib/megaembed.ts";

console.log("=========================================================================");
console.log("🧪 Test Spec 065: Validación de Stream HLS Nativo para Breaking Bad T1E1");
console.log("=========================================================================\n");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✕ FALLÓ: ${message}`);
    failed++;
  }
}

async function run() {
  console.log("1. Extrayendo stream para Breaking Bad por TMDB ID 1396 (T1 E1)...");
  const t0 = Date.now();
  const resTmdb = await fetchMegaEmbedStream({
    id: "1396",
    type: "tv",
    season: 1,
    episode: 1,
  });
  console.log(`   Tiempo de extracción: ${Date.now() - t0}ms`);

  assert(resTmdb !== null && resTmdb.success === true, "Extracción de Breaking Bad exitosa");
  assert(typeof resTmdb?.hlsUrl === "string" && resTmdb.hlsUrl.length > 0, `hlsUrl presente: ${resTmdb?.hlsUrl?.slice(0, 60)}...`);
  assert(Array.isArray(resTmdb?.backupHlsUrls), "backupHlsUrls es un arreglo");

  if (resTmdb?.hlsUrl) {
    console.log("\n2. Comprobando respuesta HTTP del stream HLS principal...");
    const headRes = await fetch(resTmdb.hlsUrl, { method: "HEAD", signal: AbortSignal.timeout(5000) });
    assert(headRes.status === 200, `Stream principal responde con HTTP 200 OK (Código recibido: ${headRes.status})`);

    console.log("\n3. Descargando fragmento de manifiesto HLS (#EXTM3U)...");
    const getRes = await fetch(resTmdb.hlsUrl, { signal: AbortSignal.timeout(5000) });
    const text = await getRes.text();
    assert(text.startsWith("#EXTM3U"), "El contenido recibido es un manifiesto válido #EXTM3U");
    assert(getRes.headers.get("access-control-allow-origin") === "*", "CORS habilitado (Access-Control-Allow-Origin: *)");
  }

  console.log("\n4. Extrayendo stream para Breaking Bad por IMDb ID tt0903747 (T1 E1)...");
  const resImdb = await fetchMegaEmbedStream({
    id: "tt0903747",
    type: "tv",
    season: 1,
    episode: 1,
  });
  assert(resImdb !== null && resImdb.success === true, "Extracción por IMDb ID exitosa");
  if (resImdb?.hlsUrl) {
    const headImdb = await fetch(resImdb.hlsUrl, { method: "HEAD", signal: AbortSignal.timeout(5000) });
    assert(headImdb.status === 200, `Stream por IMDb responde con HTTP 200 OK (Código: ${headImdb.status})`);
  }

  console.log("\n=================================================");
  console.log(`Resumen de Resultados: ${passed} pasados, ${failed} fallidos`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("🎉 ¡Breaking Bad T1E1 verificado y listo para reproducir nativamente!");
    process.exit(0);
  }
}

run().catch((err) => {
  console.error("Error fatal en test:", err);
  process.exit(1);
});
