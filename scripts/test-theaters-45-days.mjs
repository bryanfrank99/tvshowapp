// Test suite para Spec 054: Ventana de 45 Días para la Etiqueta "EN CINES"
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

import { isMovieInTheaters, getDaysSinceRelease } from "../lib/theaters.ts";

console.log("==================================================");
console.log("🧪 TESTING SPEC 054: VENTANA DE 45 DÍAS 'EN CINES'");
console.log("==================================================");

// Función auxiliar para generar fechas relativas en formato YYYY-MM-DD basadas en UTC
function getDateOffsetUTC(daysAgo) {
  const now = new Date();
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo));
  return target.toISOString().slice(0, 10);
}

// 1. Pruebas unitarias de cálculo de días con getDaysSinceRelease
console.log("\n1. Verificando cálculo exacto de días en getDaysSinceRelease...");
const dateToday = getDateOffsetUTC(0);
const date20Ago = getDateOffsetUTC(20);
const date45Ago = getDateOffsetUTC(45);
const date46Ago = getDateOffsetUTC(46);
const dateTomorrow = getDateOffsetUTC(-1);
const dateFuture10 = getDateOffsetUTC(-10);

assert.strictEqual(getDaysSinceRelease(dateToday), 0, "Fecha de hoy debe ser día 0");
assert.strictEqual(getDaysSinceRelease(date20Ago), 20, "Fecha de hace 20 días debe ser 20");
assert.strictEqual(getDaysSinceRelease(date45Ago), 45, "Fecha de hace 45 días debe ser 45");
assert.strictEqual(getDaysSinceRelease(date46Ago), 46, "Fecha de hace 46 días debe ser 46");
assert.strictEqual(getDaysSinceRelease(dateTomorrow), -1, "Mañana debe ser -1");
assert.strictEqual(getDaysSinceRelease(dateFuture10), -10, "Futuro de 10 días debe ser -10");
assert.strictEqual(getDaysSinceRelease(""), null, "Cadena vacía debe retornar null");
assert.strictEqual(getDaysSinceRelease(null), null, "Null debe retornar null");
assert.strictEqual(getDaysSinceRelease("fecha-invalida"), null, "Fecha inválida debe retornar null");
console.log("  ✓ Cálculo exacto de días transcurridos UTC verificado: OK");

// 2. Pruebas de la regla de negocio de 45 días en isMovieInTheaters
console.log("\n2. Verificando regla de 'EN CINES' (Día 0 a 45 inclusive)...");

// Día 0 (estreno hoy)
assert.strictEqual(
  isMovieInTheaters({ media_type: "movie", release_date: dateToday }),
  true,
  "Película estrenada hoy (día 0) DEBE tener etiqueta 'EN CINES'"
);

// Día 1
assert.strictEqual(
  isMovieInTheaters({ media_type: "movie", release_date: getDateOffsetUTC(1) }),
  true,
  "Película estrenada hace 1 día DEBE tener etiqueta 'EN CINES'"
);

// Día 20
assert.strictEqual(
  isMovieInTheaters({ media_type: "movie", release_date: date20Ago }),
  true,
  "Película estrenada hace 20 días DEBE tener etiqueta 'EN CINES'"
);

// Día 45 (Límite máximo permitido)
assert.strictEqual(
  isMovieInTheaters({ media_type: "movie", release_date: date45Ago }),
  true,
  "Película en el día 45 DEBE tener etiqueta 'EN CINES'"
);
console.log("  ✓ Día 0 a 45 correctamente etiquetados como 'EN CINES': OK");

// 3. Verificando corte estricto en el día 46 en adelante
console.log("\n3. Verificando corte estricto en el Día 46...");

// Día 46 (Corte estricto)
assert.strictEqual(
  isMovieInTheaters({ media_type: "movie", release_date: date46Ago }),
  false,
  "En el día 46 ya NO debe mostrarse la etiqueta 'EN CINES'"
);

// Día 47
assert.strictEqual(
  isMovieInTheaters({ media_type: "movie", release_date: getDateOffsetUTC(47) }),
  false,
  "En el día 47 ya NO debe mostrarse la etiqueta"
);

// Día 90
assert.strictEqual(
  isMovieInTheaters({ media_type: "movie", release_date: getDateOffsetUTC(90) }),
  false,
  "En el día 90 ya NO debe mostrarse la etiqueta"
);

// Día 365
assert.strictEqual(
  isMovieInTheaters({ media_type: "movie", release_date: getDateOffsetUTC(365) }),
  false,
  "Película de hace un año NO debe mostrar la etiqueta"
);
console.log("  ✓ Corte estricto en día 46 y películas posteriores verificado: OK");

// 4. Verificando estrenos futuros y series de televisión
console.log("\n4. Verificando exclusión de series y estrenos futuros...");

// Estreno futuro (mañana)
assert.strictEqual(
  isMovieInTheaters({ media_type: "movie", release_date: dateTomorrow }),
  false,
  "Película no estrenada (futuro) NO debe mostrar 'EN CINES'"
);

// Serie de TV estrenada hoy
assert.strictEqual(
  isMovieInTheaters({ type: "tv", release_date: dateToday }),
  false,
  "Serie de TV (type=tv) NUNCA debe mostrar 'EN CINES'"
);

// Serie con media_type tv
assert.strictEqual(
  isMovieInTheaters({ media_type: "tv", release_date: dateToday }),
  false,
  "Serie de TV (media_type=tv) NUNCA debe mostrar 'EN CINES'"
);

// Contenido con número de temporadas
assert.strictEqual(
  isMovieInTheaters({ number_of_seasons: 3, release_date: dateToday }),
  false,
  "Contenido con temporadas NUNCA debe mostrar 'EN CINES'"
);

// Prioridad de release_date sobre in_theaters previo desactualizado
assert.strictEqual(
  isMovieInTheaters({ media_type: "movie", release_date: date46Ago, in_theaters: true }),
  false,
  "Película con 46 días y flag in_theaters desactualizado NO debe mostrar etiqueta"
);
console.log("  ✓ Exclusión de series, futuros y prioridad de fecha verificado: OK");

// 5. Verificando consistencia de integración en el código
console.log("\n5. Verificando integración en catálogo, tarjetas y vistas...");
const catalogCode = fs.readFileSync(path.join(root, "lib", "catalog.ts"), "utf8");
assert.ok(catalogCode.includes("isMovieInTheaters"), "catalog.ts debe importar y usar isMovieInTheaters");

const cardsCode = fs.readFileSync(path.join(root, "components", "Cards.tsx"), "utf8");
assert.ok(cardsCode.includes("isMovieInTheaters"), "Cards.tsx debe usar isMovieInTheaters");

const titleCode = fs.readFileSync(path.join(root, "app", "title", "page.tsx"), "utf8");
assert.ok(titleCode.includes("isMovieInTheaters"), "title/page.tsx debe usar isMovieInTheaters");

const watchCode = fs.readFileSync(path.join(root, "app", "watch", "page.tsx"), "utf8");
assert.ok(watchCode.includes("isMovieInTheaters"), "watch/page.tsx debe usar isMovieInTheaters");

const serverCode = fs.readFileSync(path.join(root, "lib", "theaters-server.ts"), "utf8");
assert.ok(serverCode.includes("daysSince <= 45"), "theaters-server.ts debe usar ventana de 45 días");
console.log("  ✓ Integración coherente en todos los componentes del sistema: OK");

console.log("\n🎉 TODAS LAS PRUEBAS DE LA SPEC 054 PASARON SATISFACTORIAMENTE.\n");
