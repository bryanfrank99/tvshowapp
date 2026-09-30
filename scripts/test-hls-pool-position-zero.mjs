import assert from "node:assert";
import { sortSourcesByPriority, isHlsPoolSource, scoreSourceForUser } from "../lib/sources.ts";

console.log("--- TEST SPEC 080: HLS POOL EN POSICION 0 RESPETANDO IDIOMA DEL USUARIO ---");

// Mock de fuentes
const mockSources = [
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
    subtitles: [],
    priority: 10,
    isBeta: false,
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
    subtitles: [],
    priority: 10,
    isBeta: false,
  },
  {
    id: "hls-pool-es",
    providerId: "hls",
    providerName: "HLS",
    realName: "HLS (ES)",
    ord: 0,
    type: "hls",
    url: "https://stream.es/master.m3u8",
    backupUrls: ["https://stream.es/backup1.m3u8"],
    urlServerMap: {
      "https://stream.es/master.m3u8": "S17",
      "https://stream.es/backup1.m3u8": "S19",
    },
    lang: "es",
    languages: ["es", "lat"],
    subtitles: [],
    priority: 120,
    isBeta: false,
  },
  {
    id: "s17-iframe",
    providerId: "nasriplay",
    providerName: "S17",
    realName: "NasriPlay",
    ord: 17,
    type: "iframe",
    url: "https://nsrplay.space/embed/123",
    lang: "es",
    languages: ["es", "lat"],
    subtitles: [],
    priority: 95,
    isBeta: false,
  },
  {
    id: "s19-iframe",
    providerId: "cinecalidad",
    providerName: "S19",
    realName: "Cinecalidad",
    ord: 19,
    type: "iframe",
    url: "https://cinecalidad.is/embed/123",
    lang: "es",
    languages: ["es", "lat"],
    subtitles: [],
    priority: 90,
    isBeta: false,
  },
];

const mockHlsPt = {
  id: "hls-pool-pt",
  providerId: "hls",
  providerName: "HLS",
  realName: "HLS (PT)",
  ord: 0,
  type: "hls",
  url: "https://stream.pt/master.m3u8",
  backupUrls: ["https://stream.pt/backup.m3u8"],
  urlServerMap: {
    "https://stream.pt/master.m3u8": "S14",
    "https://stream.pt/backup.m3u8": "S18",
  },
  lang: "pt",
  languages: ["pt"],
  subtitles: [],
  priority: 120,
  isBeta: false,
};

// 1. Verificación de isHlsPoolSource
assert.strictEqual(isHlsPoolSource(mockHlsPt), true, "mockHlsPt debe ser reconocido como HLS pool");
assert.strictEqual(isHlsPoolSource(mockSources[2]), true, "hls-pool-es debe ser reconocido como HLS pool");
assert.strictEqual(isHlsPoolSource(mockSources[0]), false, "s11 no debe ser reconocido como HLS pool");
console.log("✔ isHlsPoolSource identificado correctamente.");

// 2. Escenario: Usuario PT CON pool HLS (PT) presente
const sourcesWithPtPool = [mockHlsPt, ...mockSources];
const sortedPtWithHls = sortSourcesByPriority(sourcesWithPtPool, "pt");
console.log("Orden para PT con HLS PT disponible:");
sortedPtWithHls.forEach((s, idx) => console.log(`  [${idx}] ${s.realName || s.providerName} (${s.lang}, ${s.type})`));

assert.strictEqual(sortedPtWithHls[0].id, "hls-pool-pt", "HLS (PT) DEBE aparecer en posición 0 para usuario PT");
assert.strictEqual(sortedPtWithHls[1].lang, "pt", "La posición 1 debe ser un servidor portugués");
assert.strictEqual(sortedPtWithHls[2].lang, "pt", "La posición 2 debe ser un servidor portugués");
assert.strictEqual(sortedPtWithHls[3].lang, "es", "Los servidores en español solo aparecen al final como fallback");
console.log("✔ Escenario 1 pasado: HLS (PT) está estrictamente en posición 0 para usuario PT.");

// 3. Escenario: Usuario PT SIN pool HLS (PT) (solo iframes PT y HLS ES)
const sortedPtWithoutHls = sortSourcesByPriority(mockSources, "pt");
console.log("Orden para PT sin HLS PT:");
sortedPtWithoutHls.forEach((s, idx) => console.log(`  [${idx}] ${s.realName || s.providerName} (${s.lang}, ${s.type})`));

assert.strictEqual(sortedPtWithoutHls[0].lang, "pt", "La posición 0 debe respetar el idioma del usuario (portugués)");
assert.strictEqual(sortedPtWithoutHls[1].lang, "pt", "La posición 1 debe respetar el idioma del usuario (portugués)");
assert.strictEqual(sortedPtWithoutHls[2].id, "hls-pool-es", "El HLS (ES) solo aparece como fallback tras los servidores en portugués");
console.log("✔ Escenario 2 pasado: Idioma del usuario respetado cuando no hay HLS en su idioma.");

// 4. Escenario: Usuario ES CON pool HLS (ES) presente
const sortedEs = sortSourcesByPriority(sourcesWithPtPool, "es");
console.log("Orden para ES con HLS ES disponible:");
sortedEs.forEach((s, idx) => console.log(`  [${idx}] ${s.realName || s.providerName} (${s.lang}, ${s.type})`));

assert.strictEqual(sortedEs[0].id, "hls-pool-es", "HLS (ES) DEBE aparecer en posición 0 para usuario ES");
assert.strictEqual(sortedEs[1].lang, "es", "La posición 1 debe ser un servidor en español");
assert.strictEqual(sortedEs[2].lang, "es", "La posición 2 debe ser un servidor en español");
assert.strictEqual(sortedEs[3].lang, "pt", "Los servidores en portugués solo aparecen al final como fallback");
console.log("✔ Escenario 3 pasado: HLS (ES) está estrictamente en posición 0 para usuario ES.");

// 5. Escenario: Admin configuró prioridades explícitas pero existe pool HLS del idioma
const adminConfig = {
  pt: ["s12-redeflix", "s11-embedmovies"], // admin puso un iframe como preferencia
};
const sortedWithAdmin = sortSourcesByPriority(sourcesWithPtPool, "pt", adminConfig);
console.log("Orden para PT con configuración de admin priorizando iframes:");
sortedWithAdmin.forEach((s, idx) => console.log(`  [${idx}] ${s.realName || s.providerName} (${s.lang}, ${s.type})`));

assert.strictEqual(sortedWithAdmin[0].id, "hls-pool-pt", "HLS pool aún DEBE estar en posición 0 por regla arquitectónica");
assert.strictEqual(sortedWithAdmin[1].id, "s12-redeflix", "S12 debe ir en posición 1 por prioridad del admin");
assert.strictEqual(sortedWithAdmin[2].id, "s11-embedmovies", "S11 debe ir en posición 2 por prioridad del admin");
console.log("✔ Escenario 4 pasado: Pool HLS gana la posición 0 y los iframes respetan el orden admin.");

console.log("\nTODAS LAS PRUEBAS PASARON EXITOSAMENTE.");
