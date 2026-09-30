import assert from "node:assert";
import { sortSourcesByPriority } from "../lib/sources.ts";

console.log("=== INICIANDO VERIFICACIÓN DE SPEC 085: INDIVIDUAL HLS SERVERS ===");

// 1. Simular fuentes devueltas por los proveedores (S14, S18 en PT, S17 en ES, iframes)
const testSources = [
  {
    id: "embed69",
    providerId: "embed69",
    providerName: "S1",
    realName: "Embed69",
    ord: 1,
    type: "iframe",
    url: "https://embed69.org/video/test",
    lang: "pt",
    languages: ["pt"],
    priority: 100,
  },
  {
    id: "megaembed-hls",
    providerId: "megaembed",
    providerName: "HLS - S14",
    realName: "MegaEmbed (HLS)",
    ord: 14,
    type: "hls",
    url: "https://mgeb.top/hls/master.m3u8",
    backupUrls: ["https://mgeb.top/hls/mirror1.m3u8", "https://mgeb.top/hls/mirror2.m3u8"],
    lang: "pt",
    languages: ["pt"],
    priority: 120,
    isBeta: false,
  },
  {
    id: "watchplay-hls",
    providerId: "watchplay",
    providerName: "HLS - S18",
    realName: "WatchPlay (HLS)",
    ord: 18,
    type: "hls",
    url: "https://watchplay.shop/hls/playlist.m3u8",
    backupUrls: ["https://watchplay.shop/hls/mirror.m3u8"],
    lang: "pt",
    languages: ["pt"],
    priority: 120,
    isBeta: false,
  },
  {
    id: "nasriplay-hls",
    providerId: "nasriplay",
    providerName: "HLS - S17",
    realName: "NasriPlay (HLS)",
    ord: 17,
    type: "hls",
    url: "https://vimeos.net/stream/es.m3u8",
    backupUrls: [],
    lang: "es",
    languages: ["es", "lat"],
    priority: 120,
    isBeta: false,
  },
  {
    id: "reidoscanais",
    providerId: "reidoscanais",
    providerName: "S4",
    realName: "ReiDosCanais",
    ord: 4,
    type: "iframe",
    url: "https://reidoscanais.eu/embed/test",
    lang: "es",
    languages: ["es"],
    priority: 95,
  },
];

// Test 1: Ordenar para usuario en idioma portugués ("pt")
console.log("\n[Test 1] Ordenación para usuario Portugués (pt):");
const sortedPt = sortSourcesByPriority(testSources, "pt");

console.log("Orden resultante:");
sortedPt.forEach((s, idx) => {
  console.log(`  [${idx}] ${s.providerName} (ord: ${s.ord}, type: ${s.type}, lang: ${s.lang}, priority: ${s.priority})`);
});

// Aserciones Test 1
assert.strictEqual(sortedPt[0].providerName, "HLS - S14", "El servidor #0 debe ser HLS - S14");
assert.strictEqual(sortedPt[0].ord, 14, "HLS - S14 debe conservar ord: 14");
assert.strictEqual(sortedPt[0].backupUrls?.length, 2, "HLS - S14 debe conservar únicamente sus 2 mirrors propios");
assert.ok(!sortedPt[0].backupUrls?.includes("https://watchplay.shop/hls/playlist.m3u8"), "No debe cruzar URLs de S18 en S14");

assert.strictEqual(sortedPt[1].providerName, "HLS - S18", "El servidor #1 debe ser HLS - S18");
assert.strictEqual(sortedPt[1].ord, 18, "HLS - S18 debe conservar ord: 18");
assert.strictEqual(sortedPt[1].backupUrls?.length, 1, "HLS - S18 debe conservar únicamente su 1 mirror propio");

// Asegurar que NO existe ningún objeto virtual con ord: 0 ni providerName: "HLS"
const virtualPool = sortedPt.find((s) => s.ord === 0 || s.providerName === "HLS");
assert.strictEqual(virtualPool, undefined, "NO debe existir ninguna pool virtual ord: 0 o providerName: 'HLS'");

// Asegurar que las fuentes iframe en PT van después de las fuentes nativas HLS en PT
assert.strictEqual(sortedPt[2].providerName, "S1", "El servidor #2 debe ser el iframe S1 (pt)");

// Asegurar que las fuentes en español (S17, S4) van después de todas las portuguesas
assert.ok(sortedPt[3].lang === "es" || sortedPt[3].languages?.includes("es"), "Las fuentes en español deben ir después");
console.log("✓ Test 1 superado exitosamente.");

// Test 2: Ordenar para usuario en idioma español ("es")
console.log("\n[Test 2] Ordenación para usuario Español (es):");
const sortedEs = sortSourcesByPriority(testSources, "es");

console.log("Orden resultante:");
sortedEs.forEach((s, idx) => {
  console.log(`  [${idx}] ${s.providerName} (ord: ${s.ord}, type: ${s.type}, lang: ${s.lang})`);
});

assert.strictEqual(sortedEs[0].providerName, "HLS - S17", "Para español, el servidor #0 debe ser HLS - S17");
assert.strictEqual(sortedEs[0].ord, 17, "HLS - S17 debe conservar ord: 17");
assert.strictEqual(sortedEs[1].providerName, "S4", "Para español, el servidor #1 debe ser el iframe S4 (es)");
console.log("✓ Test 2 superado exitosamente.");

// Test 3: Simulación de conmutación limpia por fallback (useSourceFallback logic)
console.log("\n[Test 3] Simulación de Fallback de HLS - S14 a HLS - S18:");
const failedIds = [];
let activeSource = sortedPt[0]; // S14
console.log(`  Reproduciendo inicialmente: ${activeSource.providerName} (${activeSource.id})`);

// Simular fallo de S14
failedIds.push(activeSource.id);
const available = sortedPt.filter((s) => !failedIds.includes(s.id));
activeSource = available[0]; // Próximo disponible
console.log(`  S14 falló. Conmutando limpiamente a: ${activeSource.providerName} (${activeSource.id})`);

assert.strictEqual(activeSource.providerName, "HLS - S18", "El fallback debe conmutar directamente a HLS - S18");
assert.strictEqual(activeSource.type, "hls", "HLS - S18 debe ser un stream HLS nativo");

// Simular fallo de S18
failedIds.push(activeSource.id);
const availableAfterS18 = sortedPt.filter((s) => !failedIds.includes(s.id));
activeSource = availableAfterS18[0];
console.log(`  S18 falló. Conmutando limpiamente a: ${activeSource.providerName} (${activeSource.id})`);
assert.strictEqual(activeSource.providerName, "S1", "El siguiente fallback debe ser el iframe S1");
console.log("✓ Test 3 superado exitosamente.");

// Test 4: Función mergeExtractedStreams del cliente
console.log("\n[Test 4] Prueba de mergeExtractedStreams del cliente:");

function simulateMergeExtractedStreams(baseSources, itemsToMerge) {
  if (!itemsToMerge || itemsToMerge.length === 0) return baseSources;
  let updated = [...baseSources];

  for (const it of itemsToMerge) {
    const srvTag = it.tag || (it.ord ? `S${it.ord}` : "S1");
    const hlsSource = {
      id: it.isBeta ? `${it.providerId}-hls-beta` : `${it.providerId}-hls`,
      providerId: it.providerId,
      providerName: `HLS - ${srvTag}`,
      realName: `${it.realName || srvTag}${it.isBeta ? " (Beta)" : " (HLS)"}`,
      ord: it.ord,
      type: "hls",
      lang: it.lang,
      languages: [it.lang],
      priority: it.isBeta ? 80 : 120,
      url: it.hlsUrl,
      backupUrls: it.backupUrls,
      isBeta: Boolean(it.isBeta),
      tvOk: true,
      needsTmdb: true,
    };

    updated = updated.filter(
      (s) =>
        s.id !== it.providerId &&
        s.id !== hlsSource.id &&
        !(s.providerId === it.providerId && s.type !== "hls" && !s.id.includes("iframe"))
    );
    updated.push(hlsSource);
  }

  return updated;
}

const initialIframes = [
  { id: "megaembed", providerId: "megaembed", providerName: "S14", ord: 14, type: "iframe", url: "https://megaembed.org/e/1", lang: "pt" },
  { id: "watchplay", providerId: "watchplay", providerName: "S18", ord: 18, type: "iframe", url: "https://watchplay.shop/e/1", lang: "pt" },
];

// Supongamos que S18 termina de extraer primero
const afterS18 = simulateMergeExtractedStreams(initialIframes, [
  { providerId: "watchplay", ord: 18, tag: "S18", lang: "pt", hlsUrl: "https://wp.com/hls.m3u8", backupUrls: [], isBeta: false },
]);

assert.strictEqual(afterS18.length, 2);
const s18Hls = afterS18.find((s) => s.id === "watchplay-hls");
assert.ok(s18Hls, "Debe existir watchplay-hls");
assert.strictEqual(s18Hls.providerName, "HLS - S18");
assert.ok(afterS18.some((s) => s.id === "megaembed"), "megaembed iframe sigue existiendo mientras extrae");

// Ahora S14 termina de extraer tarde
const afterS14 = simulateMergeExtractedStreams(afterS18, [
  { providerId: "megaembed", ord: 14, tag: "S14", lang: "pt", hlsUrl: "https://mgeb.com/hls.m3u8", backupUrls: ["https://mgeb.com/b1.m3u8"], isBeta: false },
]);

assert.strictEqual(afterS14.length, 2);
const s14Hls = afterS14.find((s) => s.id === "megaembed-hls");
assert.ok(s14Hls, "Debe existir megaembed-hls");
assert.strictEqual(s14Hls.providerName, "HLS - S14");
assert.strictEqual(s14Hls.backupUrls.length, 1);
assert.strictEqual(s18Hls.backupUrls.length, 0, "S18 no fue modificado ni contaminado");

console.log("✓ Test 4 superado exitosamente.");

console.log("\n=== TODOS LOS TESTS DE SPEC 085 COMPLETADOS CON ÉXITO ===");
