// @ts-check
import assert from "node:assert/strict";

// Import compiled or transpile-free logic to verify Phase 1 contracts
import {
  fillTemplate,
  detectStreamType,
  formatSubtitles,
  providerToSource,
  providersToSources,
} from "../lib/adapters/provider-adapter.ts";
import {
  scoreSourceForUser,
  sortSourcesByPriority,
  findBestSource,
  getStreamTypeMeta,
} from "../lib/sources.ts";

console.log("==================================================");
console.log("🧪 TESTING FASE 1: TIPOS, CONTRATOS Y ADAPTADORES");
console.log("==================================================");

// 1. Test fillTemplate
console.log("\n[1/5] Verificando fillTemplate (Interpolación de marcadores)...");
const tplMovie = "https://server.com/watch/{id}?key={key}&{idparam}{tmdbflag}";
const resImdb = fillTemplate(tplMovie, "tt0137523", 1, 1, "secret123");
assert.equal(
  resImdb,
  "https://server.com/watch/tt0137523?key=secret123&imdb=tt0137523",
  "Fallo en interpolación con ID IMDb"
);

const resTmdb = fillTemplate(tplMovie, "550", 1, 1, "secret123");
assert.equal(
  resTmdb,
  "https://server.com/watch/550?key=secret123&tmdb=550&tmdb=1",
  "Fallo en interpolación con ID TMDB"
);

const tplTv = "https://server.com/tv/{id}/{s}/{e}";
const resTv = fillTemplate(tplTv, "tt0903747", 2, 4);
assert.equal(
  resTv,
  "https://server.com/tv/tt0903747/2/4",
  "Fallo en interpolación con serie S2 E4"
);
console.log("  ✅ fillTemplate maneja correctamente {id}, {s}, {e}, {key}, {idparam}, {tmdbflag}");

// 2. Test detectStreamType & getStreamTypeMeta
console.log("\n[2/5] Verificando detección de tipos de stream...");
assert.equal(detectStreamType("https://cdn.com/live/master.m3u8?token=abc"), "hls");
assert.equal(detectStreamType("https://cdn.com/stream/manifest.mpd"), "dash");
assert.equal(detectStreamType("https://cdn.com/video.mp4"), "mp4");
assert.equal(detectStreamType("https://embed.provider.org/movie/550"), "iframe");

const metaHls = getStreamTypeMeta("hls");
assert.equal(metaHls.badge, "HLS");
console.log("  ✅ Detección de streams (iframe, hls, dash, mp4) 100% correcta");

// 3. Test providerToSource
console.log("\n[3/5] Verificando adaptador individual providerToSource...");
const mockProvider = {
  id: "vidcore",
  name: "VidCore",
  simulated_name: "S1",
  movie_tpl: "https://vidcore.to/movie/{id}",
  tv_tpl: "https://vidcore.to/tv/{id}/{s}/{e}",
  lang: "lat,es",
  subtitles: "es,en",
  tv_ok: true,
  is_beta: false,
};

const sourceMovie = providerToSource(mockProvider, {
  type: "movie",
  id: "550",
  userLang: "es",
});
assert.ok(sourceMovie, "Debe generar una fuente válida para película");
assert.equal(sourceMovie.id, "vidcore-iframe");
assert.equal(sourceMovie.providerName, "S1");
assert.equal(sourceMovie.url, "https://vidcore.to/movie/550");
assert.deepEqual(sourceMovie.languages, ["lat", "es"]);
assert.equal(sourceMovie.type, "iframe");

// Provider sin soporte de TV para petición de tipo tv
const mockMovieOnly = {
  id: "movieonly",
  name: "Movie Only",
  movie_tpl: "https://movie.com/{id}",
  tv_tpl: "",
  tv_ok: false,
};
const sourceTvDenied = providerToSource(mockMovieOnly, {
  type: "tv",
  id: "tt12345",
});
assert.equal(sourceTvDenied, null, "Debe omitir proveedores no aptos para TV");
console.log("  ✅ providerToSource transforma campos y respeta restricciones de serie/película");

// 4. Test scoring & prioridades
console.log("\n[4/5] Verificando puntuaciones y prioridades por idioma...");
const srcLat = { lang: "lat", languages: ["lat"], subtitles: [], isBeta: false };
const srcEs = { lang: "es", languages: ["es"], subtitles: [], isBeta: false };
const srcPt = { lang: "pt", languages: ["pt"], subtitles: [], isBeta: false };
const srcBeta = { lang: "es", languages: ["es"], subtitles: [], isBeta: true };

// Para usuario de habla hispana ("es"):
assert.equal(scoreSourceForUser(srcEs, "es"), 10);
assert.equal(scoreSourceForUser(srcLat, "es"), 9);
assert.ok(scoreSourceForUser(srcBeta, "es") < scoreSourceForUser(srcEs, "es"), "Beta debe tener menor prioridad");

// Para usuario portugués ("pt"):
assert.equal(scoreSourceForUser(srcPt, "pt"), 10);
assert.ok(scoreSourceForUser(srcPt, "pt") > scoreSourceForUser(srcEs, "pt"));
console.log("  ✅ Puntuaciones de idioma y penalización Beta funcionan con precisión");

// 5. Test providersToSources y ordenamiento
console.log("\n[5/5] Verificando providersToSources y selección automática...");
const sampleProviders = [
  {
    id: "p_en",
    name: "English Server",
    movie_tpl: "https://en.com/{id}",
    lang: "en",
    tv_ok: true,
  },
  {
    id: "p_pt",
    name: "RedeFlix",
    movie_tpl: "https://pt.com/{id}",
    lang: "pt",
    tv_ok: true,
  },
  {
    id: "p_es",
    name: "VidCore ES",
    movie_tpl: "https://es.com/{id}",
    lang: "es",
    tv_ok: true,
  },
];

// Usuario en Portugués: Debe preferir p_pt
const sourcesPt = providersToSources(sampleProviders, {
  type: "movie",
  id: "550",
  userLang: "pt",
});
assert.equal(sourcesPt[0].providerId, "p_pt", "El primer servidor para usuario PT debe ser RedeFlix");

// Usuario en Español: Debe preferir p_es
const sourcesEs = providersToSources(sampleProviders, {
  type: "movie",
  id: "550",
  userLang: "es",
});
assert.equal(sourcesEs[0].providerId, "p_es", "El primer servidor para usuario ES debe ser VidCore ES");

const best = findBestSource(sourcesEs, "es");
assert.equal(best?.providerId, "p_es");

console.log("  ✅ Ordenamiento y recomendación inteligente de fuentes 100% verificado");
console.log("\n🎉 TODAS LAS PRUEBAS DE LA FASE 1 PASARON SATISFACTORIAMENTE.");
