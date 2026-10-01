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

  // Intentar actualizar también en la tabla providers si la columna extractor_config existe
  for (const [provId, cfg] of Object.entries(pipelineConfigs)) {
    try {
      await sb.from("providers").update({ extractor_config: cfg }).eq("id", provId);
      console.log(`✓ providers[${provId}] extractor_config actualizado`);
    } catch (e) {
      console.log(`(Info) providers[${provId}] update opcional ignorado:`, e.message);
    }
  }

  console.log("=== ACTUALIZACIÓN COMPLETADA ===");
}

main().catch(console.error);
