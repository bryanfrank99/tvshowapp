import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

console.log("=== Running in-app trailer playback tests ===");

// 1. Electron adblock host test
console.log("Testing electron/adblock.js allowed hosts...");
const { isAllowedHost, isBlocked } = await import(pathToFileURL(path.join(rootDir, "electron", "adblock.js")).href);

assert.equal(isAllowedHost("www.youtube.com"), true, "www.youtube.com should be allowed");
assert.equal(isAllowedHost("youtube.com"), true, "youtube.com should be allowed");
assert.equal(isAllowedHost("youtube-nocookie.com"), true, "youtube-nocookie.com should be allowed");
assert.equal(isAllowedHost("www.youtube-nocookie.com"), true, "www.youtube-nocookie.com should be allowed");
assert.equal(isAllowedHost("rr1---sn-vgqsrn7e.googlevideo.com"), true, "googlevideo subdomain should be allowed");
assert.equal(isAllowedHost("i.ytimg.com"), true, "i.ytimg.com should be allowed");

// Ensure ad blocking is still functional
assert.equal(isBlocked("https://googleads.g.doubleclick.net/pagead/id"), true, "DoubleClick ads should still be blocked");
console.log("✓ electron/adblock.js passes host verification");

// 2. Capacitor allowNavigation test
console.log("Testing capacitor.config.ts...");
const capConfig = fs.readFileSync(path.join(rootDir, "capacitor.config.ts"), "utf-8");
assert.ok(capConfig.includes("*.youtube.com"), "capacitor.config.ts must allow *.youtube.com");
assert.ok(capConfig.includes("*.youtube-nocookie.com"), "capacitor.config.ts must allow *.youtube-nocookie.com");
assert.ok(capConfig.includes("*.googlevideo.com"), "capacitor.config.ts must allow *.googlevideo.com");
assert.ok(capConfig.includes("*.ytimg.com"), "capacitor.config.ts must allow *.ytimg.com");
console.log("✓ capacitor.config.ts passes allowNavigation verification");

// 3. Android WebViewClient and WebChromeClient test
console.log("Testing Android clients...");
const webViewClient = fs.readFileSync(path.join(rootDir, "android/app/src/main/java/com/tvshow/app/AdBlockWebViewClient.java"), "utf-8");
assert.ok(webViewClient.includes('"youtube.com"'), "AdBlockWebViewClient must allow youtube.com");
assert.ok(webViewClient.includes('"youtube-nocookie.com"'), "AdBlockWebViewClient must allow youtube-nocookie.com");
assert.ok(webViewClient.includes('"googlevideo.com"'), "AdBlockWebViewClient must allow googlevideo.com");
assert.ok(webViewClient.includes('"ytimg.com"'), "AdBlockWebViewClient must allow ytimg.com");

const webChromeClient = fs.readFileSync(path.join(rootDir, "android/app/src/main/java/com/tvshow/app/AdBlockWebChromeClient.java"), "utf-8");
assert.ok(webChromeClient.includes('"youtube.com"'), "AdBlockWebChromeClient must allow youtube.com");
assert.ok(webChromeClient.includes('"youtube-nocookie.com"'), "AdBlockWebChromeClient must allow youtube-nocookie.com");
assert.ok(webChromeClient.includes('"googlevideo.com"'), "AdBlockWebChromeClient must allow googlevideo.com");
assert.ok(webChromeClient.includes('"ytimg.com"'), "AdBlockWebChromeClient must allow ytimg.com");
console.log("✓ Android WebViewClient and WebChromeClient pass allowed host verification");

// 4. Electron main.js test
console.log("Testing electron/main.js...");
const mainJs = fs.readFileSync(path.join(rootDir, "electron/main.js"), "utf-8");
assert.ok(
  /if\s*\(\s*isAllowedHost\s*\(\s*host\s*\)\s*\)\s*\{\s*return;?\s*\}/.test(mainJs) ||
  mainJs.includes("if (isAllowedHost(host)) return;"),
  "will-frame-navigate must allow allowed stream hosts without kicking to external browser"
);
assert.ok(
  mainJs.includes("h.indexOf('youtube') !== -1") && mainJs.includes("h.indexOf('googlevideo') !== -1"),
  "did-frame-finish-load must exclude youtube and googlevideo from aggressive ad defuser injection"
);
console.log("✓ electron/main.js passes frame navigation and defuser exclusion verification");

// 5. TrailerButton component test
console.log("Testing components/TrailerButton.tsx...");
const trailerBtn = fs.readFileSync(path.join(rootDir, "components/TrailerButton.tsx"), "utf-8");
assert.ok(trailerBtn.includes("youtube-nocookie.com/embed/"), "TrailerButton must use youtube-nocookie.com");
assert.ok(trailerBtn.includes("playsinline=1"), "TrailerButton must include playsinline=1");
assert.ok(trailerBtn.includes("allow="), "TrailerButton must specify iframe permissions");
console.log("✓ TrailerButton.tsx passes player config verification");

// 6. Title page trailer selection test
console.log("Testing app/title/page.tsx trailer prioritization...");
const titlePage = fs.readFileSync(path.join(rootDir, "app/title/page.tsx"), "utf-8");
assert.ok(
  titlePage.includes('v.type === "Trailer"'),
  "app/title/page.tsx must prioritize official Trailer videos"
);
console.log("✓ app/title/page.tsx passes prioritization verification");

console.log("\nALL IN-APP TRAILER TESTS PASSED! 🎉");
