import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

console.log("🧪 Iniciando pruebas de Secciones de la Pantalla de Inicio...");

// 1. Verificar traducciones en lib/dict.ts mediante lectura estática
const dictContent = fs.readFileSync(path.join(root, "lib", "dict.ts"), "utf8");

assert.ok(dictContent.includes('toppicks: "Tendencias de hoy"'), "En español toppicks debe ser 'Tendencias de hoy'");
assert.ok(dictContent.includes('toppicks: "Trending today"'), "En inglés toppicks debe ser 'Trending today'");
assert.ok(dictContent.includes('toppicks: "Tendências de hoje"'), "En portugués toppicks debe ser 'Tendências de hoje'");
console.log("  ✓ Diccionario validado: 'toppicks' actualizado a 'Tendencias de hoy' (es, en, pt)");

// 2. Verificar función getTrendingToday en lib/catalog.ts
const catalogContent = fs.readFileSync(path.join(root, "lib", "catalog.ts"), "utf8");
assert.ok(catalogContent.includes("export async function getTrendingToday"), "getTrendingToday debe ser exportado en lib/catalog.ts");
assert.ok(catalogContent.includes("/trending/all/day"), "getTrendingToday debe consultar /trending/all/day");
console.log("  ✓ getTrendingToday está correctamente definido y exportado en lib/catalog.ts");

// 3. Verificar app/page.tsx
const pageContent = fs.readFileSync(path.join(root, "app", "page.tsx"), "utf8");

assert.ok(!pageContent.includes("getEpisodeSpotlight"), "app/page.tsx no debe llamar a getEpisodeSpotlight");
assert.ok(!pageContent.includes("spotlight"), "app/page.tsx no debe renderizar d.spotlight");
assert.ok(!pageContent.includes("SpotCard"), "app/page.tsx no debe importar ni usar SpotCard");
console.log("  ✓ 'Episode Spotlight' eliminado por completo de app/page.tsx");

assert.ok(pageContent.includes("getTrendingToday"), "app/page.tsx debe llamar a getTrendingToday");
assert.ok(pageContent.includes("d.toppicks"), "app/page.tsx debe usar d.toppicks para la sección de tendencias");
assert.ok(pageContent.includes("IconFire"), "app/page.tsx debe mantener el icono IconFire");
assert.ok(pageContent.includes("FeaturedCarousel"), "app/page.tsx debe mantener el FeaturedCarousel");
assert.ok(pageContent.includes("upcoming"), "app/page.tsx debe mantener la sección upcoming");
assert.ok(pageContent.includes("top10"), "app/page.tsx debe mantener la sección top10");
console.log("  ✓ Sección 'Tendencias de hoy' integrada preservando el aspecto visual de cards y rail");

console.log("🎉 ¡Todas las pruebas de Secciones de la Portada pasaron satisfactoriamente!");
