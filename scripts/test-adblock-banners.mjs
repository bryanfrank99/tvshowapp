import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = process.cwd();

console.log("🧪 Iniciando pruebas de Bloqueo de Popads y Banners In-Player...");

// 1. Probar lógica de electron/adblock.js
const { initAdBlock, isBlocked, isAllowedHost } = require(path.join(root, "electron", "adblock.js"));
initAdBlock(path.join(root, "electron", "adhosts.txt"));

const testAdUrls = [
  "https://bc.game/promotions/welcome",
  "https://sub.bcgame.top/affiliate",
  "https://a.magsrv.com/video/banner.js",
  "https://syndication.exoclick.com/tag.php",
  "https://adport.io/banner.js",
  "https://richads.co/delivery/inpage",
  "https://cdn.example.org/ads/vast.xml",
  "https://unknown.net/lib/vpaid.js",
  "https://cdn.tracker.info/popads.js",
  "https://betano.com/landing",
  "https://popcash.net/script.js",
  "https://eb.lactamclaes.com/iZrpnEtg2l2Rb/137837",
  "https://waust.at/d.js",
  "https://monetag.com/push",
];

for (const url of testAdUrls) {
  assert.strictEqual(isBlocked(url), true, `URL publicitaria debería estar bloqueada: ${url}`);
}
console.log("  ✓ Todas las URLs de redes de apuestas y banners VAST fueron bloqueadas correctamente");

// Verificar que hosts legítimos no estén bloqueados
assert.strictEqual(isAllowedHost("tvshowapp.net"), true);
assert.strictEqual(isAllowedHost("pipocacine.lat"), true);
assert.strictEqual(isAllowedHost("redeflixapi.store"), true);
console.log("  ✓ Hosts legítimos de streaming permanecen permitidos");

// 2. Verificar sincronización de listas en Android y Electron
const electronHosts = fs.readFileSync(path.join(root, "electron", "adhosts.txt"), "utf8");
const androidHosts = fs.readFileSync(path.join(root, "android", "app", "src", "main", "assets", "adhosts.txt"), "utf8");

for (const requiredDomain of ["bc.game", "magsrv.com", "adport.io", "richads.co", "betano.com", "lactamclaes.com", "waust.at"]) {
  assert.ok(electronHosts.includes(requiredDomain), `Electron adhosts debe contener ${requiredDomain}`);
  assert.ok(androidHosts.includes(requiredDomain), `Android adhosts debe contener ${requiredDomain}`);
}
console.log("  ✓ Listas adhosts.txt sincronizadas y contienen dominios de apuestas y banners");

// 3. Verificar inyección de CSS cosmético y defusers en Electron main.js
const electronMain = fs.readFileSync(path.join(root, "electron", "main.js"), "utf8");
assert.ok(electronMain.includes("tvshow-adblock-cosmetic"), "electron/main.js debe inyectar CSS cosmético");
assert.ok(electronMain.includes('[class*="banner"]'), "electron/main.js debe incluir selector de banners");
assert.ok(electronMain.includes('a[href*="bc.game"]'), "electron/main.js debe incluir selectores de bc.game");
assert.ok(electronMain.includes("player-external-click-hitbox"), "electron/main.js debe neutralizar el hitbox");
assert.ok(electronMain.includes("openExternalAd"), "electron/main.js debe defusar openExternalAd");
console.log("  ✓ Filtrado cosmético y defusers validados en electron/main.js");

// 4. Verificar filtrado en Android WebViewClient
const androidClient = fs.readFileSync(path.join(root, "android", "app", "src", "main", "java", "com", "tvshow", "app", "AdBlockWebViewClient.java"), "utf8");
assert.ok(androidClient.includes("onPageFinished"), "AdBlockWebViewClient debe tener onPageFinished");
assert.ok(androidClient.includes("tvshow-adblock-cosmetic"), "AdBlockWebViewClient debe inyectar estilo cosmético");
console.log("  ✓ Inyección cosmética validada en Android AdBlockWebViewClient.java");

// 5. Verificar AdBlock.java pattern matching
const androidAdBlock = fs.readFileSync(path.join(root, "android", "app", "src", "main", "java", "com", "tvshow", "app", "AdBlock.java"), "utf8");
assert.ok(androidAdBlock.includes("bc.game"), "AdBlock.java debe comprobar bc.game");
assert.ok(androidAdBlock.includes("lactamclaes"), "AdBlock.java debe comprobar lactamclaes");
assert.ok(androidAdBlock.includes("magsrv.com"), "AdBlock.java debe comprobar magsrv.com");
console.log("  ✓ Patrones de apuestas y VAST validados en AdBlock.java");

// 6. Verificar Sandbox seguro por defecto en IframeSourcePlayer.tsx
const playerCode = fs.readFileSync(path.join(root, "components", "player", "IframeSourcePlayer.tsx"), "utf8");
assert.ok(playerCode.includes('allow-scripts allow-same-origin allow-forms allow-presentation'), "IframeSourcePlayer debe tener sandbox restrictivo por defecto");
assert.ok(!playerCode.includes('allow-popups'), "IframeSourcePlayer no debe otorgar allow-popups");
console.log("  ✓ Sandbox defensivo validado en IframeSourcePlayer.tsx");

console.log("🎉 ¡Todas las pruebas de Bloqueo de Popads y Banners pasaron satisfactoriamente!");
