import fs from "fs";
import dotenv from "dotenv";

if (fs.existsSync(".env.local")) {
  const envConfig = dotenv.parse(fs.readFileSync(".env.local"));
  for (const k in envConfig) process.env[k] = envConfig[k];
}

async function testS19() {
  console.log("=== INICIANDO VALIDACIÓN INTEGRAL DE S19 (CINECALIDAD LATINO) ===\n");
  const { supa } = await import("../lib/supa.ts");
  const { sha, newToken } = await import("../lib/access.ts");
  const { fetchCinecalidadStream, fetchCinecalidadEmbeds } = await import("../lib/cinecalidad.ts");
  const sb = supa();

  // 1. Validar registro en base de datos Supabase
  const { data: prov, error: provErr } = await sb
    .from("providers")
    .select("*")
    .eq("id", "cinecalidad")
    .single();

  if (provErr || !prov) {
    console.error("❌ Error al consultar proveedor S19 en BD:", provErr);
    process.exit(1);
  }

  console.log("✅ Configuración en BD Supabase para S19 (Cinecalidad):");
  console.log(`   - ID: ${prov.id} | Ord: ${prov.ord} | Enabled: ${prov.enabled}`);
  console.log(`   - movie_tpl: ${prov.movie_tpl}`);
  console.log(`   - tv_tpl: ${prov.tv_tpl}`);
  console.log(`   - movie_list_url: '${prov.movie_list_url}' (vacío para evitar falsos positivos)`);
  console.log(`   - tv_list_url: '${prov.tv_list_url}' (vacío para evitar falsos positivos)`);

  // 2. Extraer película en directo (TMDB 550 - Fight Club)
  console.log("\n--- TEST 1: Película TMDB 550 (Fight Club) ---");
  const movieRes = await fetchCinecalidadStream({ type: "movie", tmdbId: 550 });
  console.log(`Success: ${movieRes?.success}`);
  console.log(`Primary HLS URL: ${movieRes?.hlsUrl}`);
  console.log(`Embeds count: ${movieRes?.embeds?.length || 0}`);
  if (movieRes?.embeds && movieRes.embeds.length > 0) {
    console.log("Embeds:", movieRes.embeds.map((e) => `[${e.host}] ${e.url}`));
  }

  // 3. Extraer serie en directo (TMDB 1399 S01E01 - Game of Thrones)
  console.log("\n--- TEST 2: Serie TMDB 1399 S01E01 (Game of Thrones) ---");
  const tvEmbeds = await fetchCinecalidadEmbeds({ type: "tv", tmdbId: 1399, season: 1, episode: 1 });
  console.log(`TV Embeds count: ${tvEmbeds?.length || 0}`);
  if (tvEmbeds && tvEmbeds.length > 0) {
    console.log("TV Embeds:", tvEmbeds.map((e) => `[${e.host}] ${e.url}`));
  }

  // 4. Crear sesión autenticada y probar /api/resolve
  console.log("\n--- TEST 3: Resolución completa en /api/resolve ---");
  const { data: code } = await sb
    .from("access_codes")
    .select("*")
    .eq("revoked", false)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .single();

  const token = newToken();
  const tokenHash = sha(token);
  await sb.from("sessions").insert({
    token_hash: tokenHash,
    code_id: code.id,
    device_hint: "Test S19 Script",
  });

  const { GET } = await import("../app/api/resolve/route.ts");
  const { NextRequest } = await import("next/server");

  // Prueba película
  const reqMovie = new NextRequest("http://localhost:3000/api/resolve?type=movie&id=550&lang=es", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const resResolveMovie = await GET(reqMovie);
  const dataMovie = await resResolveMovie.json();
  const s19MovieSources = (dataMovie.sources || []).filter((s) => s.providerId === "cinecalidad" || s.ord === 19);

  console.log(`\nFuentes devueltas para S19 en Película 550 (${s19MovieSources.length}):`);
  for (const s of s19MovieSources) {
    console.log(`  * ID: ${s.id} | Tipo: ${s.type} | Name: ${s.providerName} | Priority: ${s.priority} | URL: ${s.url.slice(0, 70)}...`);
    if (s.embedOptions) {
      console.log(`    embedOptions (${s.embedOptions.length}):`, s.embedOptions.map((e) => `[${e.host}] ${e.url.slice(0, 45)}...`));
    }
  }

  if (s19MovieSources.length === 0) {
    console.error("❌ ERROR: S19 no fue retornado por /api/resolve");
    process.exit(1);
  }

  // Prueba serie
  const reqTv = new NextRequest("http://localhost:3000/api/resolve?type=tv&id=1399&s=1&e=1&lang=es", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const resResolveTv = await GET(reqTv);
  const dataTv = await resResolveTv.json();
  const s19TvSources = (dataTv.sources || []).filter((s) => s.providerId === "cinecalidad" || s.ord === 19);

  console.log(`\nFuentes devueltas para S19 en Serie 1399 S1E1 (${s19TvSources.length}):`);
  for (const s of s19TvSources) {
    console.log(`  * ID: ${s.id} | Tipo: ${s.type} | Name: ${s.providerName} | Priority: ${s.priority} | URL: ${s.url.slice(0, 70)}...`);
    if (s.embedOptions) {
      console.log(`    embedOptions (${s.embedOptions.length}):`, s.embedOptions.map((e) => `[${e.host}] ${e.url.slice(0, 45)}...`));
    }
  }

  if (s19TvSources.length === 0) {
    console.error("❌ ERROR: S19 no fue retornado por /api/resolve para Serie TV");
    process.exit(1);
  }

  // Limpiar sesión de prueba
  await sb.from("sessions").delete().eq("token_hash", tokenHash);

  console.log("\n=== VALIDACIÓN DE S19 FINALIZADA CON ÉXITO ===");
}

testS19().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
