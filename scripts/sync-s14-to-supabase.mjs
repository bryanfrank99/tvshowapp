import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function sync() {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  console.log('1. Updating provider megaembed in Supabase providers table (active = true)...');
  const { data: prov, error: provErr } = await sb
    .from('providers')
    .update({
      movie_tpl: 'https://mgeb.top/embed/{id}',
      tv_tpl: 'https://mgeb.top/embed/{id}/{s}/{e}',
      active: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'megaembed')
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

  extConfigs.megaembed = {
    version: 2,
    mode: 'pipeline',
    preset: 'megaembed',
    steps: [
      {
        id: 'embed_page',
        action: 'http_request',
        movie_url: 'https://mgeb.top/embed/{id}',
        tv_url: 'https://mgeb.top/embed/{id}/{s}/{e}',
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          Referer: 'https://mgeb.top/',
        },
        response_type: 'text',
        timeout_ms: 25000,
        allow_embed_fallback: true,
      },
      {
        id: 'sources_json',
        action: 'regex_extract',
        input: '{{embed_page}}',
        pattern: 'var\\s+sources\\s*=\\s*(\\[[\\s\\S]*?\\]);',
        group: 1,
        required: false,
      },
      {
        id: 'mega_streams',
        action: 'megaembed_parse_sources',
        input: '{{sources_json}}',
        required: false,
      },
    ],
    output: {
      hlsUrl: '{{mega_streams.hlsUrl}}',
      backupHlsUrls: '{{mega_streams.backupHlsUrls}}',
      embeds: '{{mega_streams.embeds}}',
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

  modes.megaembed = 'both';
  modes.playerflix = modes.playerflix || 'both';
  modes.cinecalidad = modes.cinecalidad || 'both';

  const { error: modesErr } = await sb
    .from('config')
    .upsert({
      key: 'provider_stream_modes',
      value: JSON.stringify(modes),
      updated_at: new Date().toISOString(),
    });
  if (modesErr) console.error('Error updating provider_stream_modes:', modesErr);
  else console.log('provider_stream_modes updated successfully:', modes);

  console.log('4. Clearing cached streams for megaembed...');
  try {
    await sb.from('stream_cache').delete().eq('provider_id', 'megaembed');
    console.log('Cache cleared for megaembed');
  } catch (e) {
    console.warn('Cache clearing warning:', e?.message);
  }

  console.log('Done syncing S14 to Supabase!');
}

sync();
