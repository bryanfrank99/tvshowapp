import fs from 'fs';
import dotenv from 'dotenv';
if (fs.existsSync('.env.local')) {
  const env = dotenv.parse(fs.readFileSync('.env.local'));
  for (const k in env) process.env[k] = env[k];
}
import { createClient } from '@supabase/supabase-js';
import { fetchNasriPlayStream } from '../lib/nasriplay.ts';

async function main() {
  console.log("=== INICIANDO VALIDACIÓN DE MULTI-MIRROR Y FAILOVER EN S17 (NASRIPLAY) ===");

  // 1. Verificación de BD en Supabase
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { data: p17, error: p17Err } = await sb.from('providers').select('*').eq('id', 'nasriplay').single();
  if (p17Err) {
    console.error("❌ Error al consultar proveedor en Supabase:", p17Err);
  } else {
    console.log("\n✅ Configuración en BD Supabase para S17 (NasriPlay):");
    console.log(`   - ID: ${p17.id} | Ord: ${p17.ord} | Active: ${p17.active} | Name: ${p17.name}`);
    console.log(`   - movie_tpl: ${p17.movie_tpl}`);
    console.log(`   - tv_tpl: ${p17.tv_tpl}`);
    console.log(`   - movie_list_url: '${p17.movie_list_url}' (limpio)`);
    console.log(`   - tv_list_url: '${p17.tv_list_url}' (limpio)`);
  }

  // 2. Test Extracción Película TMDB 550 (Fight Club)
  console.log("\n--- TEST 1: Película TMDB 550 (Fight Club) ---");
  const movieRes = await fetchNasriPlayStream({ id: '550', type: 'movie' });
  console.log("HLS Success:", movieRes?.success);
  console.log("Primary HLS:", movieRes?.hlsUrl ? movieRes.hlsUrl.slice(0, 75) + "..." : "Ninguno");
  console.log("Backup HLS URLs (para auto-failover):", movieRes?.backupHlsUrls?.length || 0);
  movieRes?.backupHlsUrls?.forEach((u, i) => console.log(`   * Backup ${i + 1}: ${u.slice(0, 75)}...`));
  console.log(`Embeds Mirrors count: ${movieRes?.embeds?.length || 0}`);
  movieRes?.embeds?.forEach((e, i) => console.log(`   * [${e.host || e.name}] ${e.url.slice(0, 65)}...`));

  // 3. Test Extracción Serie TMDB 1399 S01E01 (Game of Thrones)
  console.log("\n--- TEST 2: Serie TMDB 1399 S01E01 (Game of Thrones) ---");
  const tvRes = await fetchNasriPlayStream({ id: '1399', type: 'tv', season: 1, episode: 1 });
  console.log("TV HLS Success:", tvRes?.success);
  console.log("TV Primary HLS:", tvRes?.hlsUrl ? tvRes.hlsUrl.slice(0, 75) + "..." : "Ninguno");
  console.log("TV Backup HLS URLs:", tvRes?.backupHlsUrls?.length || 0);
  tvRes?.backupHlsUrls?.forEach((u, i) => console.log(`   * Backup ${i + 1}: ${u.slice(0, 75)}...`));
  console.log(`TV Embeds Mirrors count: ${tvRes?.embeds?.length || 0}`);
  tvRes?.embeds?.forEach((e, i) => console.log(`   * [${e.host || e.name}] ${e.url.slice(0, 65)}...`));

  // 4. Test en /api/resolve
  console.log("\n--- TEST 3: Resolución completa en /api/resolve ---");
  const { GET } = await import('../app/api/resolve/route.ts');
  const { NextRequest } = await import('next/server');
  const { sha, newToken } = await import('../lib/access.ts');

  const { data: code } = await sb.from('access_codes').select('*').eq('revoked', false).gt('expires_at', new Date().toISOString()).limit(1).single();
  const token = newToken();
  const tokenHash = sha(token);
  await sb.from('sessions').insert({ token_hash: tokenHash, code_id: code.id, device_hint: 'Test Runner' });

  try {
    const req = new NextRequest('http://localhost:3000/api/resolve?type=movie&id=550&lang=es', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const res = await GET(req);
    const data = await res.json();
    const s17Sources = data.sources?.filter(s => s.id?.includes('nasriplay') || s.ord === 17);
    console.log(`\nFuentes devueltas para S17 en Película 550 (${s17Sources?.length || 0}):`);
    for (const s of s17Sources || []) {
      console.log(`  * ID: ${s.id} | Tipo: ${s.type} | Name: ${s.providerName} | Priority: ${s.priority} | URL: ${s.url.slice(0, 60)}...`);
      if (s.backupUrls && s.backupUrls.length > 0) {
        console.log(`    backupUrls (${s.backupUrls.length}):`, s.backupUrls.map(u => u.slice(0, 45) + "..."));
      }
      if (s.embedOptions) {
        console.log(`    embedOptions (${s.embedOptions.length}):`, s.embedOptions.map(e => `[${e.host || e.name}] ${e.url.slice(0, 45)}...`));
      }
    }
  } finally {
    await sb.from('sessions').delete().eq('token_hash', tokenHash);
  }

  console.log("\n=== VALIDACIÓN DE S17 FINALIZADA CON ÉXITO ===");
}

main().catch(console.error);
