import fs from "fs";
import dotenv from "dotenv";
if (fs.existsSync(".env.local")) {
  const env = dotenv.parse(fs.readFileSync(".env.local"));
  for (const k in env) process.env[k] = env[k];
}

import { runHlsExtractor, EXTRACTOR_PRESETS } from "../lib/hls-engine.ts";

async function run() {
  console.log("=== INICIO PRUEBA S20 HÍBRIDO (HLS DIRECTO + EMBEDS ORIGINALES) ===");

  // 1. Probar Película (TMDB 687163)
  console.log("\n[TEST 1] Película TMDB 687163...");
  const movieRes = await runHlsExtractor({
    providerId: "playerflix",
    config: EXTRACTOR_PRESETS.playerflix.template,
    type: "movie",
    id: "687163",
  });

  console.log("Resultado Película 687163:");
  console.log("  - Success:", movieRes.success);
  console.log("  - Title:", movieRes.title);
  console.log("  - HLS URL extraída:", movieRes.hlsUrl || "(Ninguna directa extraída)");
  console.log("  - Backup HLS URLs:", movieRes.backupHlsUrls || []);
  console.log("  - Embeds count:", movieRes.embeds?.length || 0);

  if (movieRes.embeds && movieRes.embeds.length > 0) {
    console.log("  - Primer embed:", JSON.stringify(movieRes.embeds[0], null, 2));
    const hasOriginalFields = movieRes.embeds.every((e) => e.embed && e.label && e.lang);
    if (!hasOriginalFields) {
      throw new Error("Los embeds no conservan la estructura original {embed, label, lang}");
    }
  } else {
    throw new Error("No se devolvieron embeds para la película 687163");
  }

  // 2. Probar Serie (TMDB 1399 S01E01 - Game of Thrones)
  console.log("\n[TEST 2] Serie TMDB 1399 S01E01...");
  const tvRes = await runHlsExtractor({
    providerId: "playerflix",
    config: EXTRACTOR_PRESETS.playerflix.template,
    type: "tv",
    id: "1399",
    season: 1,
    episode: 1,
  });

  console.log("Resultado Serie 1399 S01E01:");
  console.log("  - Success:", tvRes.success);
  console.log("  - Title:", tvRes.title);
  console.log("  - HLS URL extraída:", tvRes.hlsUrl || "(Ninguna directa extraída)");
  console.log("  - Backup HLS URLs:", tvRes.backupHlsUrls || []);
  console.log("  - Embeds count:", tvRes.embeds?.length || 0);

  if (tvRes.embeds && tvRes.embeds.length > 0) {
    console.log("  - Opciones de la serie:");
    tvRes.embeds.forEach((e, idx) => {
      console.log(`    ${idx + 1}. [${e.label}] (${e.lang}): ${e.embed}`);
    });
  }

  // 3. Probar simulación en /api/resolve
  console.log("\n[TEST 3] Verificación del Endpoint /api/resolve...");
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

  const token = newToken();
  const tokenHash = sha(token);
  await sb.from("sessions").insert({ token_hash: tokenHash, code_id: code.id, device_hint: "Test Runner S20" });

  try {
    const req = new NextRequest("http://localhost:3000/api/resolve?id=687163&type=movie&lang=pt", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = await GET(req);
    const data = await res.json();

  console.log("Fuentes devueltas por /api/resolve para película 687163:");
  const s20Sources = data.sources?.filter((s) => s.providerId === "playerflix") || [];
  console.log(`Encontradas ${s20Sources.length} fuentes de S20 (playerflix):`);

  s20Sources.forEach((s) => {
    console.log(`- ID: ${s.id} | Tipo: ${s.type} | Prioridad: ${s.priority} | Nombre: ${s.providerName} (${s.realName})`);
    if (s.type === "hls") {
      console.log(`    URL HLS: ${s.url}`);
    }
    if (s.options) {
      console.log(`    Total options en tarjeta: ${s.options.length}`);
      s.options.forEach((opt, i) => {
        console.log(`      ${i + 1}. [${opt.label}] (${opt.lang}) -> ${opt.embed}`);
      });
    }
  });

  if (s20Sources.length === 0) {
    throw new Error("No se encontraron fuentes de S20 en /api/resolve");
  }

  const iframeCard = s20Sources.find((s) => s.type === "iframe");
  if (!iframeCard || !iframeCard.options || iframeCard.options.length === 0) {
    throw new Error("Falta la tarjeta iframe de S20 con las opciones originales");
  }

  } finally {
    await sb.from("sessions").delete().eq("token_hash", tokenHash);
  }

  console.log("\n=== ¡TODAS LAS PRUEBAS DE S20 HÍBRIDO COMPLETADAS CON ÉXITO! ===");
}

run().catch((err) => {
  console.error("Error en pruebas:", err);
  process.exit(1);
});
