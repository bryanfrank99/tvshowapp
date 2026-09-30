/**
 * Suite de Pruebas: Spec 064 - Bypass de Cloudflare 403 para Catálogo MegaEmbed
 * Valida que ante un error HTTP 403 (o desconexión directa) en la descarga de catálogo,
 * el sistema recurre de forma transparente a la copia persistente en Supabase.
 *
 * Uso: node scripts/test-mgeb-cloudflare-bypass.mjs
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Cargar variables de entorno
for (const envFile of [".env.local", ".env"]) {
  const p = join(root, envFile);
  if (existsSync(p)) {
    const lines = readFileSync(p, "utf8").split("\n");
    for (const line of lines) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
      }
    }
  }
}

const {
  isRedeflixAvailable,
  getRedeflixMovieSet,
  getRedeflixTvMap,
  clearRedeflixCache,
} = await import("../lib/redeflix-availability.ts");

console.log("===================================================================");
console.log("🧪 Test Spec 064: Resiliencia Cloudflare 403 MegaEmbed Availability");
console.log("===================================================================\n");

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

// Limpiar cachés antes de comenzar
clearRedeflixCache();

// -------------------------------------------------------------
// TEST 1: Simulación de Bloqueo Cloudflare 403 en Películas
// -------------------------------------------------------------
console.log("TEST 1: Simulación de bloqueo Cloudflare 403 al solicitar películas");
const originalFetch = globalThis.fetch;

// Interceptamos fetch solo hacia el hostname de mgeb.top o megaembed.com
globalThis.fetch = async (url, options) => {
  let hostname = "";
  try {
    const u = typeof url === "string" ? new URL(url) : url instanceof URL ? url : new URL(url.url);
    hostname = u.hostname;
  } catch {}

  if (hostname.includes("mgeb.top") || hostname.includes("megaembed.com")) {
    return new Response(
      "<!DOCTYPE html><html><head><title>Just a moment...</title></head><body>Cloudflare 403 Challenge</body></html>",
      {
        status: 403,
        statusText: "Forbidden",
        headers: { "Content-Type": "text/html" },
      }
    );
  }
  return originalFetch(url, options);
};

try {
  const movieSet = await getRedeflixMovieSet("https://mgeb.top/api/movie");
  assert(movieSet.size > 10000, `movieSet recuperó ${movieSet.size.toLocaleString()} películas desde Supabase tras 403`);
  assert(movieSet.has("969681"), "movieSet contiene TMDB 969681 (caso de prueba válido admin)");
  assert(movieSet.has("693134"), "movieSet contiene TMDB 693134 (Dune 2)");
  assert(!movieSet.has("999999999"), "movieSet NO contiene TMDB ficticio 999999999");
} catch (e) {
  assert(false, `Excepción inesperada en TEST 1: ${e.message}`);
}

// -------------------------------------------------------------
// TEST 2: Simulación de Bloqueo Cloudflare 403 en Series
// -------------------------------------------------------------
console.log("\nTEST 2: Simulación de bloqueo Cloudflare 403 al solicitar series");
try {
  const tvMap = await getRedeflixTvMap({ tvUrl: "https://mgeb.top/api/series" });
  assert(tvMap.size > 5000, `tvMap recuperó ${tvMap.size.toLocaleString()} series desde Supabase tras 403`);
  assert(tvMap.has("1396"), "tvMap contiene TMDB 1396 (Breaking Bad - caso válido admin)");
  assert(tvMap.has("61585"), "tvMap contiene TMDB 61585");
  assert(!tvMap.has("999999999"), "tvMap NO contiene serie ficticia 999999999");
} catch (e) {
  assert(false, `Excepción inesperada en TEST 2: ${e.message}`);
}

// -------------------------------------------------------------
// TEST 3: Evaluación Completa con isRedeflixAvailable (Modo 403 Activo)
// -------------------------------------------------------------
console.log("\nTEST 3: Verificación con isRedeflixAvailable bajo 403 Cloudflare");
try {
  // Película válida (TMDB 969681)
  const validMovie = await isRedeflixAvailable({
    type: "movie",
    tmdbId: "969681",
    movieListUrl: "https://mgeb.top/api/movie",
  });
  assert(validMovie === true, "Película válida 969681 retorna available: true");

  // Película ficticia (TMDB 999999999)
  const invalidMovie = await isRedeflixAvailable({
    type: "movie",
    tmdbId: "999999999",
    movieListUrl: "https://mgeb.top/api/movie",
  });
  assert(invalidMovie === false, "Película ficticia 999999999 retorna available: false");

  // Serie válida (TMDB 1396 T1E1)
  const validTv = await isRedeflixAvailable({
    type: "tv",
    tmdbId: "1396",
    season: 1,
    episode: 1,
    tvListUrl: "https://mgeb.top/api/series",
  });
  assert(validTv === true, "Serie válida 1396 T1E1 retorna available: true");

  // Serie ficticia (TMDB 999999999)
  const invalidTv = await isRedeflixAvailable({
    type: "tv",
    tmdbId: "999999999",
    season: 99,
    episode: 99,
    tvListUrl: "https://mgeb.top/api/series",
  });
  assert(invalidTv === false, "Serie ficticia 999999999 retorna available: false");
} catch (e) {
  assert(false, `Excepción en TEST 3: ${e.message}`);
}

// Restaurar fetch original
globalThis.fetch = originalFetch;

console.log("\n=================================================");
console.log(`Resumen de Resultados: ${passed} pasados, ${failed} fallidos`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 ¡Todos los tests de resiliencia Cloudflare pasaron con éxito!");
  process.exit(0);
}
