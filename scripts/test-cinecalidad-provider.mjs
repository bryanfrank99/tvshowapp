import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("==========================================================================");
console.log("🧪 TESTING SPEC 061: CINECALIDAD PROVIDER (IFRAME + ADBLOCK)");
console.log("==========================================================================");

// 1. Probar fetchCinecalidadEmbeds con casos reales e inexistentes
console.log("\n1. Probando fetchCinecalidadEmbeds en vivo...");
const cineModulePath = pathToFileURL(path.join(rootDir, "lib", "cinecalidad.ts")).href;
const { fetchCinecalidadEmbeds } = await import(cineModulePath);

// Película real (1339713)
const movieEmbeds = await fetchCinecalidadEmbeds({
  type: "movie",
  tmdbId: "1339713",
});
console.log("  Embeds Película 1339713:", movieEmbeds.length, movieEmbeds.map((e) => e.host));
assert.ok(movieEmbeds.length > 0, "Debe retornar al menos 1 embed para película 1339713");
assert.ok(movieEmbeds[0].url.startsWith("https://"), "La URL del embed debe ser HTTPS válida");
assert.strictEqual(movieEmbeds[0].lang, "Latino", "El idioma debe ser Latino");

// Serie real (108978 T1E2)
const tvEmbeds = await fetchCinecalidadEmbeds({
  type: "tv",
  tmdbId: "108978",
  season: 1,
  episode: 2,
});
console.log("  Embeds Serie 108978 T1E2:", tvEmbeds.length, tvEmbeds.map((e) => e.host));
assert.ok(tvEmbeds.length > 0, "Debe retornar al menos 1 embed para serie 108978 T1E2");
assert.strictEqual(tvEmbeds[0].lang, "Latino", "El idioma debe ser Latino");

// Título inexistente (999999999)
const fakeEmbeds = await fetchCinecalidadEmbeds({
  type: "movie",
  tmdbId: "999999999",
});
console.log("  Embeds ID ficticio 999999999:", fakeEmbeds.length);
assert.strictEqual(fakeEmbeds.length, 0, "Un ID inexistente debe retornar arreglo vacío");

// 2. Probar compatibilidad con el verificador de Probe URLs
console.log("\n2. Probando compatibilidad con el sistema de disponibilidad de catálogo...");
const availModulePath = pathToFileURL(path.join(rootDir, "lib", "redeflix-availability.ts")).href;
const { isRedeflixAvailable } = await import(availModulePath);

const cinecalidadProbeMovie = "https://tmdb.cinecalidad.am/v1/playback/movie/{id}";
const isAvailReal = await isRedeflixAvailable({
  type: "movie",
  tmdbId: "1339713",
  movieListUrl: cinecalidadProbeMovie,
});
console.log("  [Disponibilidad] Película 1339713 disponible:", isAvailReal);
assert.strictEqual(isAvailReal, true, "La película 1339713 debe reportarse como disponible (HTTP 200)");

const isAvailFake = await isRedeflixAvailable({
  type: "movie",
  tmdbId: "999999999",
  movieListUrl: cinecalidadProbeMovie,
});
console.log("  [Disponibilidad] ID ficticio 999999999 disponible:", isAvailFake);
assert.strictEqual(isAvailFake, false, "El ID ficticio debe reportarse como NO disponible (HTTP 404)");

// 3. Verificar configuración de AdBlock y Whitelist en Android y Capacitor
console.log("\n3. Verificando reglas de AdBlock y allowNavigation...");
const adBlockPath = path.join(rootDir, "android", "app", "src", "main", "java", "com", "tvshow", "app", "AdBlockWebViewClient.java");
const adBlockContent = fs.readFileSync(adBlockPath, "utf-8");

assert.ok(adBlockContent.includes("vimeos.net"), "AdBlockWebViewClient debe permitir vimeos.net");
assert.ok(adBlockContent.includes("goodstream.one"), "AdBlockWebViewClient debe permitir goodstream.one");
assert.ok(adBlockContent.includes("cinecalidad.am"), "AdBlockWebViewClient debe permitir cinecalidad.am");

const capPath = path.join(rootDir, "capacitor.config.ts");
const capContent = fs.readFileSync(capPath, "utf-8");

assert.ok(capContent.includes("vimeos.net"), "capacitor.config.ts debe permitir vimeos.net");
assert.ok(capContent.includes("goodstream.one"), "capacitor.config.ts debe permitir goodstream.one");
assert.ok(capContent.includes("cinecalidad.am"), "capacitor.config.ts debe permitir cinecalidad.am");
console.log("  ✓ Whitelist de Android y Capacitor verificada correctamente");

// 4. Verificar configuración en seed.sql y migración
console.log("\n4. Verificando seed.sql y migración...");
const seedPath = path.join(rootDir, "supabase", "seed.sql");
const seedContent = fs.readFileSync(seedPath, "utf-8");
assert.ok(seedContent.includes("cinecalidad"), "seed.sql debe contener proveedor cinecalidad");

const migrationPath = path.join(rootDir, "supabase", "migration_add_cinecalidad_provider.sql");
const migrationContent = fs.readFileSync(migrationPath, "utf-8");
assert.ok(migrationContent.includes("cinecalidad"), "La migración SQL debe contener proveedor cinecalidad");
console.log("  ✓ Seed y migración SQL validados");

console.log("\n==========================================================================");
console.log("✅ ALL SPEC 061 (CINECALIDAD PROVIDER) TESTS PASSED SUCCESSFULLY!");
console.log("==========================================================================");
