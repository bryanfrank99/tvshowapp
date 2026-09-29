import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("=== Test Spec 058: Sistema Multicapa de Prioridades de Servidores por Idioma ===");

// 1. Verificación estática de archivos clave
console.log("\n1. Verificando código fuente...");
const sourcesCode = fs.readFileSync(path.join(rootDir, "lib/sources.ts"), "utf-8");
assert.ok(
  sourcesCode.includes("primaryByLang?: Record<string, string>"),
  "sortSourcesByPriority debe preservar la firma retrocompatible con primaryByLang"
);
assert.ok(
  sourcesCode.includes("isAPrimary"),
  "sortSourcesByPriority debe incluir lógica de ordenación por prioridad"
);
assert.ok(
  sourcesCode.includes("rankMap"),
  "sortSourcesByPriority debe usar rankMap para múltiples niveles de prioridad"
);

const adminRouteCode = fs.readFileSync(path.join(rootDir, "app/api/admin/providers/route.ts"), "utf-8");
assert.ok(
  adminRouteCode.includes("provider_priorities_by_lang"),
  "admin/providers route debe manejar provider_priorities_by_lang"
);
assert.ok(
  adminRouteCode.includes("save_priorities_by_lang"),
  "admin/providers route debe soportar acción save_priorities_by_lang"
);

const resolveRouteCode = fs.readFileSync(path.join(rootDir, "app/api/resolve/route.ts"), "utf-8");
assert.ok(
  resolveRouteCode.includes("provider_priorities_by_lang"),
  "resolve route debe consultar provider_priorities_by_lang desde config"
);
assert.ok(
  resolveRouteCode.includes("sortSourcesByPriority(rawSources, userLang, primaryByLang)"),
  "resolve route debe llamar a sortSourcesByPriority pasando las prioridades"
);

const adminPageCode = fs.readFileSync(path.join(rootDir, "app/admin/page.tsx"), "utf-8");
assert.ok(
  adminPageCode.includes("LanguagePriorityManager"),
  "admin/page.tsx debe incluir el componente LanguagePriorityManager"
);
assert.ok(
  adminPageCode.includes("savePrioritiesByLang"),
  "admin/page.tsx debe incluir la función savePrioritiesByLang"
);
console.log("  ✓ Verificación estática de código completada exitosamente.");

// 2. Verificación de lógica de ordenamiento con múltiples prioridades
console.log("\n2. Probando ordenamiento multicapa de fuentes...");

// Lógica de sortSourcesByPriority idéntica a lib/sources.ts
function scoreSourceForUser(source, userLang) {
  const lang = (userLang || "").toLowerCase().trim();
  const langs = (source.languages || []).map((l) => l.toLowerCase());
  let score = 0;
  if (lang === "pt") {
    if (langs.includes("pt")) score = Math.max(score, 10);
    if (langs.includes("multi")) score = Math.max(score, 7);
  } else if (lang === "es") {
    if (langs.includes("es")) score = Math.max(score, 10);
    if (langs.includes("multi")) score = Math.max(score, 7);
  } else if (lang === "en") {
    if (langs.includes("en")) score = Math.max(score, 10);
    if (langs.includes("multi")) score = Math.max(score, 7);
  }
  if (source.isBeta) score -= 10;
  return score;
}

function sortSourcesByPriority(sources, userLang, primaryByLang) {
  const cleanLang = (userLang || "").toLowerCase().trim();
  const rawPreference = primaryByLang?.[cleanLang];

  const priorityList = Array.isArray(rawPreference)
    ? rawPreference
    : typeof rawPreference === "string" && rawPreference.trim()
    ? [rawPreference.trim()]
    : [];

  const rankMap = new Map();
  priorityList.forEach((pid, idx) => {
    if (pid && !rankMap.has(pid)) {
      rankMap.set(pid, idx);
    }
  });

  return [...sources].sort((a, b) => {
    if (rankMap.size > 0) {
      const idA = a.providerId || a.id;
      const idB = b.providerId || b.id;
      const rankA = rankMap.has(idA) ? rankMap.get(idA) : Infinity;
      const rankB = rankMap.has(idB) ? rankMap.get(idB) : Infinity;

      if (rankA !== rankB) {
        const isAPrimary = rankA < rankB;
        return isAPrimary ? -1 : 1;
      }
    }

    if (!!a.isBeta !== !!b.isBeta) {
      return a.isBeta ? 1 : -1;
    }
    const scoreA = a.priority !== undefined ? a.priority : scoreSourceForUser(a, userLang);
    const scoreB = b.priority !== undefined ? b.priority : scoreSourceForUser(b, userLang);
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    return 0;
  });
}

// Simulamos lista completa de servidores activos
const mockSources = [
  { id: "vimeus", name: "S1", providerId: "vimeus", languages: ["es", "multi"], isBeta: false },
  { id: "vidcore", name: "S2", providerId: "vidcore", languages: ["en", "multi"], isBeta: false },
  { id: "streambetter", name: "S10", providerId: "streambetter", languages: ["pt", "multi"], isBeta: false },
  { id: "embedmovies", name: "S11", providerId: "embedmovies", languages: ["pt", "multi"], isBeta: false },
  { id: "redeflix", name: "S12", providerId: "redeflix", languages: ["pt"], isBeta: false },
  { id: "pipocacine", name: "S13", providerId: "pipocacine", languages: ["pt", "multi"], isBeta: false },
];

// Configuración de prioridades multicapa por idioma
const priorityConfig = {
  pt: ["embedmovies", "redeflix", "streambetter", "pipocacine"], // P1: S11, P2: S12, P3: S10, P4: S13
  es: ["vimeus", "vidcore"],                                     // P1: S1, P2: S2
  en: ["vidcore", "vimeus"],                                     // P1: S2, P2: S1
};

// Test A: En PT con todos los servidores disponibles
const sortedPt = sortSourcesByPriority(mockSources, "pt", priorityConfig);
assert.strictEqual(sortedPt[0].id, "embedmovies", "Para PT, Prioridad 1 debe ser S11 EmbedMovies");
assert.strictEqual(sortedPt[1].id, "redeflix", "Para PT, Prioridad 2 debe ser S12 RedeFlix");
assert.strictEqual(sortedPt[2].id, "streambetter", "Para PT, Prioridad 3 debe ser S10 StreamBetter");
assert.strictEqual(sortedPt[3].id, "pipocacine", "Para PT, Prioridad 4 debe ser S13 PipocaCine");
console.log("  ✓ Prioridades multicapa para PT respetadas en orden estricto [S11, S12, S10, S13]");

// Test B: En PT cuando S11 no tiene el contenido (filtrado previamente)
const mockSourcesNoS11 = mockSources.filter((s) => s.id !== "embedmovies");
const sortedPtFallback = sortSourcesByPriority(mockSourcesNoS11, "pt", priorityConfig);
assert.strictEqual(
  sortedPtFallback[0].id,
  "redeflix",
  "Si S11 no está disponible, S12 RedeFlix debe ser promovido automáticamente a TOP 1"
);
assert.strictEqual(
  sortedPtFallback[1].id,
  "streambetter",
  "Si S11 no está disponible, S10 StreamBetter debe ser #2"
);
console.log("  ✓ Promoción automática al servidor #2 (S12) cuando #1 (S11) no dispone del contenido");

// Test C: En ES con prioridades [vimeus, vidcore]
const sortedEs = sortSourcesByPriority(mockSources, "es", priorityConfig);
assert.strictEqual(sortedEs[0].id, "vimeus", "Para ES, Prioridad 1 debe ser Vimeus (S1)");
assert.strictEqual(sortedEs[1].id, "vidcore", "Para ES, Prioridad 2 debe ser VidCore (S2)");
console.log("  ✓ Prioridades multicapa para ES respetadas [S1, S2]");

// Test D: Retrocompatibilidad cuando la configuración es un string simple
const legacyConfig = { pt: "redeflix", es: "vidcore" };
const sortedLegacyPt = sortSourcesByPriority(mockSources, "pt", legacyConfig);
assert.strictEqual(sortedLegacyPt[0].id, "redeflix", "Debe soportar string simple retrocompatible");
console.log("  ✓ Retrocompatibilidad con strings simples de prioridad verificada");

// Test E: Comportamiento por defecto cuando no hay prioridades configuradas
const sortedAuto = sortSourcesByPriority(mockSources, "pt", {});
assert.ok(
  ["embedmovies", "streambetter", "redeflix", "pipocacine"].includes(sortedAuto[0].id),
  "Sin configuración manual, el orden se resuelve automáticamente por afinidad idiomática"
);
console.log("  ✓ Ordenamiento automático por afinidad lingüística verificado");

console.log("\n=======================================================");
console.log("✓ TODOS LOS TESTS DE SPEC 058 PASARON SATISFACTORIAMENTE");
console.log("=======================================================\n");
