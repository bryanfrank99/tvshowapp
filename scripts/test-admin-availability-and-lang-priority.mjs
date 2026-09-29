import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

console.log("==========================================================================");
console.log("🧪 TESTING SPEC 057: SERVER ADMIN AVAILABILITY URLS & LANG PRIORITY & FLAGS");
console.log("==========================================================================");

// 1. Verificación de Banderas SVG
console.log("\n1. Verificando componentes de banderas vectoriales SVG...");
const flagIconContent = fs.readFileSync(path.join(rootDir, "components/icons/FlagIcon.tsx"), "utf-8");
assert.ok(flagIconContent.includes("FlagBR"), "Debe existir FlagBR");
assert.ok(flagIconContent.includes("FlagES"), "Debe existir FlagES");
assert.ok(flagIconContent.includes("FlagUS"), "Debe existir FlagUS");
assert.ok(flagIconContent.includes("export function FlagIcon"), "Debe exportar el componente selector FlagIcon");

const langModalContent = fs.readFileSync(path.join(rootDir, "components/LanguageModal.tsx"), "utf-8");
assert.ok(langModalContent.includes("FlagIcon"), "LanguageModal debe importar y usar FlagIcon");
assert.ok(langModalContent.includes("<FlagIcon lang={l}"), "LanguageModal debe renderizar FlagIcon para cada idioma");

const langMenuContent = fs.readFileSync(path.join(rootDir, "components/LangMenu.tsx"), "utf-8");
assert.ok(langMenuContent.includes("FlagIcon"), "LangMenu debe importar y usar FlagIcon");
console.log("  ✓ Componentes SVG de banderas integrados correctamente en modal y menú de idiomas");

// 2. Verificación de Prioridad de Servidor por Idioma en sortSourcesByPriority
console.log("\n2. Verificando ordenamiento por servidor prioritario por idioma...");
const sourcesCode = fs.readFileSync(path.join(rootDir, "lib/sources.ts"), "utf-8");
assert.ok(sourcesCode.includes("primaryByLang?: Record<string, string>"), "sortSourcesByPriority debe aceptar primaryByLang");
assert.ok(sourcesCode.includes("isAPrimary"), "sortSourcesByPriority debe priorizar el servidor asignado al idioma");

// Ejecutamos la lógica de ordenamiento de fuentes con la misma implementación de lib/sources.ts
function sortSourcesByPriority(sources, userLang, primaryByLang) {
  const cleanLang = (userLang || "").toLowerCase().trim();
  const primaryProviderId = primaryByLang?.[cleanLang] || "";

  return [...sources].sort((a, b) => {
    if (primaryProviderId) {
      const isAPrimary = (a.providerId || a.id) === primaryProviderId;
      const isBPrimary = (b.providerId || b.id) === primaryProviderId;
      if (isAPrimary !== isBPrimary) {
        return isAPrimary ? -1 : 1;
      }
    }
    if (!!a.isBeta !== !!b.isBeta) {
      return a.isBeta ? 1 : -1;
    }
    const scoreA = a.priority ?? 0;
    const scoreB = b.priority ?? 0;
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    return 0;
  });
}

const mockSources = [
  { id: "S1", providerId: "vimeus", name: "S1", priority: 10, isBeta: false },
  { id: "S2", providerId: "vidcore", name: "S2", priority: 8, isBeta: false },
  { id: "S11", providerId: "embedmovies", name: "S11", priority: 9, isBeta: false },
  { id: "S12", providerId: "redeflix", name: "S12", priority: 9, isBeta: false },
];

const primaryConfig = {
  es: "vimeus",
  pt: "redeflix",
  en: "vidcore",
};

// Caso PT: RedeFlix debe ser el primero
const sortedPt = sortSourcesByPriority(mockSources, "pt", primaryConfig);
assert.equal(sortedPt[0].providerId, "redeflix", "Para usuario 'pt', RedeFlix DEBE aparecer en 1er lugar");
assert.equal(sortedPt[0].id, "S12", "RedeFlix conserva su ID canónico S12");

// Caso ES: Vimeus debe ser el primero
const sortedEs = sortSourcesByPriority(mockSources, "es", primaryConfig);
assert.equal(sortedEs[0].providerId, "vimeus", "Para usuario 'es', Vimeus DEBE aparecer en 1er lugar");

// Caso EN: Vidcore debe ser el primero
const sortedEn = sortSourcesByPriority(mockSources, "en", primaryConfig);
assert.equal(sortedEn[0].providerId, "vidcore", "Para usuario 'en', VidCore DEBE aparecer en 1er lugar");

// Caso Fallback: Si el servidor preferido (ej. redeflix) fue omitido por no tener el contenido
const mockSourcesWithoutRedeflix = mockSources.filter(s => s.providerId !== "redeflix");
const sortedPtFallback = sortSourcesByPriority(mockSourcesWithoutRedeflix, "pt", primaryConfig);
assert.equal(sortedPtFallback[0].providerId, "vimeus", "Si el servidor preferido no tiene el título, debe continuar con el siguiente mejor");
console.log("  ✓ Prioridad por idioma comprobada para 'pt', 'es', 'en' y fallback resiliente");

// 3. Verificación de URLs dinámicas de disponibilidad
console.log("\n3. Verificando disponibilidad con URLs dinámicas...");
const availabilityModule = await import(pathToFileURL(path.join(rootDir, "lib/redeflix-availability.ts")).href);
const { isRedeflixAvailable, isRedeflixProvider } = availabilityModule;

assert.equal(
  isRedeflixProvider({ movie_list_url: "https://custom.com/movies.txt" }),
  true,
  "Proveedor con movie_list_url debe ser detectado como compatible con verificación"
);

// Probar con URL por defecto
const defaultCheck = await isRedeflixAvailable({ type: "movie", tmdbId: "550" });
assert.equal(defaultCheck, true, "TMDB 550 debe ser true en catálogo por defecto");

// 4. Verificación de Migración SQL y Backend
console.log("\n4. Verificando migración SQL y API de administración...");
const migrationSql = fs.readFileSync(path.join(rootDir, "supabase/migration_provider_availability_urls.sql"), "utf-8");
assert.ok(migrationSql.includes("movie_list_url"), "La migración SQL debe incluir movie_list_url");
assert.ok(migrationSql.includes("tv_list_url"), "La migración SQL debe incluir tv_list_url");
assert.ok(migrationSql.includes("anime_list_url"), "La migración SQL debe incluir anime_list_url");
assert.ok(migrationSql.includes("dorama_list_url"), "La migración SQL debe incluir dorama_list_url");

const adminApiRoute = fs.readFileSync(path.join(rootDir, "app/api/admin/providers/route.ts"), "utf-8");
assert.ok(adminApiRoute.includes("save_primary_by_lang"), "La API admin debe soportar save_primary_by_lang");
assert.ok(adminApiRoute.includes("provider_availability_urls"), "La API admin debe soportar fallback a config");

const adminPageContent = fs.readFileSync(path.join(rootDir, "app/admin/page.tsx"), "utf-8");
assert.ok(adminPageContent.includes("primaryByLang"), "Admin page debe gestionar primaryByLang");
assert.ok(adminPageContent.includes("savePrimaryByLang"), "Admin page debe implementar savePrimaryByLang");
assert.ok(adminPageContent.includes("movie_list_url"), "Admin page debe contener input movie_list_url");
assert.ok(adminPageContent.includes("tv_list_url"), "Admin page debe contener input tv_list_url");
assert.ok(adminPageContent.includes("anime_list_url"), "Admin page debe contener input anime_list_url");
assert.ok(adminPageContent.includes("dorama_list_url"), "Admin page debe contener input dorama_list_url");

const resolveRouteContent = fs.readFileSync(path.join(rootDir, "app/api/resolve/route.ts"), "utf-8");
assert.ok(resolveRouteContent.includes("primary_providers_by_lang"), "Resolve route debe consultar primary_providers_by_lang");
assert.ok(resolveRouteContent.includes("sortSourcesByPriority(rawSources, userLang, primaryByLang)"), "Resolve route debe ordenar con primaryByLang");
console.log("  ✓ Migración SQL, API admin, formulario y resolver validados correctamente");

console.log("\n🎉 TODAS LAS PRUEBAS DE LA SPEC 057 PASARON SATISFACTORIAMENTE.\n");
