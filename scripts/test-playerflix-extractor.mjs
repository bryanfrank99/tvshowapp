import { fetchPlayerFlixStreams } from "../lib/playerflix";

async function runTests() {
  console.log("=== INICIO DE PRUEBAS DE EXTRACTOR HLS EXCLUSIVO PLAYERFLIX (SPEC 092) ===");

  let passes = 0;
  let total = 0;

  // Test 1: Película Spider-Man (TMDB 969681) con WatchPlay HLS y VIP Player HLS
  total++;
  console.log("\n[TEST 1] Extracción de Spider-Man (969681) con WatchPlay reactivado y SOLO HLS...");
  const movieRes = await fetchPlayerFlixStreams({
    id: "969681",
    type: "movie",
  });

  if (movieRes && movieRes.success && movieRes.streams.length > 0) {
    const watchPlayStream = movieRes.streams.find((s) => s.id === "watchplay" && s.type === "hls");
    const vipHlsStream = movieRes.streams.find((s) => s.id === "embedplayer" && s.type === "hls");
    const anyIframe = movieRes.streams.some((s) => s.type === "iframe");

    console.log(`  - Total streams HLS extraídos: ${movieRes.streams.length}`);
    console.log(`  - WatchPlay HLS presente: ${Boolean(watchPlayStream)}`);
    console.log(`  - VIP Player HLS presente: ${Boolean(vipHlsStream)}`);
    console.log(`  - ¿Contiene algún stream tipo iframe?: ${anyIframe}`);

    if (watchPlayStream && vipHlsStream && !anyIframe) {
      console.log("✓ Test 1 superado: WatchPlay y VIP Player activos como streams 100% HLS (sin embeds).");
      passes++;
    } else {
      console.error("✗ Test 1 falló: falta WatchPlay/VIP o existen iframes indebidos.");
    }
  } else {
    console.error("✗ Falló la extracción de Spider-Man:", movieRes?.error);
  }

  // Test 2: Película Avengers: Infinity War (TMDB 299536)
  total++;
  console.log("\n[TEST 2] Extracción de Avengers (299536) con WatchPlay y VIP Player (SOLO HLS)...");
  const avengersRes = await fetchPlayerFlixStreams({
    id: "299536",
    type: "movie",
  });

  if (avengersRes && avengersRes.success && avengersRes.streams.length > 0) {
    const anyIframe = avengersRes.streams.some((s) => s.type === "iframe");
    const allHls = avengersRes.streams.every((s) => s.type === "hls");

    console.log(`  - Total streams extraídos: ${avengersRes.streams.length}`);
    for (const st of avengersRes.streams) {
      console.log(`    * [${st.type.toUpperCase()}] ${st.label}: ${st.hlsUrl.slice(0, 60)}...`);
    }

    if (allHls && !anyIframe && avengersRes.streams.length >= 2) {
      console.log("✓ Test 2 superado: Avengers contiene múltiples streams HLS nativos y 0 embeds.");
      passes++;
    } else {
      console.error("✗ Test 2 falló: se encontraron iframes o no se obtuvieron streams HLS.");
    }
  } else {
    console.error("✗ Falló la extracción de Avengers:", avengersRes?.error);
  }

  // Test 3: Título con solo opciones web (Interstellar 157336 o GOT) - Verificar ausencia de iframes
  total++;
  console.log("\n[TEST 3] Verificación de filtro estricto (0 embeds)...");
  const movie2Res = await fetchPlayerFlixStreams({
    id: "157336",
    type: "movie",
  });

  const anyEmbedInRes = (movie2Res?.streams || []).some((s) => s.type === "iframe");
  console.log(`  - Streams devueltos para Interstellar: ${movie2Res?.streams?.length || 0}`);
  console.log(`  - ¿Se filtraron correctamente todos los iframes (Embed Play / Premium)?: ${!anyEmbedInRes}`);

  if (!anyEmbedInRes) {
    console.log("✓ Test 3 superado: Ningún servidor tipo embed/iframe fue expuesto en S20.");
    passes++;
  } else {
    console.error("✗ Test 3 falló: se detectaron iframes en los streams.");
  }

  // Test 4: Verificación de Proxy HLS Maestro para VIP Player
  total++;
  console.log("\n[TEST 4] Verificación de Proxy HLS Maestro para VIP Player...");
  let subPlaylistProxyUrl = "";
  const vipItem = movieRes?.streams?.find((s) => s.id === "embedplayer");
  if (vipItem && vipItem.hlsUrl.startsWith("/api/playerflix/proxy")) {
    const { GET } = await import("../app/api/playerflix/proxy/route");
    const { NextRequest } = await import("next/server");
    const dummyReq = new NextRequest("http://localhost:3000" + vipItem.hlsUrl);
    const proxyRes = await GET(dummyReq);
    const corsHeader = proxyRes.headers.get("access-control-allow-origin");
    const contentType = proxyRes.headers.get("content-type");

    if (proxyRes.status === 200 && corsHeader === "*" && contentType?.includes("mpegurl")) {
      const bodyText = await proxyRes.text();
      const hasRewrittenSub = bodyText.includes("/api/playerflix/proxy?url=");
      if (hasRewrittenSub) {
        subPlaylistProxyUrl = bodyText.split("\n").find((l) => l.includes("/api/playerflix/proxy?url="))?.trim() || "";
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

  // Test 5: Verificación de descarga de segmento real vía Proxy HLS
  total++;
  console.log("\n[TEST 5] Verificación de Sub-lista HLS y Segmento de Video Real...");
  if (subPlaylistProxyUrl) {
    try {
      const { GET } = await import("../app/api/playerflix/proxy/route");
      const { NextRequest } = await import("next/server");
      const subReq = new NextRequest("http://localhost:3000" + subPlaylistProxyUrl);
      const subRes = await GET(subReq);
      const subText = await subRes.text();
      const segProxyUrl = subText.split("\n").find((l) => l.includes("/api/playerflix/proxy?url="))?.trim();

      if (subRes.status === 200 && segProxyUrl) {
        const segReq = new NextRequest("http://localhost:3000" + segProxyUrl);
        const segRes = await GET(segReq);
        const segCors = segRes.headers.get("access-control-allow-origin");
        const segBuffer = await segRes.arrayBuffer();

        if (segRes.status === 200 && segCors === "*" && segBuffer.byteLength > 1000) {
          console.log(`✓ Segmento de video real descargado (${segBuffer.byteLength} bytes) vía Proxy HLS.`);
          passes++;
        } else {
          console.error("✗ Falló la descarga o validación del segmento");
        }
      } else {
        console.error("✗ No se obtuvo segmento proxy");
      }
    } catch (e) {
      console.error("✗ Error en prueba de segmentos:", e);
    }
  } else {
    console.error("✗ No se obtuvo URL de sub-lista para probar");
  }

  // Test 6: Verificación de stream directo HLS de WatchPlay
  total++;
  console.log("\n[TEST 6] Verificación de stream directo HLS de WatchPlay en S20...");
  const wpItem = movieRes?.streams?.find((s) => s.id === "watchplay");
  if (wpItem && wpItem.hlsUrl.includes(".m3u8")) {
    try {
      const wpHeadRes = await fetch(wpItem.hlsUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      console.log(`  - WatchPlay HLS status: ${wpHeadRes.status}`);
      console.log(`  - WatchPlay HLS URL: ${wpItem.hlsUrl.slice(0, 60)}...`);

      if (wpHeadRes.ok) {
        console.log("✓ Stream HLS de WatchPlay accesible directamente y validado.");
        passes++;
      } else {
        console.error("✗ WatchPlay HLS devolvió status no exitoso:", wpHeadRes.status);
      }
    } catch (e) {
      console.error("✗ Error conectando al stream WatchPlay:", e);
    }
  } else {
    console.error("✗ No se encontró stream WatchPlay HLS en Spider-Man");
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
