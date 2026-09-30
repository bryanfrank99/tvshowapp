// scripts/test-hls-lang-isolation.mjs
// Test unitario para verificar el aislamiento estricto de idiomas en Pools HLS

import assert from "assert";

console.log("=== TEST SUITE: AISLAMIENTO DE IDIOMAS EN POOLS HLS (SPEC 070) ===");

// Emular la función de familia lingüística de app/api/resolve/route.ts
const getLanguageFamily = (langCode = "es") => {
  const l = (langCode || "").toLowerCase().trim();
  if (l === "es" || l === "lat" || l.includes("es") || l.includes("lat")) return "es";
  if (l === "pt" || l.includes("pt")) return "pt";
  if (l === "en" || l.includes("en")) return "en";
  return l || "other";
};

// Mock de fuentes HLS extraídas
const rawHlsSources = [
  {
    id: "megaembed_es",
    type: "hls",
    providerName: "S14",
    lang: "es",
    languages: ["es"],
    url: "https://cdn.example.com/es/stream1.m3u8",
    backupUrls: ["https://cdn.example.com/es/stream1_alt.m3u8"],
  },
  {
    id: "cinecalidad_hls",
    type: "hls",
    providerName: "S16",
    lang: "lat",
    languages: ["lat", "es"],
    url: "https://cdn.example.com/lat/stream2.m3u8",
    backupUrls: [],
  },
  {
    id: "watchplay_pt",
    type: "hls",
    providerName: "S18",
    lang: "pt",
    languages: ["pt"],
    url: "https://cdn.example.com/pt/watchplay.m3u8",
    backupUrls: [],
  },
  {
    id: "redeflix_pt_hls",
    type: "hls",
    providerName: "S19",
    lang: "pt",
    languages: ["pt"],
    url: "https://cdn.example.com/pt/redeflix.m3u8",
    backupUrls: [],
  },
];

// Agrupación aislada por familia lingüística
const hlsByLang = new Map();
for (const src of rawHlsSources) {
  const audios = src.languages && src.languages.length ? src.languages : [src.lang];
  const fam = getLanguageFamily(audios[0] || src.lang);
  const existing = hlsByLang.get(fam) || [];
  existing.push(src);
  hlsByLang.set(fam, existing);
}

const consolidatedHls = [];
for (const [langFam, groupSources] of hlsByLang.entries()) {
  const primaryHls = { ...groupSources[0] };
  if (groupSources.length > 1) {
    const otherBackupUrls = groupSources
      .slice(1)
      .flatMap((s) => [s.url, ...(s.backupUrls || [])])
      .filter((u) => u && u !== primaryHls.url);

    primaryHls.backupUrls = Array.from(
      new Set([...(primaryHls.backupUrls || []), ...otherBackupUrls])
    );
  }
  primaryHls.providerName = "HLS";
  primaryHls.realName = `HLS (${langFam.toUpperCase()})`;
  primaryHls.ord = 0;
  consolidatedHls.push(primaryHls);
}

// 1. Validar que se crearon exactamente 2 pools (ES y PT)
assert.strictEqual(consolidatedHls.length, 2, "Deben existir exactamente 2 pools HLS consolidados (ES y PT)");

// 2. Validar Pool Español
const esPool = consolidatedHls.find((s) => s.lang === "es");
assert(esPool, "El pool ES debe existir");
assert.strictEqual(esPool.providerName, "HLS");
assert(esPool.backupUrls.includes("https://cdn.example.com/lat/stream2.m3u8"), "El stream latino/español debe estar en backups de ES");
assert(!esPool.backupUrls.some((u) => u.includes("/pt/")), "CRÍTICO: El pool Español NUNCA debe contener URLs en Portugués");
console.log("   ✅ Pool Español validado: backups exclusivamente en Español/Latino:", esPool.backupUrls);

// 3. Validar Pool Portugués
const ptPool = consolidatedHls.find((s) => s.lang === "pt");
assert(ptPool, "El pool PT debe existir");
assert.strictEqual(ptPool.providerName, "HLS");
assert(ptPool.backupUrls.includes("https://cdn.example.com/pt/redeflix.m3u8"), "Redeflix PT debe estar como backup de WatchPlay PT");
assert(!ptPool.backupUrls.some((u) => u.includes("/es/") || u.includes("/lat/")), "CRÍTICO: El pool Portugués NUNCA debe contener URLs en Español");
console.log("   ✅ Pool Portugués validado: backups exclusivamente en Portugués:", ptPool.backupUrls);

console.log("=== TODOS LOS TESTS DE AISLAMIENTO LINGÜÍSTICO PASARON CON ÉXITO ===");
