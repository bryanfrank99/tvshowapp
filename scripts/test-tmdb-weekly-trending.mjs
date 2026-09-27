import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

console.log("🧪 Iniciando pruebas de 'Tendencia semanal de TMDB'...");

// 1. Verificar traducciones en lib/dict.ts
const dictContent = fs.readFileSync(path.join(root, "lib", "dict.ts"), "utf8");

assert.ok(dictContent.includes('top10: "Tendencia semanal de TMDB"'), "dict.ts debe contener 'Tendencia semanal de TMDB' en español");
assert.ok(dictContent.includes('top10: "TMDB Weekly Trending"'), "dict.ts debe contener 'TMDB Weekly Trending' en inglés");
assert.ok(dictContent.includes('top10: "Tendência semanal do TMDB"'), "dict.ts debe contener 'Tendência semanal do TMDB' en portugués");
console.log("  ✓ Traducciones de 'top10' validadas (es, en, pt)");

// 2. Verificar lib/catalog.ts
const catalogContent = fs.readFileSync(path.join(root, "lib", "catalog.ts"), "utf8");
assert.ok(catalogContent.includes("export const getTop10TmdbWeek = getTop10ImdbWeek;"), "catalog.ts debe exportar getTop10TmdbWeek");
assert.ok(!catalogContent.includes(".sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))\n      .slice(0, 10)\n      .map((x, i) => ({"), "catalog.ts no debe alterar el orden nativo de tendencia semanal de TMDB con vote_average");
console.log("  ✓ Orden nativo de tendencia semanal de TMDB preservado en catalog.ts");

// 3. Verificar app/page.tsx
const pageContent = fs.readFileSync(path.join(root, "app", "page.tsx"), "utf8");
assert.ok(pageContent.includes("getTop10TmdbWeek"), "app/page.tsx debe usar getTop10TmdbWeek");
assert.ok(pageContent.includes("d.top10"), "app/page.tsx debe usar d.top10 para el título");
console.log("  ✓ app/page.tsx configurado con getTop10TmdbWeek y d.top10");

console.log("🎉 ¡Todas las pruebas de Tendencia Semanal de TMDB pasaron exitosamente!");
