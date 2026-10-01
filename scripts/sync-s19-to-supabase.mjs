import fs from "fs";
import dotenv from "dotenv";
if (fs.existsSync(".env.local")) {
  const env = dotenv.parse(fs.readFileSync(".env.local"));
  for (const k in env) process.env[k] = env[k];
}

import { createClient } from "@supabase/supabase-js";
import { EXTRACTOR_PRESETS } from "../lib/hls-engine.ts";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function run() {
  console.log("=== SINCRONIZANDO S19 (CINECALIDAD) EN SUPABASE ===");

  // 1. Actualizar tabla providers
  console.log("1. Actualizando tabla providers...");
  const { error: provErr } = await sb
    .from("providers")
    .update({
      active: true,
      ord: 19,
      movie_tpl: "https://tmdb.cinecalidad.am/v1/playback/movie/{id}",
      tv_tpl: "https://tmdb.cinecalidad.am/v1/playback/tvshow/{id}?season={s}&episode={e}",
      lang: "es,lat",
      needs_tmdb: true,
      tv_ok: true,
    })
    .eq("id", "cinecalidad");

  if (provErr) {
    console.error("Error al actualizar tabla providers:", provErr);
  } else {
    console.log("Tabla providers actualizada con éxito para S19 (cinecalidad).");
  }

  // 2. Actualizar config provider_extractor_configs
  console.log("\n2. Actualizando provider_extractor_configs en config...");
  const { data: extCfgRow, error: extFetchErr } = await sb
    .from("config")
    .select("value")
    .eq("key", "provider_extractor_configs")
    .single();

  let extConfigs = {};
  if (extCfgRow && extCfgRow.value) {
    extConfigs = typeof extCfgRow.value === "string" ? JSON.parse(extCfgRow.value) : extCfgRow.value;
  }

  extConfigs.cinecalidad = EXTRACTOR_PRESETS.cinecalidad.template;
  extConfigs.vimeos_json = EXTRACTOR_PRESETS.vimeos_json.template;

  const { error: extUpdateErr } = await sb
    .from("config")
    .upsert({
      key: "provider_extractor_configs",
      value: JSON.stringify(extConfigs),
    });

  if (extUpdateErr) {
    console.error("Error al actualizar provider_extractor_configs:", extUpdateErr);
  } else {
    console.log("provider_extractor_configs actualizado para cinecalidad con éxito.");
  }

  // 3. Asegurar provider_stream_modes.cinecalidad = 'both'
  console.log("\n3. Verificando provider_stream_modes...");
  const { data: modesRow } = await sb
    .from("config")
    .select("value")
    .eq("key", "provider_stream_modes")
    .single();

  let modes = {};
  if (modesRow && modesRow.value) {
    modes = typeof modesRow.value === "string" ? JSON.parse(modesRow.value) : modesRow.value;
  }
  modes.cinecalidad = "both";

  const { error: modesErr } = await sb
    .from("config")
    .upsert({
      key: "provider_stream_modes",
      value: JSON.stringify(modes),
    });

  if (modesErr) {
    console.error("Error al actualizar provider_stream_modes:", modesErr);
  } else {
    console.log("provider_stream_modes.cinecalidad configurado a 'both'.");
  }

  // 4. Limpiar caché de streams viejos para cinecalidad
  console.log("\n4. Purgando caché de streams para cinecalidad...");
  try {
    const { error: purgeErr } = await sb
      .from("stream_cache")
      .delete()
      .eq("provider_id", "cinecalidad");
    if (!purgeErr) {
      console.log("Caché de streams purgado para cinecalidad.");
    }
  } catch {}

  // 5. Incrementar providers_version
  console.log("\n5. Actualizando providers_version...");
  await sb.from("config").upsert({
    key: "providers_version",
    value: "11",
  });
  console.log("providers_version actualizado a 11.");

  console.log("\n=== SINCRONIZACIÓN S19 COMPLETADA CON ÉXITO ===");
}

run().catch((err) => {
  console.error("Error en sincronización:", err);
  process.exit(1);
});
