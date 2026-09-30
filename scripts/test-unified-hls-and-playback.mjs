// scripts/test-unified-hls-and-playback.mjs
import assert from "assert";
import { fetchWatchPlayStream } from "../lib/watchplay.ts";
import { getPlaybackKey } from "../lib/playback-progress.ts";

console.log("=== TEST SUITE: POOL HLS UNIFICADO, WATCHPLAY S18 Y RESUME PLAYBACK ===");

async function runTests() {
  console.log("1. Probando extracción WatchPlay S18...");
  const s18Result = await fetchWatchPlayStream({
    id: "113962",
    type: "tv",
    season: 1,
    episode: 1,
  });

  assert(s18Result && s18Result.success, "WatchPlay debe extraer stream con éxito");
  assert(s18Result.hlsUrl.includes(".m3u8"), "La URL debe contener .m3u8");
  console.log("   ✅ WatchPlay S18 extrajo URL M3U8:", s18Result.hlsUrl.slice(0, 70) + "...");

  // 2. Probar cálculo de TTL dinámico para stream con token expires
  const expMatch = s18Result.hlsUrl.match(/[?&]expires=([0-9]{10})/i);
  assert(expMatch, "La URL debe contener parámetro expires");
  const expSec = parseInt(expMatch[1], 10);
  const nowSec = Math.floor(Date.now() / 1000);
  const remainingSec = expSec - nowSec;
  console.log(`   ✅ Parámetro expires detectado: ${expSec} (restan ${Math.round(remainingSec / 60)} minutos de validez)`);
  assert(remainingSec > 0, "El token debe estar vigente");

  // 3. Probar claves de progreso de reproducción
  const movieKey = getPlaybackKey("movie", "550");
  const tvKey = getPlaybackKey("tv", "113962", 1, 1);

  assert.strictEqual(movieKey, "tvshow_playback_pos_v1_movie_550");
  assert.strictEqual(tvKey, "tvshow_playback_pos_v1_tv_113962_s1_e1");
  console.log("   ✅ Generación de claves de progreso de reproducción en local DB validada:", { movieKey, tvKey });

  console.log("=== TODOS LOS TESTS PASARON EXITOSAMENTE ===");
}

runTests().catch((err) => {
  console.error("❌ ERROR EN TESTS:", err);
  process.exit(1);
});
