import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

function run() {
  console.log('=== TEST SPEC 087: Episode Navigation Cleanup, TV Remote Drawer & Admin Pools Removal ===\n');

  // Test 1: Check app/watch/page.tsx for removal of old buttons
  console.log('Test 1: Verify old episode buttons are deleted in app/watch/page.tsx...');
  const watchPageContent = fs.readFileSync('app/watch/page.tsx', 'utf-8');
  assert.ok(!watchPageContent.includes('id="btn-prev-ep"'), 'btn-prev-ep must be removed');
  assert.ok(!watchPageContent.includes('id="btn-next-ep"'), 'btn-next-ep must be removed');
  assert.ok(!watchPageContent.includes('id="btn-all-ep"'), 'btn-all-ep must be removed');
  assert.ok(!watchPageContent.includes('d.todos_capitulos'), 'todos_capitulos must be removed from watch page');
  console.log('  [PASS] Old episode navigation buttons successfully removed.\n');

  // Test 2: Check components/player/EpisodesDrawer.tsx for compact design and TV remote capabilities
  console.log('Test 2: Verify EpisodesDrawer.tsx compact design and TV remote handlers...');
  const drawerContent = fs.readFileSync('components/player/EpisodesDrawer.tsx', 'utf-8');
  
  // No native <select> tag
  assert.ok(!drawerContent.includes('<select'), 'HTML select tag must not be present in EpisodesDrawer');
  
  // D-pad arrow navigation
  assert.ok(drawerContent.includes('ArrowDown'), 'ArrowDown navigation must be supported');
  assert.ok(drawerContent.includes('ArrowUp'), 'ArrowUp navigation must be supported');
  assert.ok(drawerContent.includes('ArrowLeft'), 'ArrowLeft navigation must be supported');
  assert.ok(drawerContent.includes('ArrowRight'), 'ArrowRight navigation must be supported');
  assert.ok(drawerContent.includes('Escape'), 'Escape / Back navigation must be supported');
  
  // Keycode support for smart TVs (Tizen 10009, WebOS 461, etc.)
  assert.ok(drawerContent.includes('10009'), 'Tizen Back keycode must be supported');
  assert.ok(drawerContent.includes('461'), 'WebOS Back keycode must be supported');

  // Event propagation isolation
  assert.ok(drawerContent.includes('stopPropagation'), 'stopPropagation must be called to protect player controls');

  // Auto-focus and scrollIntoView
  assert.ok(drawerContent.includes('scrollIntoView'), 'scrollIntoView must be implemented for active episode');
  assert.ok(drawerContent.includes('focus('), 'focus() must be called on episode / season items');

  // Compact layout check
  assert.ok(drawerContent.includes('max-w-md') || drawerContent.includes('max-w-[420px]'), 'Drawer must be compact');
  assert.ok(drawerContent.includes('focus:ring-2 focus:ring-white'), 'High-contrast TV focus ring must be present');

  console.log('  [PASS] EpisodesDrawer is compact, simple, and 100% TV remote controllable.\n');

  // Test 3: Check app/admin/page.tsx for complete removal of Pools
  console.log('Test 3: Verify all pool references are removed from app/admin/page.tsx...');
  const adminPageContent = fs.readFileSync('app/admin/page.tsx', 'utf-8');
  
  const poolMatches = adminPageContent.match(/pool/gi);
  assert.strictEqual(poolMatches, null, `No occurrences of 'pool' should exist in app/admin/page.tsx (found: ${poolMatches?.length})`);
  
  assert.ok(adminPageContent.includes('Stream HLS Nativo'), 'Admin page should refer to Stream HLS Nativo');
  assert.ok(!adminPageContent.includes('POOLS HLS UNIFICADOS'), 'Supervision panel of pools must be removed');
  assert.ok(!adminPageContent.includes('Unified HLS Pool'), 'Unified HLS Pool must be removed');

  console.log('  [PASS] All pool references completely removed from administration panel.\n');

  console.log('=== ALL TESTS IN SPEC 087 PASSED SUCCESSFULLY! ===');
}

run();
