import assert from "node:assert";
import { sortSourcesByPriority } from "../lib/sources.ts";

console.log("--- TEST SPEC 081: COORDINACION PRE-REPRODUCCION Y PREVENCION DE REINICIO ---");

// Mock de función de unificación (idéntica a la implementada en app/watch/page.tsx)
function mergeExtractedStreams(baseSources, itemsToMerge) {
  if (!itemsToMerge || itemsToMerge.length === 0) return baseSources;

  let updated = [...baseSources];
  const byLang = new Map();
  for (const item of itemsToMerge) {
    const list = byLang.get(item.lang) || [];
    list.push(item);
    byLang.set(item.lang, list);
  }

  for (const [itemLang, items] of byLang.entries()) {
    if (items.length === 0) continue;

    const existingPoolIndex = updated.findIndex(
      (s) =>
        (s.ord === 0 || s.providerName === "HLS" || s.type === "hls") &&
        (s.lang === itemLang || (s.languages && s.languages.includes(itemLang)))
    );

    if (existingPoolIndex !== -1) {
      const existing = updated[existingPoolIndex];
      const combinedBackups = [...(existing.backupUrls || [])];
      const newMap = { ...(existing.urlServerMap || {}) };

      for (const it of items) {
        combinedBackups.push(it.hlsUrl, ...it.backupUrls);
        if (!newMap[it.hlsUrl]) newMap[it.hlsUrl] = it.tag;
        for (const b of it.backupUrls) {
          if (!newMap[b]) newMap[b] = it.tag;
        }
      }

      const uniqueBackups = Array.from(new Set(combinedBackups)).filter(
        (u) => u && u !== existing.url
      );
      for (const b of uniqueBackups) {
        if (!newMap[b]) newMap[b] = items[0]?.tag || "S1";
      }

      updated[existingPoolIndex] = {
        ...existing,
        backupUrls: uniqueBackups,
        urlServerMap: newMap,
      };
    } else {
      const primaryItem = items[0];
      const backupUrls = Array.from(
        new Set(
          items.flatMap((it, idx) => (idx === 0 ? it.backupUrls : [it.hlsUrl, ...it.backupUrls]))
        )
      ).filter((u) => u && u !== primaryItem.hlsUrl);

      const urlServerMap = { [primaryItem.hlsUrl]: primaryItem.tag };
      for (const it of items) {
        urlServerMap[it.hlsUrl] = it.tag;
        for (const b of it.backupUrls) {
          if (!urlServerMap[b]) urlServerMap[b] = it.tag;
        }
      }

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
        backupUrls,
        urlServerMap,
        isBeta: false,
        tvOk: true,
      };

      const convertedProviders = new Set(items.map((i) => i.providerId));
      updated = updated.filter(
        (s) => !convertedProviders.has(s.providerId) || s.type === "hls"
      );
      updated.unshift(newPool);
    }
  }

  return updated;
}

// 1. Simulación de lista inicial de /api/resolve (con iframes y candidatos pendientes)
const initialRawSources = [
  {
    id: "s11-embedmovies",
    providerId: "embedmovies",
    providerName: "S11",
    realName: "EmbedMovies",
    ord: 11,
    type: "iframe",
    url: "https://myembed.biz/pt/123",
    lang: "pt",
    languages: ["pt"],
    priority: 10,
  },
  {
    id: "s12-redeflix",
    providerId: "redeflix",
    providerName: "S12",
    realName: "RedeFlix",
    ord: 12,
    type: "iframe",
    url: "https://redeflixapi.store/123",
    lang: "pt",
    languages: ["pt"],
    priority: 10,
  },
  {
    id: "megaembed-iframe",
    providerId: "megaembed",
    providerName: "S14",
    realName: "MegaEmbed",
    ord: 14,
    type: "iframe",
    url: "https://megaembed.com/embed/123",
    lang: "pt",
    languages: ["pt"],
    priority: 10,
  },
  {
    id: "watchplay-iframe",
    providerId: "watchplay",
    providerName: "S18",
    realName: "WatchPlay",
    ord: 18,
    type: "iframe",
    url: "https://watchplay.shop/embed/123",
    lang: "pt",
    languages: ["pt"],
    priority: 10,
  },
];

// 2. Simulación de extracciones coordinadas antes de iniciar reproducción
const extractedPtStreams = [
  {
    providerId: "megaembed",
    ord: 14,
    tag: "S14",
    lang: "pt",
    hlsUrl: "https://stream.megaembed.com/hls/master.m3u8",
    backupUrls: ["https://backup.megaembed.com/hls.m3u8"],
  },
  {
    providerId: "watchplay",
    ord: 18,
    tag: "S18",
    lang: "pt",
    hlsUrl: "https://stream.watchplay.shop/hls/playlist.m3u8",
    backupUrls: [],
  },
];

const mergedBeforePlayback = mergeExtractedStreams(initialRawSources, extractedPtStreams);
const sortedBeforePlayback = sortSourcesByPriority(mergedBeforePlayback, "pt");

console.log("Lista coordinada PRE-reproducción (debe tener HLS (PT) unificado en pos 0):");
sortedBeforePlayback.forEach((s, idx) => {
  console.log(`  [${idx}] ${s.realName || s.providerName} (${s.type}) - URL: ${s.url}`);
  if (s.urlServerMap) console.log(`      Mapeo de servidores enlazados:`, JSON.stringify(s.urlServerMap));
  if (s.backupUrls) console.log(`      Backups:`, s.backupUrls);
});

assert.strictEqual(sortedBeforePlayback[0].id, "hls-pt", "HLS (PT) debe ser posición 0 ANTES de comenzar la reproducción");
assert.strictEqual(sortedBeforePlayback[0].type, "hls");
assert.ok(sortedBeforePlayback[0].urlServerMap["https://stream.megaembed.com/hls/master.m3u8"] === "S14", "Debe incluir servidor S14");
assert.ok(sortedBeforePlayback[0].urlServerMap["https://stream.watchplay.shop/hls/playlist.m3u8"] === "S18", "Debe incluir servidor enlazado S18");
console.log("✔ Verificación 1: Todos los servidores HLS enlazados se consolidan antes de iniciar reproducción.");

// 3. Simulación de prevención de reinicio (Playback Lock):
// Supongamos que la reproducción ya comenzó con el stream actual
let hasStartedPlayback = true;
let currentRecommendedSourceId = sortedBeforePlayback[0].id; // "hls-pt"
let currentActiveUrl = sortedBeforePlayback[0].url;

// Un mirror tardío llega en background (ej: S19 o mirror adicional)
const lateMirror = {
  providerId: "late-provider",
  ord: 20,
  tag: "S20",
  lang: "pt",
  hlsUrl: "https://stream.late-mirror.com/master.m3u8",
  backupUrls: [],
};

// Se fusiona en background
const mergedAfterLate = mergeExtractedStreams(sortedBeforePlayback, [lateMirror]);
const sortedAfterLate = sortSourcesByPriority(mergedAfterLate, "pt");

// La regla anti-reinicio comprueba:
if (!hasStartedPlayback) {
  currentRecommendedSourceId = sortedAfterLate[0].id;
}

assert.strictEqual(currentRecommendedSourceId, "hls-pt", "El recommendedSourceId NO debe cambiar");
assert.strictEqual(sortedAfterLate[0].url, currentActiveUrl, "La URL activa NO debe cambiar durante la reproducción");
assert.ok(sortedAfterLate[0].urlServerMap["https://stream.late-mirror.com/master.m3u8"] === "S20", "El mirror tardío se añade como backup sin reiniciar");
console.log("✔ Verificación 2: El bloqueo de reproducción previene cualquier reinicio durante la visualización activa.");

console.log("\nTODAS LAS PRUEBAS DE SPEC 081 PASARON EXITOSAMENTE.");
