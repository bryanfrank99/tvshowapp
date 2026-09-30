/**
 * Script para sincronizar el catálogo de MegaEmbed (mgeb.top) directamente en Supabase (config).
 * Esto permite que el entorno de producción (Vercel) acceda a los catálogos sin ser bloqueado
 * por Cloudflare Bot Management (HTTP 403 Forbidden).
 *
 * Uso: node scripts/sync-mgeb-catalog.mjs
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

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

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en .env.local");
  process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function fetchEndpointWithFallback(primaryUrl, fallbackUrl) {
  const tryFetch = async (url) => {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  };

  try {
    return await tryFetch(primaryUrl);
  } catch (err1) {
    console.warn(`⚠️ Aviso: ${primaryUrl} falló (${err1.message}). Probando mirror ${fallbackUrl}...`);
    try {
      return await tryFetch(fallbackUrl);
    } catch (err2) {
      // Reintentar una vez más
      await new Promise((r) => setTimeout(r, 2000));
      return await tryFetch(primaryUrl);
    }
  }
}

export async function syncMegaEmbedCatalog() {
  console.log("=================================================");
  console.log("🚀 Sincronizando catálogo MegaEmbed (mgeb.top)...");
  console.log("=================================================");

  const movieUrl = "https://mgeb.top/api/movie";
  const movieFallback = "https://megaembed.com/api/movie";
  const seriesUrl = "https://mgeb.top/api/series";
  const seriesFallback = "https://megaembed.com/api/series";

  // 1. Descargar películas
  console.log(`\n📥 Descargando películas desde ${movieUrl}...`);
  const t0 = Date.now();
  const movieText = await fetchEndpointWithFallback(movieUrl, movieFallback);
  const movieJson = JSON.parse(movieText);
  const movieCount = Array.isArray(movieJson) ? movieJson.length : 0;
  console.log(`✓ ${movieCount} películas descargadas en ${Date.now() - t0}ms (${(movieText.length / 1024).toFixed(1)} KB)`);

  // 2. Descargar series
  console.log(`\n📥 Descargando series desde ${seriesUrl}...`);
  const t1 = Date.now();
  const seriesText = await fetchEndpointWithFallback(seriesUrl, seriesFallback);
  const seriesJson = JSON.parse(seriesText);
  const seriesCount = Array.isArray(seriesJson) ? seriesJson.length : 0;
  console.log(`✓ ${seriesCount} series descargadas en ${Date.now() - t1}ms (${(seriesText.length / 1024).toFixed(1)} KB)`);

  // 3. Guardar en Supabase tabla config
  console.log("\n💾 Guardando catálogos en Supabase (tabla config)...");

  const entriesToUpsert = [
    { key: `catalog_cache:${movieUrl}`, value: movieText },
    { key: `catalog_cache:${movieUrl}/`, value: movieText },
    { key: `catalog_cache:${seriesUrl}`, value: seriesText },
    { key: `catalog_cache:${seriesUrl}/`, value: seriesText },
    {
      key: "catalog_cache_stats:mgeb",
      value: JSON.stringify({
        movieCount,
        seriesCount,
        movieBytes: movieText.length,
        seriesBytes: seriesText.length,
        syncedAt: new Date().toISOString(),
      }),
    },
  ];

  for (const entry of entriesToUpsert) {
    const { error } = await sb.from("config").upsert(entry, { onConflict: "key" });
    if (error) {
      console.error(`❌ Error guardando clave ${entry.key}:`, error);
      throw error;
    }
  }

  console.log(`\n🎉 Sincronización completada exitosamente:`);
  console.log(`   - Películas: ${movieCount.toLocaleString()} IDs guardados`);
  console.log(`   - Series: ${seriesCount.toLocaleString()} IDs guardados`);
  console.log(`   - Supabase config keys actualizadas: 5`);
  return { movieCount, seriesCount };
}

// Ejecución directa
if (process.argv[1] && process.argv[1].endsWith("sync-mgeb-catalog.mjs")) {
  syncMegaEmbedCatalog()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("\n❌ Fallo en la sincronización:", err.message);
      process.exit(1);
    });
}
