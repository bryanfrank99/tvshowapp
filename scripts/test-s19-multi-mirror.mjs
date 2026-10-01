import fs from "fs";
import dotenv from "dotenv";
if (fs.existsSync(".env.local")) {
  const env = dotenv.parse(fs.readFileSync(".env.local"));
  for (const k in env) process.env[k] = env[k];
}

import { runHlsExtractor, EXTRACTOR_PRESETS } from "../lib/hls-engine.ts";
import { GET } from "../app/api/resolve/route.ts";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sha, newToken } from "../lib/access.ts";

async function run() {
  console.log("=== INICIO PRUEBA S19 MULTI-MIRROR (CINECALIDAD API DIRECTA) ===");

  // 1. Probar Serie TMDB 247718 S01E03
  console.log("\n[TEST 1] Serie TMDB 247718 S01E03...");
  const tvRes = await runHlsExtractor({
    providerId: "cinecalidad",
    config: EXTRACTOR_PRESETS.cinecalidad.template,
    type: "tv",
    id: "247718",
    season: 1,
    episode: 3,
  });

  console.log("Resultado Serie 247718 S01E03:");
  console.log("  - Success:", tvRes.success);
  console.log("  - HLS URL extraída:", tvRes.hlsUrl || "(Ninguna directa extraída)");
  console.log("  - Embeds count:", tvRes.embeds?.length || 0);

  if (!tvRes.success) {
    throw new Error("Fallo en extracción de serie 247718 para S19");
  }

  if (!tvRes.embeds || tvRes.embeds.length < 2) {
    throw new Error(`Se esperaban al menos 2 embeds para la serie 247718, se obtuvieron ${tvRes.embeds?.length}`);
  }

  console.log("  - Opciones de streaming originales:");
  tvRes.embeds.forEach((e, idx) => {
    console.log(`    ${idx + 1}. [${e.host}] ${e.label} (${e.lang}): ${e.url}`);
  });

  // Verificar que contenga Vimeos y Goodstream
  const hasVimeos = tvRes.embeds.some((e) => e.url.includes("vimeos.net"));
  const hasGoodstream = tvRes.embeds.some((e) => e.url.includes("goodstream.one"));
  if (!hasVimeos || !hasGoodstream) {
    throw new Error("Falta Vimeos o Goodstream en las opciones de serie 247718");
  }

  // 2. Probar Película TMDB 550 (Fight Club)
  console.log("\n[TEST 2] Película TMDB 550 (Fight Club)...");
  const movieRes = await runHlsExtractor({
    providerId: "cinecalidad",
    config: EXTRACTOR_PRESETS.cinecalidad.template,
    type: "movie",
    id: "550",
  });

  console.log("Resultado Película 550:");
  console.log("  - Success:", movieRes.success);
  console.log("  - HLS URL extraída:", movieRes.hlsUrl || "(Ninguna directa extraída)");
  console.log("  - Embeds count:", movieRes.embeds?.length || 0);

  if (!movieRes.success || !movieRes.embeds || movieRes.embeds.length < 2) {
    throw new Error(`Se esperaban al menos 2 embeds para la película 550, se obtuvieron ${movieRes.embeds?.length}`);
  }

  console.log("  - Opciones de la película:");
  movieRes.embeds.forEach((e, idx) => {
    console.log(`    ${idx + 1}. [${e.host}] ${e.label} (${e.lang}): ${e.url}`);
  });

  // 3. Probar resolución en /api/resolve
  console.log("\n[TEST 3] Verificación del Endpoint /api/resolve para S19...");
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
    throw new Error("No hay access_code válido en la base de datos");
  }

  const token = newToken();
  const tokenHash = sha(token);
  await sb.from("sessions").insert({ token_hash: tokenHash, code_id: code.id, device_hint: "Test Runner S19" });

  try {
    const req = new NextRequest("http://localhost:3000/api/resolve?id=247718&type=tv&s=1&e=3&lang=es", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = await GET(req);
    const data = await res.json();

    const s19Sources = (data.sources || []).filter((s) => s.providerId === "cinecalidad");
    console.log(`Encontradas ${s19Sources.length} fuente(s) de S19 (cinecalidad):`);

    s19Sources.forEach((s) => {
      console.log(`- ID: ${s.id} | Tipo: ${s.type} | Prioridad: ${s.priority} | Nombre: ${s.providerName} (${s.realName})`);
      console.log(`    URL primaria: ${s.url}`);
      if (s.options) {
        console.log(`    Opciones en tarjeta (${s.options.length}):`);
        s.options.forEach((opt, i) => {
          console.log(`      ${i + 1}. [${opt.label}] (${opt.lang}) -> ${opt.url}`);
        });
      }
      if (s.embedOptions) {
        console.log(`    embedOptions (${s.embedOptions.length}):`);
        s.embedOptions.forEach((opt, i) => {
          console.log(`      ${i + 1}. [${opt.label}] (${opt.language}) -> ${opt.url}`);
        });
      }
    });

    if (s19Sources.length === 0) {
      throw new Error("No se encontraron fuentes de S19 en /api/resolve");
    }

    const iframeCard = s19Sources.find((s) => s.type === "iframe" || s.options);
    if (!iframeCard || !iframeCard.options || iframeCard.options.length < 2) {
      throw new Error("Falta la tarjeta con las opciones multi-mirror originales de S19");
    }

    console.log("\n¡Verificación de /api/resolve completada exitosamente!");
  } finally {
    await sb.from("sessions").delete().eq("token_hash", tokenHash);
  }

  console.log("\n=== ¡TODAS LAS PRUEBAS DE S19 MULTI-MIRROR COMPLETADAS CON ÉXITO! ===");
}

run().catch((err) => {
  console.error("Error en pruebas:", err);
  process.exit(1);
});
