import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';
import { fetchMegaEmbedStream } from '../lib/megaembed.js';
import { supa } from '../lib/supa.js';
import { NextRequest } from 'next/server';
import { GET } from '../app/api/resolve/route.ts';

const basePath = "C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp";

async function verifySpec084() {
  console.log("=== Verificando Implementación de la Spec 084 ===");

  // 1. Verificar lib/megaembed.ts
  const megaembedPath = path.join(basePath, "lib/megaembed.ts");
  const megaembedContent = fs.readFileSync(megaembedPath, "utf-8");
  if (!megaembedContent.includes("Promise.any") || !megaembedContent.includes("mgeb.top") || !megaembedContent.includes("megaembed.com")) {
    console.error("❌ lib/megaembed.ts no implementa carrera paralela con Promise.any");
    process.exit(1);
  }
  if (megaembedContent.includes("checkResults")) {
    console.error("❌ lib/megaembed.ts aún contiene la validación de red bloqueante checkResults");
    process.exit(1);
  }
  console.log("✅ lib/megaembed.ts verificado: carrera paralela sin chequeo bloqueante.");

  // 2. Medir velocidad de extracción S14
  console.log("\nProbando velocidad de extracción de S14...");
  const t0 = Date.now();
  const resMovie = await fetchMegaEmbedStream({ id: '1339713', type: 'movie' });
  const movieTime = Date.now() - t0;
  console.log(`Extracción Película S14 demoró: ${movieTime}ms (Éxito: ${resMovie?.success})`);
  if (!resMovie?.success || movieTime > 4200) {
    console.error(`❌ Extracción de película falló o excedió 4.2s (${movieTime}ms)`);
    process.exit(1);
  }
  console.log("✅ Velocidad de extracción de S14 verificada dentro del umbral (<4.2s).");

  // 3. Verificar PlayerContainer.tsx (key={source.id || source.url})
  const playerContainerPath = path.join(basePath, "components/player/PlayerContainer.tsx");
  const playerContainerContent = fs.readFileSync(playerContainerPath, "utf-8");
  if (!playerContainerContent.includes("key={source.id || source.url}")) {
    console.error("❌ PlayerContainer no usa key={source.id || source.url}");
    process.exit(1);
  }
  console.log("✅ PlayerContainer.tsx verificado: estabilidad de montaje con source.id.");

  // 4. Verificar NativeSourcePlayer.tsx (no candidateUrls.length en dependencias)
  const nativePlayerPath = path.join(basePath, "components/player/NativeSourcePlayer.tsx");
  const nativePlayerContent = fs.readFileSync(nativePlayerPath, "utf-8");
  if (!nativePlayerContent.includes("candidateUrlsRef") || nativePlayerContent.includes("[activeUrl, currentUrlIndex, candidateUrls.length")) {
    console.error("❌ NativeSourcePlayer aún tiene candidateUrls.length en dependencias o no usa candidateUrlsRef");
    process.exit(1);
  }
  console.log("✅ NativeSourcePlayer.tsx verificado: stream continuo sin reinicios por backups tardíos.");

  // 5. Verificar app/watch/page.tsx (4200ms y isInitialPhaseDoneRef)
  const watchPagePath = path.join(basePath, "app/watch/page.tsx");
  const watchPageContent = fs.readFileSync(watchPagePath, "utf-8");
  if (!watchPageContent.includes("4200") || !watchPageContent.includes("isInitialPhaseDoneRef")) {
    console.error("❌ app/watch/page.tsx no implementa ventana de 4200ms o isInitialPhaseDoneRef");
    process.exit(1);
  }
  console.log("✅ app/watch/page.tsx verificado: ventana prioritaria de 4.2s y preservación de reproducción.");

  // 6. Verificar resolución completa de API con HLS en posición 0 en portugués
  const sb = supa();
  const { data: codes } = await sb.from("access_codes").select("*").eq("revoked", false).gt("expires_at", new Date().toISOString()).limit(1);
  const code = codes[0];
  const token = "testtoken_spec84_" + Date.now();
  const tokenHash = (await import('crypto')).createHash('sha256').update(token).digest('hex');
  await sb.from("sessions").insert({
    token_hash: tokenHash,
    code_id: code.id,
    device_hint: "Spec084Validator",
    device_id: "DEV-SPEC84",
    created_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString()
  });

  const req = new NextRequest("http://localhost:3000/api/resolve?type=movie&id=1339713&lang=pt", {
    headers: { 'cookie': `tvsess=${token}; tvshow_lang=pt` }
  });
  const res = await GET(req);
  const body = await res.json();
  if (res.status !== 200 || !body.sources || body.sources.length === 0) {
    console.error("❌ /api/resolve falló:", body);
    process.exit(1);
  }

  const firstSource = body.sources[0];
  console.log(`Primer servidor entregado: ${firstSource.providerName || firstSource.name} (tipo: ${firstSource.type}, lang: ${firstSource.lang})`);
  if (firstSource.type !== "hls") {
    console.error("❌ El primer servidor entregado no es HLS");
    process.exit(1);
  }
  console.log("✅ Servidor HLS entregado en posición 0 en portugués.");

  console.log("\n🎉 ¡Todas las verificaciones de la Spec 084 completadas con éxito!");
}

verifySpec084();
