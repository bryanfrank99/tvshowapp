import fs from 'fs';
import dotenv from 'dotenv';
if (fs.existsSync('.env.local')) {
  const env = dotenv.parse(fs.readFileSync('.env.local'));
  for (const k in env) process.env[k] = env[k];
}
import { createClient } from '@supabase/supabase-js';
import { EXTRACTOR_PRESETS } from '../lib/hls-engine.ts';

async function main() {
  console.log("=== ACTUALIZANDO PIPELINES DECLARATIVOS EN SUPABASE ===");

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const pipelineConfigs = {
    cinecalidad: EXTRACTOR_PRESETS.vimeos_json.template,
    nasriplay: EXTRACTOR_PRESETS.nasriplay_token.template,
    playerflix: EXTRACTOR_PRESETS.playerflix.template,
    megaembed: EXTRACTOR_PRESETS.megaembed.template,
    watchplay: EXTRACTOR_PRESETS.watchplay.template,
    "EmbedMovies-V2": EXTRACTOR_PRESETS.watchplay.template,
  };

  const { error: cfgErr } = await sb.from("config").upsert(
    {
      key: "provider_extractor_configs",
      value: JSON.stringify(pipelineConfigs),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  if (cfgErr) {
    console.error("Error actualizando config.provider_extractor_configs:", cfgErr);
  } else {
    console.log("✓ config.provider_extractor_configs actualizado con éxito");
  }

  // 2. Actualizar plantillas directas en la tabla providers
  console.log("=== ACTUALIZANDO PLANTILLAS DE PROVEEDORES ===");
  const pfUp = await sb.from("providers").update({
    movie_tpl: "https://playerflix.ink/inc/Ajax.php?type=movie&id={id}&season=null&episode=null",
    tv_tpl: "https://playerflix.ink/inc/Ajax.php?type=tv&id={id}&season={s}&episode={e}",
    active: true,
  }).eq("id", "playerflix");
  console.log("✓ S20 (PlayerFlix) plantillas actualizadas a endpoint original:", pfUp.error || "OK");

  const meUp = await sb.from("providers").update({
    movie_tpl: "https://mgeb.top/embed/{id}",
    tv_tpl: "https://mgeb.top/embed/{id}/{s}/{e}",
    active: true,
  }).eq("id", "megaembed");
  console.log("✓ S14 (MegaEmbed) plantillas y active actualizados:", meUp.error || "OK");

  // 3. Incrementar providers_version
  const { data: vRow } = await sb.from("config").select("value").eq("key", "providers_version").maybeSingle();
  const nextVersion = String((parseInt(vRow?.value || "114", 10)) + 1);
  await sb.from("config").upsert(
    { key: "providers_version", value: nextVersion, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  console.log(`✓ providers_version incrementado a ${nextVersion}`);

  console.log("=== ACTUALIZACIÓN COMPLETADA ===");
}

main().catch(console.error);
