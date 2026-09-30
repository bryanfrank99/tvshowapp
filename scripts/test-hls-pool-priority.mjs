import { sortSourcesByPriority } from "../lib/sources.js";

// Mock sources
const mockSources = [
  {
    id: "vidcore",
    providerId: "vidcore",
    providerName: "S1",
    realName: "Vidcore",
    type: "iframe",
    url: "https://vidcore.example/embed",
    lang: "es",
    languages: ["es", "lat"],
    subtitles: [],
    priority: 10,
    isBeta: false,
  },
  {
    id: "embedmovies",
    providerId: "embedmovies",
    providerName: "S11",
    realName: "EmbedMovies",
    type: "iframe",
    url: "https://embedmovies.example/embed",
    lang: "es",
    languages: ["es"],
    subtitles: [],
    priority: 10,
    isBeta: false,
  },
  {
    id: "hls-pool-es",
    providerId: "hls",
    providerName: "HLS",
    realName: "HLS (ES)",
    type: "hls",
    url: "https://stream1.example/live.m3u8",
    backupUrls: ["https://stream2.example/live.m3u8"],
    lang: "es",
    languages: ["es"],
    subtitles: [],
    priority: 10,
    isBeta: false,
  },
  {
    id: "hls-pool-pt",
    providerId: "hls",
    providerName: "HLS",
    realName: "HLS (PT)",
    type: "hls",
    url: "https://watchplay.example/stream.m3u8",
    lang: "pt",
    languages: ["pt"],
    subtitles: [],
    priority: 10,
    isBeta: false,
  }
];

function runTests() {
  console.log("=== RUNNING HLS POOL PRIORITY CONFIGURATION TESTS ===");
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

  // TEST 1: HLS configured as Priority #1 in Spanish
  {
    const primaryByLang = { es: ["hls", "vidcore", "embedmovies"] };
    const sorted = sortSourcesByPriority(mockSources, "es", primaryByLang);
    assert("Spanish HLS pool is #1 when 'hls' is top priority in ES", sorted[0].id === "hls-pool-es");
    assert("Vidcore is #2 when placed second", sorted[1].id === "vidcore");
    assert("EmbedMovies is #3 when placed third", sorted[2].id === "embedmovies");
  }

  // TEST 2: Vidcore is #1, HLS is #2 in Spanish
  {
    const primaryByLang = { es: ["vidcore", "hls", "embedmovies"] };
    const sorted = sortSourcesByPriority(mockSources, "es", primaryByLang);
    assert("Vidcore is #1 when ranked first", sorted[0].id === "vidcore");
    assert("Spanish HLS pool is #2 when ranked second", sorted[1].id === "hls-pool-es");
  }

  // TEST 3: Language isolation: Portuguese HLS pool does not hijack Spanish user's priority
  {
    const primaryByLang = { es: ["hls", "vidcore"] };
    const sorted = sortSourcesByPriority(mockSources, "es", primaryByLang);
    const ptHlsIndex = sorted.findIndex((s) => s.id === "hls-pool-pt");
    const esHlsIndex = sorted.findIndex((s) => s.id === "hls-pool-es");
    const vidcoreIndex = sorted.findIndex((s) => s.id === "vidcore");
    assert("Spanish HLS is first", esHlsIndex === 0);
    assert("Spanish Vidcore is second", vidcoreIndex === 1);
    assert("Portuguese HLS does not take Spanish priority #1", ptHlsIndex > vidcoreIndex);
  }

  // TEST 4: Portuguese user with HLS pool as Priority #1
  {
    const primaryByLang = { pt: ["hls", "vidcore"] };
    const sorted = sortSourcesByPriority(mockSources, "pt", primaryByLang);
    assert("Portuguese HLS pool is #1 for PT user when 'hls' is prioritized", sorted[0].id === "hls-pool-pt");
  }

  console.log(`\nResults: ${passed}/${total} passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
