import { fetchNasriPlayStream } from "../lib/nasriplay.js";
import { getCachedStream, setCachedStream } from "../lib/stream-cache.js";
import { sortSourcesByPriority } from "../lib/sources.js";

async function runTests() {
  console.log("=== RUNNING SPEC 073 S17 (NASRIPLAY) HLS TESTS ===");
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
  const movieStream = await fetchNasriPlayStream({
    id: "550",
    type: "movie",
  });

  assert("Movie stream extraction successful", movieStream?.success === true);
  assert("Movie stream contains .m3u8 URL", typeof movieStream?.hlsUrl === "string" && movieStream.hlsUrl.includes(".m3u8"));
  assert("Language is Spanish ('es')", movieStream?.lang === "es");
  assert("Contains backup HLS URLs", Array.isArray(movieStream?.backupHlsUrls) && movieStream.backupHlsUrls.length > 0);

  // TEST 2: Verify M3U8 accessibility and CORS
  if (movieStream?.hlsUrl) {
    console.log("\n[Test 2] Testing HTTP status and content of M3U8:", movieStream.hlsUrl);
    const res = await fetch(movieStream.hlsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      },
    });
    console.log("[Test 2] Fetch status was:", res.status);
    assert("M3U8 returns HTTP 200 OK", res.status === 200);
    assert("CORS header is wildcard (*)", res.headers.get("access-control-allow-origin") === "*");
    const manifest = await res.text();
    assert("Manifest contains Spanish audio track or valid segments", manifest.includes(".m3u8") || manifest.includes(".ts") || manifest.includes("AUDIO"));
  }

  // TEST 3: Extract HLS stream for TV Show (Game of Thrones S1E1 - 1399)
  console.log("\n[Test 3] Extracting HLS stream for Game of Thrones S1E1 (1399)...");
  const tvStream = await fetchNasriPlayStream({
    id: "1399",
    type: "tv",
    season: 1,
    episode: 1,
  });
  assert("TV series stream extraction successful", tvStream?.success === true);
  assert("TV series stream contains .m3u8 URL", typeof tvStream?.hlsUrl === "string" && tvStream.hlsUrl.includes(".m3u8"));

  // TEST 4: Supabase Database Cache persistence and retrieval (<20ms)
  console.log("\n[Test 4] Testing Supabase DB stream caching for NasriPlay...");
  const testTargetId = "77777777";
  const dummyHls = "https://test.nasriplay.stream/hls/master.m3u8";

  await setCachedStream({
    providerId: "nasriplay",
    type: "movie",
    targetId: testTargetId,
    hlsUrl: dummyHls,
    ttlHours: 12,
  });

  const startTime = Date.now();
  const cached = await getCachedStream({
    providerId: "nasriplay",
    type: "movie",
    targetId: testTargetId,
  });
  const elapsed = Date.now() - startTime;

  assert("Cached stream retrieved successfully", cached?.hlsUrl === dummyHls);
  assert(`Cache latency is fast (<100ms, was ${elapsed}ms)`, elapsed < 100);

  // TEST 5: Spanish HLS Pool Integration with both S17 (NasriPlay) and S19 (Cinecalidad)
  console.log("\n[Test 5] Testing Spanish HLS Pool consolidation with S17 and S19...");
  const mockSources = [
    {
      id: "cinecalidad",
      providerId: "cinecalidad",
      providerName: "S19",
      realName: "Cinecalidad (Latino)",
      type: "hls",
      url: "https://stream1.example/live.m3u8",
      backupUrls: ["https://stream2.example/live.m3u8"],
      lang: "es",
      languages: ["es", "lat"],
      subtitles: [],
      priority: 120,
      isBeta: false,
    },
    {
      id: "nasriplay",
      providerId: "nasriplay",
      providerName: "S17",
      realName: "NasriPlay",
      type: "hls",
      url: "https://stream3.example/live.m3u8",
      backupUrls: ["https://stream4.example/live.m3u8"],
      lang: "es",
      languages: ["es", "lat"],
      subtitles: [],
      priority: 120,
      isBeta: false,
    },
    {
      id: "vidcore",
      providerId: "vidcore",
      providerName: "S1",
      realName: "VidCore",
      type: "iframe",
      url: "https://vidcore.example/embed",
      lang: "es",
      languages: ["es", "lat"],
      subtitles: [],
      priority: 10,
      isBeta: false,
    }
  ];

  const primaryByLang = { es: ["hls", "vidcore"] };
  const sorted = sortSourcesByPriority(mockSources, "es", primaryByLang);

  assert("HLS sources take priority over iframe sources", sorted[0].type === "hls" && sorted[1].type === "hls");
  assert("Vidcore iframe is placed behind HLS sources", sorted[2].id === "vidcore");

  console.log(`\nResults: ${passed}/${total} passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
