// @ts-check
import assert from "node:assert/strict";
import { providersToSources } from "../lib/adapters/provider-adapter.ts";
import { sortSourcesByPriority } from "../lib/sources.ts";

console.log("==================================================");
console.log("🧪 TESTING PRIORIZACIÓN AUTOMÁTICA POR IDIOMA");
console.log("==================================================");

// Datos reales de servidores como existen en la base de datos
const realProviders = [
  { id: "vidcore", name: "VidCore", lang: "en", subtitles: "en", tv_ok: true, movie_tpl: "https://vidcore.io/movie/{id}" },
  { id: "embos", name: "Embos", lang: "en", subtitles: "es,en,pt,multi", tv_ok: true, movie_tpl: "https://embos.top/movie/?mid={id}" },
  { id: "streambetter", name: "StreamBetter", lang: "pt", subtitles: "pt", tv_ok: true, movie_tpl: "https://streambetter.shop/filme/{id}" },
  { id: "vimeus", name: "Vimeus", lang: "en,es,lat", subtitles: "es,en", tv_ok: true, movie_tpl: "https://vimeus.com/e/movie?{idparam}" },
  { id: "redeflix", name: "RedeFlix", lang: "pt", subtitles: "pt", tv_ok: true, movie_tpl: "https://redeflixapi.store/filme/{id}" },
  { id: "pipocacine", name: "PipocaCine", lang: "pt,lat", subtitles: "pt", tv_ok: true, movie_tpl: "https://pipocacine.lat/embed/{id}" },
  { id: "vidapi", name: "VidAPI", lang: "en", subtitles: "es,en,pt", tv_ok: true, movie_tpl: "https://vidapi.xyz/embed/movie/{id}" },
];

function getSortedForUser(userLang) {
  const rawSources = [];
  for (const p of realProviders) {
    const adapted = providersToSources([p], {
      type: "movie",
      id: "550",
      userLang,
    });
    if (adapted.length > 0) rawSources.push(...adapted);
  }
  const sorted = sortSourcesByPriority(rawSources, userLang);
  return sorted.map((s, idx) => ({ ...s, providerName: `S${idx + 1}` }));
}

// 1. Caso de prueba: Usuario en PORTUGUÉS ("pt")
console.log("\n[1/3] Verificando usuario en PORTUGUÉS (lang = 'pt')...");
const ptList = getSortedForUser("pt");
console.log("Top 3 servidores para PT:", ptList.slice(0, 3).map(s => `${s.providerName} -> ${s.providerId} (${s.languages.join(",")})`));
assert.ok(
  ["streambetter", "redeflix", "pipocacine"].includes(ptList[0].providerId),
  "El primer servidor para usuario PT debe ser un servidor portugués"
);
assert.equal(ptList[0].providerName, "S1", "El mejor servidor debe ser bautizado S1");
console.log("  ✅ Usuario PT recibe servidores en portugués en el TOP 1 (S1)");

// 2. Caso de prueba: Usuario en ESPAÑOL ("es")
console.log("\n[2/3] Verificando usuario en ESPAÑOL (lang = 'es')...");
const esList = getSortedForUser("es");
console.log("Top 3 servidores para ES:", esList.slice(0, 3).map(s => `${s.providerName} -> ${s.providerId} (${s.languages.join(",")})`));
assert.equal(esList[0].providerId, "vimeus", "El primer servidor para usuario ES debe ser Vimeus (soporta es/lat)");
assert.equal(esList[0].providerName, "S1", "Vimeus debe ser S1 para usuario en español");
assert.equal(esList[1].providerId, "pipocacine", "El segundo servidor debe ser PipocaCine (soporta lat)");
console.log("  ✅ Usuario ES recibe servidores con audio Latino/Castellano en S1 y S2");

// 3. Caso de prueba: Usuario en INGLÉS ("en")
console.log("\n[3/3] Verificando usuario en INGLÉS (lang = 'en')...");
const enList = getSortedForUser("en");
console.log("Top 3 servidores para EN:", enList.slice(0, 3).map(s => `${s.providerName} -> ${s.providerId} (${s.languages.join(",")})`));
assert.ok(
  ["vidcore", "embos", "vidapi", "vimeus"].includes(enList[0].providerId),
  "El primer servidor para usuario EN debe ser un servidor con audio inglés"
);
assert.equal(enList[0].providerName, "S1");
console.log("  ✅ Usuario EN recibe servidores en inglés en S1");

console.log("\n🎉 PRIORIZACIÓN AUTOMÁTICA POR IDIOMA VERIFICADA AL 100%");
