import { fetchCinecalidadStream } from "../lib/cinecalidad.js";
import { getCachedStream, setCachedStream, STREAM_CACHE_ENABLED } from "../lib/stream-cache.js";

async function runTests() {
  console.log("=== RUNNING SPEC 072 S19 (CINECALIDAD) HLS TESTS ===");
  let passed = 0;
  let total = 0;

  function assert(desc, condition) {
    total++;
    if (condition) {
      console.log(`✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${desc}`);
    }
  }

  // TEST 1: Extract HLS stream for movie (Fight Club - 550)
  console.log("\n[Test 1] Extracting HLS stream for Fight Club (550)...");
  const movieStream = await fetchCinecalidadStream({
    type: "movie",
    tmdbId: 550,
  });

  assert("Movie stream extraction successful", movieStream?.success === true);
  assert("Movie stream contains .m3u8 URL", typeof movieStream?.hlsUrl === "string" && movieStream.hlsUrl.includes(".m3u8"));
  assert("Language is Spanish ('es')", movieStream?.lang === "es");

  // TEST 2: Verify M3U8 accessibility and Spanish audio
  if (movieStream?.hlsUrl) {
    console.log("\n[Test 2] Testing HTTP status and content of M3U8...");
    const res = await fetch(movieStream.hlsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      },
    });
    assert("M3U8 returns HTTP 200 OK", res.status === 200);
    assert("CORS header is wildcard (*)", res.headers.get("access-control-allow-origin") === "*");
    const manifest = await res.text();
    assert("Manifest contains Spanish audio track", manifest.includes("Español") || manifest.includes("language=\"es\"") || manifest.includes("LANGUAGE=\"es\""));
  }

  // TEST 3: Extract HLS stream for TV Show (Game of Thrones S1E1 - 1399)
  console.log("\n[Test 3] Extracting HLS stream for Game of Thrones S1E1 (1399)...");
  const tvStream = await fetchCinecalidadStream({
    type: "tv",
    tmdbId: 1399,
    season: 1,
    episode: 1,
  });
  assert("TV series stream extraction successful", tvStream?.success === true);
  assert("TV series stream contains .m3u8 URL", typeof tvStream?.hlsUrl === "string" && tvStream.hlsUrl.includes(".m3u8"));

  // TEST 4: Supabase Database Cache persistence and retrieval
  console.log("\n[Test 4] Testing Supabase DB stream caching status...");
  const testTargetId = "99999999";
  const dummyHls = "https://test.cinecalidad.stream/hls/master.m3u8";

  const saveRes = await setCachedStream({
    providerId: "cinecalidad",
    type: "movie",
    targetId: testTargetId,
    hlsUrl: dummyHls,
    ttlHours: 12,
  });

  const startTime = Date.now();
  const cached = await getCachedStream({
    providerId: "cinecalidad",
    type: "movie",
    targetId: testTargetId,
  });
  const elapsed = Date.now() - startTime;

  if (STREAM_CACHE_ENABLED) {
    assert("Cached stream retrieved successfully", cached?.hlsUrl === dummyHls);
    assert(`Cache latency is fast (<100ms, was ${elapsed}ms)`, elapsed < 100);
  } else {
    assert("Stream cache está desactivada (setCachedStream retorna false)", saveRes === false);
    assert("Stream cache está desactivada (getCachedStream retorna null)", cached === null);
  }

  console.log(`\nResults: ${passed}/${total} passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
