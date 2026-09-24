import assert from "node:assert/strict";
import { fillTemplate, providerToSource } from "../lib/adapters/provider-adapter.ts";

console.log("==================================================");
console.log("🧪 TESTING INTEGRACIÓN DE IDIOMAS DE STELLAR");
console.log("==================================================");

// 1. Verificamos interpolación de plantillas con {lang}
console.log("\n[1/3] Verificando fillTemplate con {lang} para Stellar...");
const tplMovie = "https://stellar.rip/{lang}/watch/embed/movie/{id}?autoPlay=true";
const tplTv = "https://stellar.rip/{lang}/watch/embed/tv/{id}-{s}-{e}?autoPlay=true&nextButton=true&autoNext=true";

const urlEs = fillTemplate(tplMovie, "1081003", 1, 1, "", "es");
assert.equal(urlEs, "https://stellar.rip/es-ES/watch/embed/movie/1081003?autoPlay=true", "userLang 'es' debe mapear a es-ES");

const urlPt = fillTemplate(tplMovie, "1081003", 1, 1, "", "pt");
assert.equal(urlPt, "https://stellar.rip/pt-BR/watch/embed/movie/1081003?autoPlay=true", "userLang 'pt' debe mapear a pt-BR");

const urlEn = fillTemplate(tplMovie, "1081003", 1, 1, "", "en");
assert.equal(urlEn, "https://stellar.rip/en/watch/embed/movie/1081003?autoPlay=true", "userLang 'en' debe mapear a en");

const urlLat = fillTemplate(tplMovie, "1081003", 1, 1, "", "lat");
assert.equal(urlLat, "https://stellar.rip/es-419/watch/embed/movie/1081003?autoPlay=true", "userLang 'lat' debe mapear a es-419");

const urlTvPt = fillTemplate(tplTv, "83867", 2, 4, "", "pt");
assert.equal(urlTvPt, "https://stellar.rip/pt-BR/watch/embed/tv/83867-2-4?autoPlay=true&nextButton=true&autoNext=true");

console.log("  ✅ fillTemplate mapea correctamente {lang} a es-ES, pt-BR, en y es-419");

// 2. Verificamos retrocompatibilidad si la plantilla tenía /en/ fijo
console.log("\n[2/3] Verificando auto-adaptación para plantillas fijas con /en/...");
const legacyTpl = "https://stellar.rip/en/watch/embed/movie/{id}?autoPlay=true";
const legacyEs = fillTemplate(legacyTpl, "1081003", 1, 1, "", "es");
assert.equal(legacyEs, "https://stellar.rip/es-ES/watch/embed/movie/1081003?autoPlay=true");
const legacyPt = fillTemplate(legacyTpl, "1081003", 1, 1, "", "pt");
assert.equal(legacyPt, "https://stellar.rip/pt-BR/watch/embed/movie/1081003?autoPlay=true");
console.log("  ✅ Plantillas heredadas con /en/ se auto-adaptan al idioma del usuario");

// 3. Verificamos providerToSource con afinidad lingüística dinámica
console.log("\n[3/3] Verificando providerToSource para Stellar...");
const stellarDef = {
  id: "stellar",
  name: "S16",
  real_name: "Stellar",
  ord: 16,
  needs_tmdb: true,
  tv_ok: true,
  movie_tpl: tplMovie,
  tv_tpl: tplTv,
  lang: "es,pt,en,multi",
  subtitles: "es,pt,en,multi",
};

const srcEs = providerToSource(stellarDef, {
  type: "movie",
  id: "1081003",
  userLang: "es",
});
assert.ok(srcEs);
assert.equal(srcEs.lang, "es");
assert.equal(srcEs.url, "https://stellar.rip/es-ES/watch/embed/movie/1081003?autoPlay=true");
assert.equal(srcEs.priority, 10, "Debe tener máxima puntuación para usuario es");

const srcPt = providerToSource(stellarDef, {
  type: "movie",
  id: "1081003",
  userLang: "pt",
});
assert.ok(srcPt);
assert.equal(srcPt.lang, "pt");
assert.equal(srcPt.url, "https://stellar.rip/pt-BR/watch/embed/movie/1081003?autoPlay=true");
assert.equal(srcPt.priority, 10, "Debe tener máxima puntuación para usuario pt");

const srcEn = providerToSource(stellarDef, {
  type: "movie",
  id: "1081003",
  userLang: "en",
});
assert.ok(srcEn);
assert.equal(srcEn.lang, "en");
assert.equal(srcEn.url, "https://stellar.rip/en/watch/embed/movie/1081003?autoPlay=true");
assert.equal(srcEn.priority, 10, "Debe tener máxima puntuación para usuario en");

console.log("  ✅ providerToSource adapta idioma nativo y prioridad según el usuario");

console.log("\n🎉 TODAS LAS PRUEBAS DE INTEGRACIÓN DE IDIOMAS DE STELLAR PASARON EXITOSAMENTE.");
