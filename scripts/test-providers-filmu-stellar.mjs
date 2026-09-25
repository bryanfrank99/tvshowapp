import assert from "node:assert/strict";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const f of [".env.local", ".env"]) {
  const p = join(root, f);
  if (existsSync(p)) {
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
    }
  }
}

import { supa } from "../lib/supa.ts";
import { fillTemplate, providerToSource } from "../lib/adapters/provider-adapter.ts";
import { DEFAULT_PROVIDER_LANGS, DEFAULT_PROVIDER_SUBS } from "../lib/providers.ts";

async function run() {
  console.log("==================================================");
  console.log("🧪 TESTING NUEVOS PROVEEDORES: FILMU Y STELLAR");
  console.log("==================================================");

  // 1. Verificar diccionarios por defecto
  console.log("\n1. Verificando configuración por defecto en lib/providers.ts...");
  assert.ok(DEFAULT_PROVIDER_LANGS.filmu, "Falta filmu en DEFAULT_PROVIDER_LANGS");
  assert.ok(DEFAULT_PROVIDER_LANGS.stellar, "Falta stellar en DEFAULT_PROVIDER_LANGS");
  assert.ok(DEFAULT_PROVIDER_SUBS.filmu, "Falta filmu en DEFAULT_PROVIDER_SUBS");
  assert.ok(DEFAULT_PROVIDER_SUBS.stellar, "Falta stellar en DEFAULT_PROVIDER_SUBS");
  console.log("  ✅ Configuración en memoria verificada");

  // 2. Verificar public/providers.json
  console.log("\n2. Verificando catálogo local public/providers.json...");
  const rawCatalog = JSON.parse(readFileSync(join(root, "public", "providers.json"), "utf8"));
  const jsonFilmu = rawCatalog.providers.find((p) => p.id === "filmu");
  const jsonStellar = rawCatalog.providers.find((p) => p.id === "stellar");
  assert.ok(jsonFilmu, "Falta filmu en public/providers.json");
  assert.ok(jsonStellar, "Falta stellar en public/providers.json");
  assert.equal(jsonFilmu.ord, 15);
  assert.equal(jsonStellar.ord, 16);
  assert.equal(jsonFilmu.needsTmdb, true);
  assert.equal(jsonStellar.needsTmdb, true);
  console.log("  ✅ Catálogo local public/providers.json correcto");

  // 3. Verificar Supabase
  console.log("\n3. Verificando persistencia en Supabase...");
  const sb = supa();
  const { data: dbProviders, error } = await sb
    .from("providers")
    .select("id,name,ord,movie_tpl,tv_tpl,needs_tmdb,tv_ok,active")
    .in("id", ["filmu", "stellar"]);

  if (error || !dbProviders) {
    throw new Error(`Error consultando Supabase: ${JSON.stringify(error)}`);
  }
  const dbFilmu = dbProviders.find((p) => p.id === "filmu");
  const dbStellar = dbProviders.find((p) => p.id === "stellar");
  assert.ok(dbFilmu, "Falta filmu en Supabase");
  assert.ok(dbStellar, "Falta stellar en Supabase");
  assert.equal(typeof dbFilmu.active, "boolean");
  assert.equal(typeof dbStellar.active, "boolean");
  console.log("  ✅ Registros en Supabase verificados");

  // 4. Interpolación de URLs de película y serie
  console.log("\n4. Verificando interpolación de URLs...");
  const tmdbMovieId = "550";
  const tmdbTvId = "1399";
  const season = 1;
  const episode = 1;

  const filmuMovieUrl = fillTemplate(dbFilmu.movie_tpl, tmdbMovieId, 1, 1);
  const filmuTvUrl = fillTemplate(dbFilmu.tv_tpl, tmdbTvId, season, episode);
  assert.equal(filmuMovieUrl, "https://embed.filmu.in/movie/550");
  assert.equal(filmuTvUrl, "https://embed.filmu.in/tv/1399/1/1");

  const stellarMovieUrlEs = fillTemplate(dbStellar.movie_tpl, tmdbMovieId, 1, 1, "", "es");
  const stellarTvUrlPt = fillTemplate(dbStellar.tv_tpl, tmdbTvId, season, episode, "", "pt");
  const stellarMovieUrlEn = fillTemplate(dbStellar.movie_tpl, tmdbMovieId, 1, 1, "", "en");
  assert.equal(stellarMovieUrlEs, "https://stellar.rip/es-ES/watch/embed/movie/550?autoPlay=true");
  assert.equal(stellarTvUrlPt, "https://stellar.rip/pt-BR/watch/embed/tv/1399-1-1?autoPlay=true&nextButton=true&autoNext=true");
  assert.equal(stellarMovieUrlEn, "https://stellar.rip/en/watch/embed/movie/550?autoPlay=true");
  console.log("  ✅ URLs interpoladas correctamente para películas y series con idiomas dinámicos (ES, PT, EN)");

  // 5. Conversión a objeto Source
  console.log("\n5. Verificando adaptación a modelo Source...");
  const sFilmu = providerToSource(
    {
      id: "filmu",
      name: "S15",
      real_name: "FilmU",
      movie: dbFilmu.movie_tpl,
      tv: dbFilmu.tv_tpl,
      needsTmdb: true,
      tvOk: true,
      ord: 15,
    },
    { type: "movie", id: tmdbMovieId, userLang: "es" }
  );
  assert.ok(sFilmu, "providerToSource falló para FilmU");
  assert.equal(sFilmu.type, "iframe");
  assert.equal(sFilmu.url, "https://embed.filmu.in/movie/550");

  const sStellar = providerToSource(
    {
      id: "stellar",
      name: "S16",
      real_name: "Stellar",
      movie: dbStellar.movie_tpl,
      tv: dbStellar.tv_tpl,
      needsTmdb: true,
      tvOk: true,
      ord: 16,
      languages: ["es", "pt", "en"],
    },
    { type: "tv", id: tmdbTvId, season: 2, episode: 4, userLang: "es" }
  );
  assert.ok(sStellar, "providerToSource falló para Stellar");
  assert.equal(sStellar.type, "iframe");
  assert.equal(sStellar.url, "https://stellar.rip/es-ES/watch/embed/tv/1399-2-4?autoPlay=true&nextButton=true&autoNext=true");
  assert.equal(sStellar.lang, "es");
  console.log("  ✅ Adaptación a Source unificado 100% compatible con localización dinámica");

  console.log("\n==================================================");
  console.log("🎉 PRUEBAS DE FILMU Y STELLAR EXITOSAS");
  console.log("==================================================");
}

run().catch((e) => {
  console.error("❌ Error en pruebas:", e);
  process.exit(1);
});
