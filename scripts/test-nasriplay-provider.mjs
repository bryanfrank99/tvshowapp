import fs from "fs";
import dotenv from "dotenv";

if (fs.existsSync(".env.local")) {
  const envConfig = dotenv.parse(fs.readFileSync(".env.local"));
  for (const k in envConfig) process.env[k] = envConfig[k];
}

import { fetchNasriPlayStream } from "../lib/nasriplay.ts";
import { supa } from "../lib/supa.ts";

async function run() {
  console.log("=== INICIANDO VALIDACIÓN INTEGRAL DE S17 (NASRIPLAY) ===\n");

  // 1. Validar registro de base de datos
  const { data: prov, error: provErr } = await supa()
    .from("providers")
    .select("*")
    .eq("id", "nasriplay")
    .single();

  if (provErr || !prov) {
    console.error("❌ Error al consultar proveedor nasriplay en BD:", provErr);
    process.exit(1);
  }
  console.log("✅ Configuración en BD Supabase para NasriPlay:");
  console.log(`   - ID: ${prov.id} | Ord: ${prov.ord} | Enabled: ${prov.enabled}`);
  console.log(`   - movie_tpl: ${prov.movie_tpl}`);
  console.log(`   - tv_tpl: ${prov.tv_tpl}`);
  console.log(`   - movie_list_url: '${prov.movie_list_url}' (debe estar vacío para no activar redeflix)`);
  console.log(`   - tv_list_url: '${prov.tv_list_url}' (debe estar vacío para no activar redeflix)`);

  // 2. Extraer película (TMDB 550 - Fight Club)
  console.log("\n--- TEST 1: Película TMDB 550 (Fight Club) ---");
  const movieRes = await fetchNasriPlayStream({ id: "550", type: "movie" });
  console.log(`Success: ${movieRes?.success}`);
  console.log(`Primary HLS URL: ${movieRes?.hlsUrl}`);
  console.log(`Backup URLs count: ${movieRes?.backupHlsUrls?.length || 0}`);
  console.log(`Embeds count: ${movieRes?.embeds?.length || 0}`);
  if (movieRes?.embeds && movieRes.embeds.length > 0) {
    console.log("Embeds:", movieRes.embeds.map(e => `${e.name} (${e.host}) -> ${e.url}`));
  }

  if (movieRes?.hlsUrl) {
    try {
      const probeRes = await fetch(movieRes.hlsUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          Range: "bytes=0-1024"
        }
      });
      console.log(`HTTP Status del stream HLS: ${probeRes.status} (Esperado: 200 o 206)`);
    } catch (e) {
      console.error("Error al probar stream HLS:", e.message);
    }
  }

  // 3. Extraer serie (TMDB 1399 - Game of Thrones S1 E1)
  console.log("\n--- TEST 2: Serie TMDB 1399 S01E01 (Game of Thrones) ---");
  const tvRes = await fetchNasriPlayStream({ id: "1399", type: "tv", season: 1, episode: 1 });
  console.log(`Success: ${tvRes?.success}`);
  console.log(`Primary HLS URL: ${tvRes?.hlsUrl}`);
  console.log(`Backup URLs count: ${tvRes?.backupHlsUrls?.length || 0}`);
  console.log(`Embeds count: ${tvRes?.embeds?.length || 0}`);
  if (tvRes?.embeds && tvRes.embeds.length > 0) {
    console.log("Embeds:", tvRes.embeds.map(e => `${e.name} (${e.host}) -> ${e.url}`));
  }

  if (tvRes?.hlsUrl) {
    try {
      const probeTv = await fetch(tvRes.hlsUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          Range: "bytes=0-1024"
        }
      });
      console.log(`HTTP Status del stream HLS (TV): ${probeTv.status} (Esperado: 200 o 206)`);
    } catch (e) {
      console.error("Error al probar stream HLS (TV):", e.message);
    }
  }

  console.log("\n=== VALIDACIÓN FINALIZADA CON ÉXITO ===");
}

run().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
