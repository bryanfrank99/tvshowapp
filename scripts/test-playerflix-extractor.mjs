import { fetchPlayerFlixStreams } from "../lib/playerflix";

async function runTests() {
  console.log("=== INICIO DE PRUEBAS DE EXTRACTOR PLAYERFLIX (SIN WATCHPLAY) ===");

  let passes = 0;
  let total = 0;

  // Test 1: Película Spider-Man (TMDB 969681)
  total++;
  console.log("\n[TEST 1] Extracción de Spider-Man (969681) sin WatchPlay...");
  const movieRes = await fetchPlayerFlixStreams({
    id: "969681",
    type: "movie",
  });

  if (movieRes && movieRes.success && movieRes.streams.length > 0) {
    const hasWatchPlay = movieRes.streams.some(
      (s) => s.id === "watchplay" || (s.originUrl && s.originUrl.includes("watchplay.shop"))
    );
    const vipHls = movieRes.streams.find((s) => s.id === "embedplayer" && s.type === "hls");
    const vipWeb = movieRes.streams.find((s) => s.id === "embedplayer-web" && s.type === "iframe");
    const embedPlay = movieRes.streams.find((s) => s.label.includes("Embed Play"));

    console.log(`  - Total streams extraídos: ${movieRes.streams.length}`);
    console.log(`  - ¿WatchPlay excluido?: ${!hasWatchPlay}`);
    console.log(`  - VIP Player HLS: ${vipHls ? vipHls.hlsUrl.slice(0, 60) + "..." : "No"}`);
    console.log(`  - VIP Player Web: ${vipWeb ? "Sí" : "No"}`);
    console.log(`  - Embed Play (iframe): ${embedPlay ? "Sí" : "No"}`);

    if (!hasWatchPlay && vipHls && vipWeb) {
      console.log("✓ Test 1 superado: WatchPlay descartado y proveedores alternativos listos.");
      passes++;
    } else {
      console.error("✗ Test 1 falló: WatchPlay sigue presente o faltan alternativas.");
    }
  } else {
    console.error("✗ Falló la extracción de película:", movieRes?.error);
  }

  // Test 2: Película Interstellar (TMDB 157336)
  total++;
  console.log("\n[TEST 2] Extracción de Interstellar (157336) sin WatchPlay...");
  const movie2Res = await fetchPlayerFlixStreams({
    id: "157336",
    type: "movie",
  });

  if (movie2Res && movie2Res.success && movie2Res.streams.length > 0) {
    const hasWatchPlay = movie2Res.streams.some(
      (s) => s.id === "watchplay" || (s.originUrl && s.originUrl.includes("watchplay.shop"))
    );
    console.log(`  - Total streams extraídos: ${movie2Res.streams.length}`);
    console.log(`  - ¿WatchPlay excluido?: ${!hasWatchPlay}`);
    for (const st of movie2Res.streams) {
      console.log(`    * [${st.type.toUpperCase()}] ${st.label}: ${st.hlsUrl.slice(0, 60)}...`);
    }

    if (!hasWatchPlay && movie2Res.streams.length > 0) {
      console.log("✓ Test 2 superado: Proveedores iframe activos sin WatchPlay.");
      passes++;
    } else {
      console.error("✗ Test 2 falló");
    }
  } else {
    console.error("✗ Falló la extracción de Interstellar:", movie2Res?.error);
  }

  // Test 3: Serie Game of Thrones (TMDB 1399 S1E1)
  total++;
  console.log("\n[TEST 3] Extracción de Game of Thrones (1399 S1E1) sin WatchPlay...");
  const tvRes = await fetchPlayerFlixStreams({
    id: "1399",
    type: "tv",
    season: 1,
    episode: 1,
  });

  if (tvRes && tvRes.success && tvRes.streams.length > 0) {
    const hasWatchPlay = tvRes.streams.some(
      (s) => s.id === "watchplay" || (s.originUrl && s.originUrl.includes("watchplay.shop"))
    );
    console.log(`  - Total streams extraídos: ${tvRes.streams.length}`);
    console.log(`  - ¿WatchPlay excluido?: ${!hasWatchPlay}`);
    for (const st of tvRes.streams) {
      console.log(`    * [${st.type.toUpperCase()}] ${st.label}: ${st.hlsUrl.slice(0, 60)}...`);
    }

    if (!hasWatchPlay && tvRes.streams.length > 0) {
      console.log("✓ Test 3 superado: Serie servida mediante proveedores alternativos sin WatchPlay.");
      passes++;
    } else {
      console.error("✗ Test 3 falló");
    }
  } else {
    console.error("✗ Falló la extracción de serie:", tvRes?.error);
  }

  // Test 4: Verificación de Endpoint Proxy HLS para VIP Player
  total++;
  console.log("\n[TEST 4] Verificación de Endpoint Proxy HLS para VIP Player...");
  const vipItem = movieRes?.streams?.find((s) => s.id === "embedplayer");
  if (vipItem && vipItem.hlsUrl.startsWith("/api/playerflix/proxy")) {
    const { GET } = await import("../app/api/playerflix/proxy/route");
    const { NextRequest } = await import("next/server");
    const dummyReq = new NextRequest("http://localhost:3000" + vipItem.hlsUrl);
    const proxyRes = await GET(dummyReq);
    const corsHeader = proxyRes.headers.get("access-control-allow-origin");
    const contentType = proxyRes.headers.get("content-type");
    console.log(`  - Status: ${proxyRes.status}`);
    console.log(`  - Content-Type: ${contentType}`);
    console.log(`  - Access-Control-Allow-Origin: ${corsHeader}`);

    if (proxyRes.status === 200 && corsHeader === "*" && contentType?.includes("mpegurl")) {
      const bodyText = await proxyRes.text();
      const hasRewrittenSub = bodyText.includes("/api/playerflix/proxy?url=");
      console.log(`  - Manifiesto maestro reescrito con rutas proxy: ${hasRewrittenSub}`);
      if (hasRewrittenSub) {
        console.log("✓ VIP Player HLS Proxy responde 200 con CORS abierto y rutas reescritas.");
        passes++;
      } else {
        console.error("✗ No se reescribieron las rutas en el proxy");
      }
    } else {
      console.error("✗ Respuesta inesperada del proxy");
    }
  } else {
    console.error("✗ No se encontró vipItem con URL de proxy");
  }

  console.log(`\n=== RESULTADOS: ${passes}/${total} pruebas pasaron ===`);
  if (passes === total) {
    console.log("✓ TODAS LAS PRUEBAS DE PLAYERFLIX PASARON CORRECTAMENTE");
    process.exit(0);
  } else {
    console.error("✗ ALGUNAS PRUEBAS FALLARON");
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Error fatal en suite de pruebas:", err);
  process.exit(1);
});
