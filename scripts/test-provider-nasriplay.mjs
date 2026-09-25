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
  console.log("🧪 TESTING NUEVO PROVEEDOR: NASRIPLAY (nsrplay.space)");
  console.log("==================================================");

  // 1. Verificar configuración en lib/providers.ts
  console.log("\n1. Verificando diccionarios por defecto en lib/providers.ts...");
  assert.ok(DEFAULT_PROVIDER_LANGS.nasriplay, "Falta nasriplay en DEFAULT_PROVIDER_LANGS");
  assert.ok(DEFAULT_PROVIDER_SUBS.nasriplay, "Falta nasriplay en DEFAULT_PROVIDER_SUBS");
  assert.deepEqual(DEFAULT_PROVIDER_LANGS.nasriplay, ["lat", "es", "en", "multi"]);
  assert.deepEqual(DEFAULT_PROVIDER_SUBS.nasriplay, ["es", "en", "multi"]);
  console.log("  ✅ Configuración en memoria verificada con éxito.");

  // 2. Verificar public/providers.json
  console.log("\n2. Verificando catálogo local public/providers.json...");
  const rawCatalog = JSON.parse(readFileSync(join(root, "public", "providers.json"), "utf8"));
  const jsonNasri = rawCatalog.providers.find((p) => p.id === "nasriplay");
  assert.ok(jsonNasri, "Falta nasriplay en public/providers.json");
  assert.equal(jsonNasri.name, "NasriPlay");
  assert.equal(jsonNasri.ord, 17);
  assert.equal(jsonNasri.needsTmdb, true);
  assert.equal(jsonNasri.tvOk, true);
  assert.equal(jsonNasri.movie, "https://nsrplay.space/embed/movie/{id}");
  assert.equal(jsonNasri.tv, "https://nsrplay.space/embed/tv/{id}/{s}/{e}");
  console.log("  ✅ Catálogo local public/providers.json verificado.");

  // 3. Sincronizar y verificar en Supabase
  console.log("\n3. Sincronizando y verificando persistencia en Supabase...");
  const sb = supa();

  const nasriData = {
    id: "nasriplay",
    name: "NasriPlay",
    ord: 17,
    movie_tpl: "https://nsrplay.space/embed/movie/{id}",
    tv_tpl: "https://nsrplay.space/embed/tv/{id}/{s}/{e}",
    needs_tmdb: true,
    tv_ok: true,
    active: true,
    is_beta: false,
    lang: "lat,es,en,multi",
    subtitles: "es,en,multi",
    entry_key: "np_live_9e2fe7338d7e250ec803d5e09019825459a76033a1098f13",
  };

  const { error: upsertErr } = await sb.from("providers").upsert(nasriData, { onConflict: "id" });
  if (upsertErr) {
    throw new Error(`Error haciendo upsert en Supabase: ${JSON.stringify(upsertErr)}`);
  }

  // Actualizar versión de catálogo en tabla config
  await sb.from("config").upsert({ key: "providers_version", value: "9" }, { onConflict: "key" });

  const { data: dbProviders, error: readErr } = await sb
    .from("providers")
    .select("*")
    .eq("id", "nasriplay")
    .single();

  if (readErr || !dbProviders) {
    throw new Error(`Error leyendo nasriplay de Supabase: ${JSON.stringify(readErr)}`);
  }

  assert.equal(dbProviders.id, "nasriplay");
  assert.equal(dbProviders.active, true);
  assert.equal(dbProviders.needs_tmdb, true);
  assert.equal(dbProviders.tv_ok, true);
  assert.equal(dbProviders.ord, 17);
  console.log("  ✅ Registro activo y persistente en Supabase verificado.");

  // 4. Interpolación de URLs de película y serie
  console.log("\n4. Verificando interpolación de URLs...");
  const tmdbMovieId = "550";
  const tmdbTvId = "1399";
  const season = 1;
  const episode = 1;

  const movieUrl = fillTemplate(dbProviders.movie_tpl, tmdbMovieId, 1, 1);
  const tvUrl = fillTemplate(dbProviders.tv_tpl, tmdbTvId, season, episode);

  assert.equal(movieUrl, "https://nsrplay.space/embed/movie/550");
  assert.equal(tvUrl, "https://nsrplay.space/embed/tv/1399/1/1");
  console.log(`  ✅ URL Película: ${movieUrl}`);
  console.log(`  ✅ URL Serie:    ${tvUrl}`);

  // 5. Conversión a objeto Source
  console.log("\n5. Verificando adaptación a modelo Source...");
  const source = providerToSource(
    {
      id: dbProviders.id,
      name: "S17",
      real_name: dbProviders.name,
      movie: dbProviders.movie_tpl,
      tv: dbProviders.tv_tpl,
      needsTmdb: dbProviders.needs_tmdb,
      tvOk: dbProviders.tv_ok,
      ord: dbProviders.ord,
      lang: dbProviders.lang,
      subtitles: dbProviders.subtitles,
      is_beta: dbProviders.is_beta,
    },
    { type: "movie", id: tmdbMovieId, userLang: "es" }
  );

  assert.ok(source, "providerToSource debe retornar un Source válido");
  assert.equal(source.id, "nasriplay-iframe");
  assert.equal(source.providerId, "nasriplay");
  assert.equal(source.providerName, "S17");
  assert.equal(source.realName, "NasriPlay");
  assert.equal(source.url, "https://nsrplay.space/embed/movie/550");
  assert.equal(source.type, "iframe");
  assert.ok(source.languages.includes("lat") && source.languages.includes("es"));
  console.log("  ✅ Adaptación a modelo Source 100% correcta.");

  // 6. Diagnóstico de salud HTTP en vivo
  console.log("\n6. Verificando diagnóstico de salud (Live HTTP Check)...");
  const t0 = Date.now();
  const res = await fetch("https://nsrplay.space/embed/movie/550", {
    method: "HEAD",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0",
      "Accept": "text/html,application/xhtml+xml",
    },
  });
  const ms = Date.now() - t0;
  assert.equal(res.status, 200, "El endpoint de NasriPlay debe responder HTTP 200");
  console.log(`  ✅ Conectividad y respuesta OK: HTTP 200 (${ms} ms)`);

  console.log("\n==================================================");
  console.log("🎉 TODAS LAS PRUEBAS DE NASRIPLAY PASARON SATISFACTORIAMENTE");
  console.log("==================================================");
}

run().catch((err) => {
  console.error("❌ ERROR EN TEST NASRIPLAY:", err);
  process.exit(1);
});
