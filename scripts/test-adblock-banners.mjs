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
  "https://acceptable.a-ads.com/2446762/?size=Adaptive",
  "https://ad.a-ads.com/12345",
  "https://monetag.com/push",
];

for (const url of testAdUrls) {
  assert.strictEqual(isBlocked(url), true, `URL publicitaria debería estar bloqueada: ${url}`);
}
console.log("  ✓ Todas las URLs de redes de apuestas, a-ads y banners VAST fueron bloqueadas correctamente");

// Verificar que hosts legítimos no estén bloqueados
assert.strictEqual(isAllowedHost("tvshowapp.net"), true);
assert.strictEqual(isAllowedHost("pipocacine.lat"), true);
assert.strictEqual(isAllowedHost("redeflixapi.store"), true);
console.log("  ✓ Hosts legítimos de streaming permanecen permitidos");

// 2. Verificar sincronización de listas en Android y Electron
const electronHosts = fs.readFileSync(path.join(root, "electron", "adhosts.txt"), "utf8");
const androidHosts = fs.readFileSync(path.join(root, "android", "app", "src", "main", "assets", "adhosts.txt"), "utf8");

for (const requiredDomain of ["bc.game", "magsrv.com", "adport.io", "richads.co", "betano.com", "lactamclaes.com", "waust.at", "a-ads.com", "acceptable.a-ads.com"]) {
  assert.ok(electronHosts.includes(requiredDomain), `Electron adhosts debe contener ${requiredDomain}`);
  assert.ok(androidHosts.includes(requiredDomain), `Android adhosts debe contener ${requiredDomain}`);
}
console.log("  ✓ Listas adhosts.txt sincronizadas y contienen dominios de apuestas y a-ads");

// 3. Verificar inyección de CSS cosmético y defusers en Electron main.js
const electronMain = fs.readFileSync(path.join(root, "electron", "main.js"), "utf8");
assert.ok(electronMain.includes("tvshow-adblock-cosmetic"), "electron/main.js debe inyectar CSS cosmético");
assert.ok(electronMain.includes('[class*="banner"]'), "electron/main.js debe incluir selector de banners");
assert.ok(electronMain.includes('a[href*="bc.game"]'), "electron/main.js debe incluir selectores de bc.game");
assert.ok(electronMain.includes('iframe[src*="a-ads.com"]'), "electron/main.js debe incluir selector de colapso para a-ads.com");
assert.ok(electronMain.includes("player-external-click-hitbox"), "electron/main.js debe neutralizar el hitbox");
assert.ok(electronMain.includes("openExternalAd"), "electron/main.js debe defusar openExternalAd");
console.log("  ✓ Filtrado cosmético y defusers validados en electron/main.js");

// 4. Verificar filtrado y supresión de error en Android WebViewClient
const androidClient = fs.readFileSync(path.join(root, "android", "app", "src", "main", "java", "com", "tvshow", "app", "AdBlockWebViewClient.java"), "utf8");
assert.ok(androidClient.includes("onPageFinished"), "AdBlockWebViewClient debe tener onPageFinished");
assert.ok(androidClient.includes("tvshow-adblock-cosmetic"), "AdBlockWebViewClient debe inyectar estilo cosmético");
assert.ok(androidClient.includes("onReceivedError"), "AdBlockWebViewClient debe suprimir onReceivedError para ads");
assert.ok(androidClient.includes("background:transparent"), "AdBlockWebViewClient debe devolver HTML transparente");
assert.ok(androidClient.includes("iframe[src*=\\\"a-ads"), "AdBlockWebViewClient debe colapsar iframes de a-ads");
console.log("  ✓ Inyección cosmética y supresión de error validadas en Android AdBlockWebViewClient.java");

// 5. Verificar AdBlock.java pattern matching
const androidAdBlock = fs.readFileSync(path.join(root, "android", "app", "src", "main", "java", "com", "tvshow", "app", "AdBlock.java"), "utf8");
assert.ok(androidAdBlock.includes("bc.game"), "AdBlock.java debe comprobar bc.game");
assert.ok(androidAdBlock.includes("lactamclaes"), "AdBlock.java debe comprobar lactamclaes");
assert.ok(androidAdBlock.includes("a-ads"), "AdBlock.java debe comprobar a-ads");
assert.ok(androidAdBlock.includes("magsrv.com"), "AdBlock.java debe comprobar magsrv.com");
console.log("  ✓ Patrones de apuestas y VAST validados en AdBlock.java");

// 6. Verificar Sandbox condicional en IframeSourcePlayer.tsx (para evitar romper servidores como S2 Embos)
const playerCode = fs.readFileSync(path.join(root, "components", "player", "IframeSourcePlayer.tsx"), "utf8");
assert.ok(playerCode.includes('sandbox={source.sandbox || undefined}'), "IframeSourcePlayer debe usar sandbox condicional para no romper servidores como S2");
console.log("  ✓ Sandbox condicional validado en IframeSourcePlayer.tsx");

console.log("🎉 ¡Todas las pruebas de Bloqueo de Popads y Banners pasaron satisfactoriamente!");
