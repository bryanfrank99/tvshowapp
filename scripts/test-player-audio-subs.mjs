import fs from "fs";
import dotenv from "dotenv";
if (fs.existsSync(".env.local")) {
  const env = dotenv.parse(fs.readFileSync(".env.local"));
  for (const k in env) process.env[k] = env[k];
}

import { runHlsExtractor, EXTRACTOR_PRESETS } from "../lib/hls-engine.ts";

async function test() {
  console.log("=== INICIO PRUEBA AUDIO DUAL Y SUBTÍTULOS HLS (SPEC 103) ===");

  // 1. Extraer streams de PlayerFlix para película 687163
  console.log("\n[PASO 1] Extrayendo streams HLS de TMDB 687163...");
  const res = await runHlsExtractor({
    providerId: "playerflix",
    config: EXTRACTOR_PRESETS.playerflix.template,
    type: "movie",
    id: "687163",
  });

  console.log("Resultado de extracción:");
  console.log("  - Success:", res.success);
  console.log("  - HLS URL primaria:", res.hlsUrl);
  console.log("  - Backup HLS URLs:", res.backupHlsUrls);

  if (!res.hlsUrl) {
    throw new Error("No se extrajo URL primaria HLS");
  }

  // 2. Verificar que el master.m3u8 contiene pistas de audio y subtítulos
  console.log("\n[PASO 2] Consultando manifiesto original...");
  const rMaster = await fetch(res.hlsUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Referer": "https://embedplayer2.xyz/",
    },
  });
  console.log("  - HTTP Status master original:", rMaster.status);
  const masterContent = await rMaster.text();

  const hasAudioTag = masterContent.includes("#EXT-X-MEDIA:TYPE=AUDIO");
  const hasSubTag = masterContent.includes("#EXT-X-MEDIA:TYPE=SUBTITLES");
  console.log("  - Manifiesto contiene directivas de Audio:", hasAudioTag);
  console.log("  - Manifiesto contiene directivas de Subtítulos:", hasSubTag);

  if (!hasAudioTag || !hasSubTag) {
    throw new Error("El manifiesto master no contiene tags de audio o subtítulos");
  }

  // 3. Probar el proxy local (/api/playerflix/proxy) con reescritura de URIs
  console.log("\n[PASO 3] Probando proxy de streaming con el master.m3u8...");
  const proxyUrl = res.backupHlsUrls?.find((u) => u.includes("/api/playerflix/proxy")) ||
    `http://localhost:3000/api/playerflix/proxy?url=${encodeURIComponent(res.hlsUrl)}`;
  console.log("  - URL Proxy:", proxyUrl);

  const { GET } = await import("../app/api/playerflix/proxy/route.ts");
  const { NextRequest } = await import("next/server");

  const req = new NextRequest(proxyUrl.startsWith("http") ? proxyUrl : `http://localhost:3000${proxyUrl}`);
  const proxyRes = await GET(req);
  console.log("  - Proxy HTTP Status:", proxyRes.status);
  console.log("  - Proxy CORS header:", proxyRes.headers.get("access-control-allow-origin"));
  console.log("  - Content-Type:", proxyRes.headers.get("content-type"));

  if (proxyRes.status !== 200) {
    throw new Error(`El proxy devolvió código de error HTTP ${proxyRes.status}`);
  }

  const rewrittenText = await proxyRes.text();
  const hasRewrittenAudio = rewrittenText.includes('TYPE=AUDIO') && rewrittenText.includes('/api/playerflix/proxy?url=');
  const hasRewrittenSubs = rewrittenText.includes('TYPE=SUBTITLES') && rewrittenText.includes('/api/playerflix/proxy?url=');

  console.log("  - Pistas de Audio reescritas con proxy CORS:", hasRewrittenAudio);
  console.log("  - Pistas de Subtítulos reescritas con proxy CORS:", hasRewrittenSubs);

  if (!hasRewrittenAudio || !hasRewrittenSubs) {
    throw new Error("El proxy no reescribió adecuadamente las URIs de audio o subtítulos");
  }

  // 4. Probar descarga de una playlist de subtítulos vía proxy
  const subLine = rewrittenText.split("\n").find((l) => l.includes("TYPE=SUBTITLES") && l.includes('URI="'));
  if (subLine) {
    const subUriMatch = subLine.match(/URI="([^"]+)"/);
    if (subUriMatch && subUriMatch[1]) {
      console.log("\n[PASO 4] Verificando entrega de playlist de subtítulos vía proxy...");
      const subUri = subUriMatch[1];
      const subReq = new NextRequest(subUri.startsWith("http") ? subUri : `http://localhost:3000${subUri}`);
      const subRes = await GET(subReq);
      console.log("  - Subtitle playlist HTTP Status:", subRes.status);
      console.log("  - Subtitle CORS header:", subRes.headers.get("access-control-allow-origin"));
      const subText = await subRes.text();
      console.log("  - Subtitle snippet:\n", subText.slice(0, 150));
      if (subRes.status !== 200) {
        throw new Error("La playlist de subtítulos no respondió 200 vía proxy");
      }
    }
  }

  console.log("\n=== ¡CERTIFICACIÓN SPEC 103 EXITOSA! ===");
}

test().catch((err) => {
  console.error("Error en prueba Spec 103:", err);
  process.exit(1);
});
