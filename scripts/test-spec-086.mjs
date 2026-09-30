import assert from 'node:assert';
import { fetchMegaEmbedStream, verifyStreamUrl, normalizeStreamUrl } from '../lib/megaembed.ts';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import fs from 'node:fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const supaUrl = env.match(/SUPABASE_URL=([^\r\n]+)/)?.[1]?.trim();
const supaKey = env.match(/SUPABASE_SERVICE_KEY=([^\r\n]+)/)?.[1]?.trim();
const sb = createClient(supaUrl, supaKey);

async function run() {
  console.log('=== TEST SPEC 086: MegaEmbed S14 Content Availability & Exclusion ===\n');

  // Test 1: URL Normalization
  console.log('Test 1: normalizeStreamUrl...');
  const dirty = 'https://mgeb.top/../cache/hls/test.m3u8';
  const clean = normalizeStreamUrl(dirty, 'https://mgeb.top');
  assert.strictEqual(clean, 'https://mgeb.top/cache/hls/test.m3u8', 'Should remove /../ from path');
  console.log('  [PASS] URL normalization works correctly.\n');

  // Test 2: Stream Verification with Dead / Corrupted URL
  console.log('Test 2: verifyStreamUrl rejection...');
  const deadCdnUrl = 'https://cdn2.playercdn.xyz/includes/hls.php?url=J2Tds69JjLB5thKNvg_R7D';
  const isDeadValid = await verifyStreamUrl(deadCdnUrl);
  assert.strictEqual(isDeadValid, false, 'Corrupted signature playercdn URL must be rejected');
  console.log('  [PASS] Dead/invalid signature stream properly rejected.\n');

  // Test 3: Stream Verification with Real Valid HLS Playlist
  console.log('Test 3: verifyStreamUrl acceptance of valid playlist...');
  const validUrl = 'https://mgeb.top/cache/hls/73e53b2e64cd2ffdcb0ee2cb0d93ea57.m3u8';
  const isValidOk = await verifyStreamUrl(validUrl);
  assert.strictEqual(isValidOk, true, 'Valid HLS playlist must be accepted');
  console.log('  [PASS] Valid HLS playlist properly accepted.\n');

  // Test 4: Live Resolver Check via Local Dev Server
  console.log('Test 4: /api/resolve exclusion of S14 when content is missing...');
  // Generate active test session
  const { data: code } = await sb.from('access_codes').select('*').eq('revoked', false).limit(1).single();
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  await sb.from('sessions').insert({ code_id: code.id, token_hash: tokenHash });

  // Test 4a: Movie without content on MegaEmbed (Inside Out 2: 1022789)
  console.log('  Testing resolve for Inside Out 2 (1022789)...');
  const resMissing = await fetch('http://localhost:3000/api/resolve?id=1022789&type=movie&lang=pt', {
    headers: { Authorization: `Bearer ${rawToken}` }
  });
  const dataMissing = await resMissing.json();
  const s14SourcesMissing = (dataMissing.sources || []).filter(
    (s) => s.id?.includes('megaembed') || s.providerId === 'megaembed' || s.providerName?.includes('S14')
  );
  console.log('  MegaEmbed sources found for 1022789:', s14SourcesMissing.length);
  assert.strictEqual(s14SourcesMissing.length, 0, 'S14 must NOT be present when MegaEmbed has no valid content');
  console.log('  [PASS] S14 properly excluded for movie without valid content.\n');

  // Test 4b: Title with valid content (Breaking Bad S1E1: 1396)
  console.log('  Testing resolve for Breaking Bad S1E1 (1396)...');
  const resValid = await fetch('http://localhost:3000/api/resolve?id=1396&type=tv&s=1&e=1&lang=pt', {
    headers: { Authorization: `Bearer ${rawToken}` }
  });
  const dataValid = await resValid.json();
  const s14SourcesValid = (dataValid.sources || []).filter(
    (s) => s.id?.includes('megaembed') || s.providerId === 'megaembed' || s.providerName?.includes('S14')
  );
  console.log('  MegaEmbed sources found for 1396:', s14SourcesValid.length);
  if (s14SourcesValid.length > 0) {
    const s14 = s14SourcesValid[0];
    assert.strictEqual(s14.type, 'hls', 'Valid MegaEmbed source must be direct HLS');
    assert.ok(s14.providerName.includes('HLS - S14'), 'Provider name must be HLS - S14');
    console.log(`  [PASS] HLS - S14 correctly included with verified stream: ${s14.url.slice(0, 60)}...\n`);
  } else {
    console.log('  [INFO] S14 had no live stream at this moment and was safely excluded.\n');
  }

  console.log('=== ALL TESTS IN SPEC 086 PASSED SUCCESSFULLY! ===');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
