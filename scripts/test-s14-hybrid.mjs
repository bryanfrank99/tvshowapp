import fs from "fs";
import dotenv from "dotenv";
if (fs.existsSync(".env.local")) {
  const env = dotenv.parse(fs.readFileSync(".env.local"));
  for (const k in env) process.env[k] = env[k];
}

import { runHlsExtractor, EXTRACTOR_PRESETS } from "../lib/hls-engine.ts";

async function run() {
  console.log("=== INICIO PRUEBA S14 HÍBRIDO (HLS DIRECTO + EMBEDS ORIGINALES) ===");

  // 1. Probar Película (TMDB 550 - Fight Club)
  console.log("\n[TEST 1] Película TMDB 550 (Fight Club)...");
  const movieRes = await runHlsExtractor({
    providerId: "megaembed",
    config: EXTRACTOR_PRESETS.megaembed.template,
    type: "movie",
    id: "550",
  });

  console.log("Resultado Película 550:");
  console.log("  - Success:", movieRes.success);
  console.log("  - HLS URL extraída:", movieRes.hlsUrl || "(Ninguna directa extraída)");
  console.log("  - Backup HLS URLs:", movieRes.backupHlsUrls?.length || 0);
  console.log("  - Embeds count:", movieRes.embeds?.length || 0);

  if (!movieRes.success || !movieRes.hlsUrl) {
    throw new Error("Fallo en extracción de película 550 para S14");
  }

  if (movieRes.embeds && movieRes.embeds.length >= 2) {
    console.log("  - Opciones de la película:");
    movieRes.embeds.forEach((e, idx) => {
      console.log(`    ${idx + 1}. [${e.label}] (${e.lang}): ${e.url}`);
    });
  } else {
    throw new Error(`Se esperaban al menos 2 embeds para la película 550, se obtuvieron ${movieRes.embeds?.length}`);
  }

  // 2. Probar Serie (TMDB 1399 S01E01 - Game of Thrones)
  console.log("\n[TEST 2] Serie TMDB 1399 S01E01 (Game of Thrones)...");
  const tvRes = await runHlsExtractor({
    providerId: "megaembed",
    config: EXTRACTOR_PRESETS.megaembed.template,
    type: "tv",
    id: "1399",
    season: 1,
    episode: 1,
  });

  console.log("Resultado Serie 1399 S01E01:");
  console.log("  - Success:", tvRes.success);
  console.log("  - HLS URL extraída:", tvRes.hlsUrl || "(Ninguna directa extraída)");
  console.log("  - Backup HLS URLs:", tvRes.backupHlsUrls?.length || 0);
  console.log("  - Embeds count:", tvRes.embeds?.length || 0);

  if (!tvRes.success || !tvRes.hlsUrl) {
    throw new Error("Fallo en extracción de serie 1399 para S14");
  }

  if (tvRes.embeds && tvRes.embeds.length >= 2) {
    console.log("  - Opciones de la serie:");
    tvRes.embeds.forEach((e, idx) => {
      console.log(`    ${idx + 1}. [${e.label}] (${e.lang}): ${e.url}`);
    });
  } else {
    throw new Error(`Se esperaban al menos 2 embeds para la serie 1399, se obtuvieron ${tvRes.embeds?.length}`);
  }

  // 3. Probar resolución completa en /api/resolve para S14
  console.log("\n[TEST 3] Verificación del Endpoint /api/resolve para S14...");
  const { GET } = await import("../app/api/resolve/route.ts");
  const { NextRequest } = await import("next/server");
  const { createClient } = await import("@supabase/supabase-js");
  const { sha, newToken } = await import("../lib/access.ts");

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const { data: code } = await sb
    .from("access_codes")
    .select("id")
    .eq("revoked", false)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .single();

  if (!code) {
    throw new Error("No hay access_code válido en la base de datos para la prueba");
  }

  const token = newToken();
  const tokenHash = sha(token);
  await sb.from("sessions").insert({ token_hash: tokenHash, code_id: code.id, device_hint: "Test Runner S14" });

  try {
    const req = new NextRequest("http://localhost:3000/api/resolve?id=550&type=movie&lang=pt", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = await GET(req);
    const data = await res.json();

    console.log("Fuentes devueltas por /api/resolve para película 550:");
    const s14Sources = data.sources?.filter((s) => s.providerId === "megaembed") || [];
    console.log(`Encontradas ${s14Sources.length} fuentes de S14 (megaembed):`);

    s14Sources.forEach((s) => {
      console.log(`- ID: ${s.id} | Tipo: ${s.type} | Prioridad: ${s.priority} | Nombre: ${s.providerName} (${s.realName})`);
      if (s.type === "hls") {
        console.log(`    URL HLS: ${s.url}`);
        console.log(`    Backup URLs: ${s.backupUrls?.length || 0}`);
      }
      if (s.options) {
        console.log(`    Total options en tarjeta: ${s.options.length}`);
        s.options.forEach((opt, i) => {
          console.log(`      ${i + 1}. [${opt.label}] (${opt.lang}) -> ${opt.url}`);
        });
      }
    });

    if (s14Sources.length === 0) {
      throw new Error("No se encontraron fuentes de S14 en /api/resolve");
    }

    const hlsSource = s14Sources.find((s) => s.type === "hls");
    if (!hlsSource || !hlsSource.url) {
      throw new Error("Falta la fuente HLS de S14 con stream directo");
    }

    const iframeCard = s14Sources.find((s) => s.type === "iframe");
    if (!iframeCard || !iframeCard.options || iframeCard.options.length < 2) {
      throw new Error("Falta la tarjeta iframe de S14 con las opciones originales");
    }

    console.log("\n¡Verificación exitosa! S14 entrega tanto stream HLS nativo como tarjeta multi-mirror con todas las opciones originales.");
  } finally {
    await sb.from("sessions").delete().eq("token_hash", tokenHash);
  }

  console.log("\n=== ¡TODAS LAS PRUEBAS DE S14 HÍBRIDO COMPLETADAS CON ÉXITO! ===");
}

run().catch((err) => {
  console.error("Error en pruebas:", err);
  process.exit(1);
});
