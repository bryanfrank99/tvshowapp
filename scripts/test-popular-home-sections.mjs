import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

console.log("🧪 Iniciando pruebas de 'Películas Populares' y 'Series Populares' en la Portada...");

// 1. Verificar traducciones en lib/dict.ts
const dictContent = fs.readFileSync(path.join(root, "lib", "dict.ts"), "utf8");

assert.ok(dictContent.includes('popular_movies: "Películas populares"'), "dict.ts debe contener 'Películas populares' en español");
assert.ok(dictContent.includes('popular_series: "Series populares"'), "dict.ts debe contener 'Series populares' en español");
assert.ok(dictContent.includes('popular_movies: "Popular movies"'), "dict.ts debe contener 'Popular movies' en inglés");
assert.ok(dictContent.includes('popular_series: "Popular series"'), "dict.ts debe contener 'Popular series' en inglés");
assert.ok(dictContent.includes('popular_movies: "Filmes populares"'), "dict.ts debe contener 'Filmes populares' en portugués");
assert.ok(dictContent.includes('popular_series: "Séries populares"'), "dict.ts debe contener 'Séries populares' en portugués");
console.log("  ✓ Traducciones de 'popular_movies' y 'popular_series' validadas (es, en, pt)");

// 2. Verificar app/page.tsx
const pageContent = fs.readFileSync(path.join(root, "app", "page.tsx"), "utf8");

assert.ok(pageContent.includes("getMovies(1, 12)"), "app/page.tsx debe invocar getMovies(1, 12)");
assert.ok(pageContent.includes("getSeries(1, 12)"), "app/page.tsx debe invocar getSeries(1, 12)");
assert.ok(pageContent.includes("d.popular_movies"), "app/page.tsx debe renderizar d.popular_movies");
assert.ok(pageContent.includes("d.popular_series"), "app/page.tsx debe renderizar d.popular_series");

assert.ok(!pageContent.includes("getTrendingToday"), "app/page.tsx ya no debe llamar a getTrendingToday");
assert.ok(!pageContent.includes("getUpcoming"), "app/page.tsx ya no debe llamar a getUpcoming");

assert.ok(pageContent.includes("FeaturedCarousel"), "app/page.tsx debe conservar FeaturedCarousel");
assert.ok(pageContent.includes("top10"), "app/page.tsx debe conservar Top 10");
console.log("  ✓ app/page.tsx estructurado con 'Películas Populares' y 'Series Populares'");

console.log("🎉 ¡Todas las pruebas de Secciones Populares de la Portada pasaron exitosamente!");
