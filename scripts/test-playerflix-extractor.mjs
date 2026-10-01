import { fetchPlayerFlixStreams } from "../lib/playerflix";

async function runTests() {
  console.log("=== INICIO DE PRUEBAS DE EXTRACTOR PLAYERFLIX ===");

  let passes = 0;
  let total = 0;

  // Test 1: Película Spider-Man (TMDB 969681)
  total++;
  console.log("\n[TEST 1] Extracción de película Spider-Man (TMDB 969681)...");
  const movieRes = await fetchPlayerFlixStreams({
    id: "969681",
    type: "movie",
  });

  if (movieRes && movieRes.success && movieRes.streams.length > 0) {
    console.log("✓ Película resuelta con éxito:");
    console.log(`  - Título: ${movieRes.title}`);
    console.log(`  - Total streams extraídos: ${movieRes.streams.length}`);
    const hlsList = movieRes.streams.filter((s) => s.type === "hls");
    console.log(`  - Streams HLS nativos: ${hlsList.length}`);
    for (const h of hlsList) {
      console.log(`    * [${h.label}] ${h.hlsUrl.slice(0, 90)}...`);
    }
    if (movieRes.primaryHlsUrl) {
      console.log(`  - Stream HLS primario: ${movieRes.primaryHlsUrl.slice(0, 90)}...`);
      passes++;
    } else {
      console.error("✗ No se obtuvo primaryHlsUrl en película");
    }
  } else {
    console.error("✗ Falló la extracción de película:", movieRes?.error);
  }

  // Test 2: Película Interstellar (TMDB 157336)
  total++;
  console.log("\n[TEST 2] Extracción de película Interstellar (TMDB 157336)...");
  const movie2Res = await fetchPlayerFlixStreams({
    id: "157336",
    type: "movie",
  });

  if (movie2Res && movie2Res.success && movie2Res.primaryHlsUrl) {
    console.log("✓ Interstellar resuelta con stream HLS primario:");
    console.log(`  - Stream HLS: ${movie2Res.primaryHlsUrl.slice(0, 90)}...`);
    passes++;
  } else {
    console.error("✗ Falló la extracción de Interstellar:", movie2Res?.error);
  }

  // Test 3: Serie Game of Thrones (TMDB 1399 S1E1)
  total++;
  console.log("\n[TEST 3] Extracción de serie Game of Thrones (TMDB 1399 S1E1)...");
  const tvRes = await fetchPlayerFlixStreams({
    id: "1399",
    type: "tv",
    season: 1,
    episode: 1,
  });

  if (tvRes && tvRes.success && tvRes.streams.length > 0) {
    console.log("✓ Serie resuelta con éxito:");
    console.log(`  - Título: ${tvRes.title}`);
    console.log(`  - Total streams extraídos: ${tvRes.streams.length}`);
    const hlsTvList = tvRes.streams.filter((s) => s.type === "hls");
    console.log(`  - Streams HLS nativos: ${hlsTvList.length}`);
    for (const h of hlsTvList) {
      console.log(`    * [${h.label}] ${h.hlsUrl.slice(0, 90)}...`);
    }
    if (tvRes.primaryHlsUrl) {
      console.log(`  - Stream HLS primario: ${tvRes.primaryHlsUrl.slice(0, 90)}...`);
      passes++;
    } else {
      console.error("✗ No se obtuvo primaryHlsUrl en serie");
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
        console.log("✓ VIP Player HLS Proxy responde 200 con CORS abierto y rutas reescritas");
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
