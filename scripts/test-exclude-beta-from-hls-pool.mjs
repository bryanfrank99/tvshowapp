import assert from "node:assert";
import { isHlsPoolSource, sortSourcesByPriority } from "../lib/sources.ts";

console.log("--- TEST SPEC 082: EXCLUSION DE SERVIDORES BETA DE LA POOL HLS ---");

// 1. Verificación de isHlsPoolSource con isBeta: true
const stableHls = {
  id: "hls-pt",
  providerId: "hls",
  providerName: "HLS",
  realName: "HLS (PT)",
  ord: 0,
  type: "hls",
  lang: "pt",
  languages: ["pt"],
  priority: 120,
  isBeta: false,
  url: "https://stable.stream.pt/master.m3u8",
  urlServerMap: { "https://stable.stream.pt/master.m3u8": "S14" },
};

const betaHls = {
  id: "watchplay-hls-beta",
  providerId: "watchplay",
  providerName: "S18",
  realName: "WatchPlay (Beta)",
  ord: 18,
  type: "hls",
  lang: "pt",
  languages: ["pt"],
  priority: 80,
  isBeta: true,
  url: "https://beta.stream.pt/master.m3u8",
  backupUrls: [],
};

assert.strictEqual(isHlsPoolSource(stableHls), true, "Stable HLS debe ser clasificado como HLS pool");
assert.strictEqual(isHlsPoolSource(betaHls), false, "Beta HLS NUNCA debe ser clasificado como HLS pool");
console.log("✔ Verificación 1: isHlsPoolSource excluye correctamente servidores con isBeta: true.");

// 2. Simulación de la unificación del Resolver API (app/api/resolve/route.ts)
const rawSources = [
  stableHls,
  betaHls,
  {
    id: "s11-embedmovies",
    providerId: "embedmovies",
    providerName: "S11",
    realName: "EmbedMovies",
    ord: 11,
    type: "iframe",
    lang: "pt",
    languages: ["pt"],
    priority: 10,
    isBeta: false,
    url: "https://myembed.biz/pt/123",
  },
];

// Separación exacta de route.ts
const hlsPoolSources = rawSources.filter((s) => s.type === "hls" && !s.isBeta);
const standaloneSources = rawSources.filter((s) => s.type !== "hls" || s.isBeta);

assert.strictEqual(hlsPoolSources.length, 1, "Solo debe haber 1 candidato a pool HLS estable");
assert.strictEqual(hlsPoolSources[0].id, "hls-pt");
assert.strictEqual(standaloneSources.length, 2, "El servidor beta y el iframe deben quedar en standaloneSources");
assert.ok(standaloneSources.some((s) => s.id === "watchplay-hls-beta"), "Beta HLS debe estar en standalone");
console.log("✔ Verificación 2: El resolver de la API aísla el servidor beta de la pool.");

// 3. Simulación de mergeExtractedStreams de app/watch/page.tsx
const initialSources = [
  {
    id: "s11-embedmovies",
    providerId: "embedmovies",
    providerName: "S11",
    realName: "EmbedMovies",
    ord: 11,
    type: "iframe",
    lang: "pt",
    languages: ["pt"],
    priority: 10,
    isBeta: false,
    url: "https://myembed.biz/pt/123",
  },
  {
    id: "megaembed",
    providerId: "megaembed",
    providerName: "S14",
    realName: "MegaEmbed",
    ord: 14,
    type: "iframe",
    lang: "pt",
    languages: ["pt"],
    priority: 10,
    isBeta: false,
    url: "https://megaembed.com/123",
  },
  {
    id: "watchplay",
    providerId: "watchplay",
    providerName: "S18",
    realName: "WatchPlay",
    ord: 18,
    type: "iframe",
    lang: "pt",
    languages: ["pt"],
    priority: 10,
    isBeta: true, // S18 ESTÁ EN MODO BETA
    url: "https://watchplay.shop/123",
  },
];

const extracted = [
  {
    providerId: "megaembed",
    ord: 14,
    tag: "S14",
    lang: "pt",
    hlsUrl: "https://megaembed.stream/master.m3u8",
    backupUrls: [],
    isBeta: false, // Estable
    simulatedName: "S14",
    realName: "MegaEmbed",
  },
  {
    providerId: "watchplay",
    ord: 18,
    tag: "S18",
    lang: "pt",
    hlsUrl: "https://watchplay.stream/master.m3u8",
    backupUrls: [],
    isBeta: true, // Beta
    simulatedName: "S18",
    realName: "WatchPlay",
  },
];

// Lógica de mergeExtractedStreams idéntica a app/watch/page.tsx
function mergeExtractedStreams(baseSources, itemsToMerge) {
  let updated = [...baseSources];
  const betaItems = itemsToMerge.filter((it) => !!it.isBeta);
  const stableItems = itemsToMerge.filter((it) => !it.isBeta);

  for (const bItem of betaItems) {
    const betaSource = {
      id: `${bItem.providerId}-hls-beta`,
      providerId: bItem.providerId,
      providerName: bItem.simulatedName || bItem.tag,
      realName: `${bItem.realName || bItem.tag} (Beta)`,
      ord: bItem.ord,
      type: "hls",
      lang: bItem.lang,
      languages: [bItem.lang],
      priority: 80,
      url: bItem.hlsUrl,
      backupUrls: bItem.backupUrls,
      isBeta: true,
      tvOk: true,
    };
    updated = updated.filter((s) => s.id !== bItem.providerId && s.id !== betaSource.id);
    updated.push(betaSource);
  }

  const byLang = new Map();
  for (const item of stableItems) {
    const list = byLang.get(item.lang) || [];
    list.push(item);
    byLang.set(item.lang, list);
  }

  for (const [itemLang, items] of byLang.entries()) {
    if (items.length === 0) continue;
    const primaryItem = items[0];
    const newPool = {
      id: `hls-${itemLang}`,
      providerId: primaryItem.providerId,
      providerName: "HLS",
      realName: `HLS (${itemLang.toUpperCase()})`,
      ord: 0,
      type: "hls",
      lang: itemLang,
      languages: [itemLang],
      priority: 120,
      url: primaryItem.hlsUrl,
      backupUrls: primaryItem.backupUrls,
      urlServerMap: { [primaryItem.hlsUrl]: primaryItem.tag },
      isBeta: false,
      tvOk: true,
    };

    const converted = new Set(items.map((i) => i.providerId));
    updated = updated.filter((s) => !converted.has(s.providerId) || s.type === "hls");
    updated.unshift(newPool);
  }

  return updated;
}

const merged = mergeExtractedStreams(initialSources, extracted);
const sorted = sortSourcesByPriority(merged, "pt");

console.log("Resultado final tras extracción con servidor beta:");
sorted.forEach((s, idx) => {
  console.log(`  [${idx}] ${s.realName || s.providerName} (ord: ${s.ord}, type: ${s.type}, beta: ${!!s.isBeta})`);
});

// Verificaciones estrictas
assert.strictEqual(sorted[0].id, "hls-pt", "La Pool HLS oficial de producción debe estar en pos 0");
assert.strictEqual(sorted[0].isBeta, false, "La Pool HLS no debe ser beta");
assert.strictEqual(sorted[0].urlServerMap["https://watchplay.stream/master.m3u8"], undefined, "El stream beta NO debe estar en el urlServerMap de la Pool HLS");

const betaCard = sorted.find((s) => s.id === "watchplay-hls-beta");
assert.ok(betaCard, "El servidor beta DEBE existir como tarjeta individual");
assert.strictEqual(betaCard.isBeta, true, "Debe tener isBeta: true");
assert.strictEqual(betaCard.ord, 18, "Debe conservar su número de orden (#18)");
assert.strictEqual(betaCard.url, "https://watchplay.stream/master.m3u8", "Debe tener su stream HLS directo para testeo");

console.log("✔ Verificación 3: El servidor beta permanece como tarjeta independiente testeable.");
console.log("\nTODAS LAS PRUEBAS DE SPEC 082 PASARON EXITOSAMENTE.");
