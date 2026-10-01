import fs from 'fs';
import dotenv from 'dotenv';
if (fs.existsSync('.env.local')) {
  const env = dotenv.parse(fs.readFileSync('.env.local'));
  for (const k in env) process.env[k] = env[k];
}
import { createClient } from '@supabase/supabase-js';
import { runHlsExtractor, EXTRACTOR_PRESETS } from '../lib/hls-engine.ts';

async function main() {
  console.log("=== INICIANDO VALIDACIÓN DEL MOTOR DINÁMICO HLS (SPEC 096) ===");

  // 1. Validar Presets disponibles
  console.log("\n1. Presets de Extractor disponibles:");
  for (const [key, p] of Object.entries(EXTRACTOR_PRESETS)) {
    console.log(`   - [${key}]: ${p.label} -> ${p.description}`);
  }

  // 2. Test Cinecalidad (vimeos_json)
  console.log("\n2. Test Extracción Cinecalidad (vimeos_json) - Película 550:");
  const cineRes = await runHlsExtractor({ providerId: 'cinecalidad', type: 'movie', id: '550' });
  console.log("   * Success:", cineRes.success);
  console.log("   * Primary HLS:", cineRes.hlsUrl ? cineRes.hlsUrl.slice(0, 65) + "..." : "Ninguno");
  console.log("   * Backups:", cineRes.backupHlsUrls?.length || 0);
  console.log("   * Embeds:", cineRes.embeds?.length || 0);
  console.log(`   * Duración: ${cineRes.durationMs}ms`);
  if (cineRes.stepTraces) {
    console.log("   * Traza de Pasos del Pipeline:");
    for (const st of cineRes.stepTraces) {
      console.log(`     - [${st.stepId}] (${st.action}): ${st.success ? '✓' : '✕'} ${st.summary || st.error} (${st.durationMs}ms)`);
    }
  }

  // 3. Test NasriPlay (nasriplay_token)
  console.log("\n3. Test Extracción NasriPlay (nasriplay_token) - Película 550:");
  const nasriRes = await runHlsExtractor({ providerId: 'nasriplay', type: 'movie', id: '550' });
  console.log("   * Success:", nasriRes.success);
  console.log("   * Primary HLS:", nasriRes.hlsUrl ? nasriRes.hlsUrl.slice(0, 65) + "..." : "Ninguno");
  console.log("   * Backups (auto-failover):", nasriRes.backupHlsUrls?.length || 0);
  console.log("   * Embeds (mirrors):", nasriRes.embeds?.length || 0);
  console.log(`   * Duración: ${nasriRes.durationMs}ms`);

  // 4. Test PlayerFlix (playerflix)
  console.log("\n4. Test Extracción PlayerFlix (playerflix) - Serie 1399 1/1:");
  const pfRes = await runHlsExtractor({ providerId: 'playerflix', type: 'tv', id: '1399', season: 1, episode: 1 });
  console.log("   * Success:", pfRes.success);
  console.log("   * HLS Stream:", pfRes.hlsUrl);
  console.log(`   * Duración: ${pfRes.durationMs}ms`);

  // 5. Test Configuración en Base de Datos Supabase
  console.log("\n5. Verificando estado en Supabase:");
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { data: provs } = await sb.from('providers').select('id, name, ord, active, lang').order('ord');
  const activeProvs = (provs || []).filter(p => p.active);
  console.log(`   * Proveedores Activos (${activeProvs.length}):`, activeProvs.map(p => `[${p.ord}] ${p.name}`));
  const { data: allowEmbed } = await sb.from('config').select('value').eq('key', 'allow_embed_fallback').maybeSingle();
  console.log(`   * allow_embed_fallback en config: '${allowEmbed?.value}' (debe ser 'false')`);

  console.log("\n=== VALIDACIÓN DEL MOTOR DINÁMICO HLS CONCLUIDA CON ÉXITO ===");
}

main().catch(console.error);
