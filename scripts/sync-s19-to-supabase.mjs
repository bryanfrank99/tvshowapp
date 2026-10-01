import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function sync() {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  console.log('1. Updating provider cinecalidad in Supabase providers table...');
  const { data: prov, error: provErr } = await sb
    .from('providers')
    .update({
      movie_tpl: 'https://tmdb.allcalidad.re/v1/playback/movie/{id}',
      tv_tpl: 'https://tmdb.allcalidad.re/v1/playback/tvshow/{id}?season={s}&episode={e}',
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'cinecalidad')
    .select();

  if (provErr) {
    console.error('Error updating provider:', provErr);
  } else {
    console.log('Provider updated successfully:', prov);
  }

  console.log('2. Updating provider_extractor_configs in config table...');
  const { data: extCfgRow } = await sb
    .from('config')
    .select('*')
    .eq('key', 'provider_extractor_configs')
    .single();

  let extConfigs = {};
  if (extCfgRow?.value) {
    try {
      extConfigs = JSON.parse(extCfgRow.value);
    } catch {}
  }

  extConfigs.cinecalidad = {
    version: 2,
    mode: 'pipeline',
    preset: 'cinecalidad',
    steps: [
      {
        id: 'cinecalidad_playback',
        action: 'http_request',
        movie_url: 'https://tmdb.allcalidad.re/v1/playback/movie/{id}',
        tv_url: 'https://tmdb.allcalidad.re/v1/playback/tvshow/{id}?season={s}&episode={e}',
        method: 'GET',
        headers: {
          Referer: 'https://cinecalidad.am/',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
        response_type: 'json',
        timeout_ms: 10000,
      },
      {
        id: 'cinecalidad_streams',
        action: 'cinecalidad_resolve_embeds',
        input: '{{cinecalidad_playback.embeds}}',
      },
    ],
    output: {
      hlsUrl: '{{cinecalidad_streams.hlsUrl}}',
      backupHlsUrls: '{{cinecalidad_streams.backupHlsUrls}}',
      subtitles: '{{cinecalidad_streams.subtitles}}',
      embeds: '{{cinecalidad_streams.embeds}}',
    },
  };

  const { error: cfgErr } = await sb
    .from('config')
    .upsert({
      key: 'provider_extractor_configs',
      value: JSON.stringify(extConfigs),
      updated_at: new Date().toISOString(),
    });
  if (cfgErr) console.error('Error updating extractor configs:', cfgErr);
  else console.log('provider_extractor_configs updated successfully!');

  console.log('3. Updating provider_stream_modes in config table...');
  const { data: modesRow } = await sb
    .from('config')
    .select('*')
    .eq('key', 'provider_stream_modes')
    .single();

  let modes = {};
  if (modesRow?.value) {
    try {
      modes = JSON.parse(modesRow.value);
    } catch {}
  }

  modes.cinecalidad = 'both';
  modes.playerflix = modes.playerflix || 'both';

  const { error: modesErr } = await sb
    .from('config')
    .upsert({
      key: 'provider_stream_modes',
      value: JSON.stringify(modes),
      updated_at: new Date().toISOString(),
    });
  if (modesErr) console.error('Error updating provider_stream_modes:', modesErr);
  else console.log('provider_stream_modes updated successfully:', modes);

  console.log('4. Clearing cached streams for cinecalidad...');
  try {
    await sb.from('stream_cache').delete().eq('provider_id', 'cinecalidad');
    console.log('Cache cleared for cinecalidad');
  } catch (e) {
    console.warn('Cache clearing warning:', e?.message);
  }

  console.log('Done syncing S19 to Supabase!');
}

sync();
