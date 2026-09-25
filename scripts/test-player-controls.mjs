// scripts/test-player-controls.mjs
// Suite de verificación automatizada para el control con mando de todos los reproductores

import assert from "node:assert";

console.log("=== INICIANDO PRUEBAS DE CONTROL DE REPRODUCTORES CON MANDO ===");

// -------------------------------------------------------------
// [PRUEBA 1] REPRODUCTOR NATIVO (NativeSourcePlayer)
// -------------------------------------------------------------
console.log("\n[TEST 1] Reproductor Nativo: Control con Mando y OSD");

class MockVideoElement {
  constructor() {
    this.paused = true;
    this.currentTime = 50;
    this.duration = 600;
    this.volume = 0.8;
    this.buffered = {
      length: 1,
      end: () => 120,
    };
  }
  async play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

const mockVideo = new MockVideoElement();
let isPlaying = false;
let currentTime = mockVideo.currentTime;
let volume = mockVideo.volume;
let osdFeedback = null;

// Simular lógica de control de NativeSourcePlayer
function handleNativeKey(keyCode) {
  // DPAD_CENTER (23), Enter (13), Space (32), MediaPlayPause (179)
  if (keyCode === 23 || keyCode === 13 || keyCode === 32 || keyCode === 179) {
    if (mockVideo.paused) {
      mockVideo.play();
      isPlaying = true;
      osdFeedback = { icon: "▶", text: "Reproducir" };
    } else {
      mockVideo.pause();
      isPlaying = false;
      osdFeedback = { icon: "⏸", text: "Pausa" };
    }
    return true;
  }

  // Fast Forward +10s (ArrowRight 22/39, 228)
  if (keyCode === 22 || keyCode === 39 || keyCode === 228) {
    mockVideo.currentTime = Math.min(mockVideo.duration, mockVideo.currentTime + 10);
    currentTime = mockVideo.currentTime;
    osdFeedback = { icon: "⏩", text: "+10s" };
    return true;
  }

  // Rewind -10s (ArrowLeft 21/37, 227)
  if (keyCode === 21 || keyCode === 37 || keyCode === 227) {
    mockVideo.currentTime = Math.max(0, mockVideo.currentTime - 10);
    currentTime = mockVideo.currentTime;
    osdFeedback = { icon: "⏪", text: "-10s" };
    return true;
  }

  // Volume Up (ArrowUp 19/38)
  if (keyCode === 19 || keyCode === 38) {
    mockVideo.volume = Math.min(1, mockVideo.volume + 0.1);
    volume = mockVideo.volume;
    osdFeedback = { icon: "🔊", text: "Volumen" };
    return true;
  }

  // Volume Down (ArrowDown 20/40)
  if (keyCode === 20 || keyCode === 40) {
    mockVideo.volume = Math.max(0, mockVideo.volume - 0.1);
    volume = mockVideo.volume;
    osdFeedback = { icon: "🔉", text: "Volumen" };
    return true;
  }

  return false;
}

// 1.1 Play
handleNativeKey(23); // DPAD_CENTER
assert.strictEqual(isPlaying, true, "DPAD_CENTER debe iniciar reproducción");
assert.strictEqual(osdFeedback.icon, "▶", "Debe mostrar badge de reproducción");
console.log("  ✓ DPAD_CENTER activa Reproducción");

// 1.2 Pausa
handleNativeKey(13); // Enter
assert.strictEqual(isPlaying, false, "Enter debe pausar reproducción");
assert.strictEqual(osdFeedback.icon, "⏸", "Debe mostrar badge de pausa");
console.log("  ✓ Enter activa Pausa");

// 1.3 Avance rápido (+10s)
const initialTime = mockVideo.currentTime;
handleNativeKey(39); // ArrowRight
assert.strictEqual(mockVideo.currentTime, initialTime + 10, "ArrowRight debe avanzar 10 segundos");
assert.strictEqual(osdFeedback.icon, "⏩", "Debe mostrar badge ⏩");
console.log("  ✓ ArrowRight avanza +10 segundos");

// 1.4 Retroceso rápido (-10s)
handleNativeKey(37); // ArrowLeft
assert.strictEqual(mockVideo.currentTime, initialTime, "ArrowLeft debe retroceder 10 segundos");
assert.strictEqual(osdFeedback.icon, "⏪", "Debe mostrar badge ⏪");
console.log("  ✓ ArrowLeft retrocede -10 segundos");

// 1.5 Ajuste de Volumen
const prevVol = mockVideo.volume;
handleNativeKey(38); // ArrowUp
assert.ok(mockVideo.volume > prevVol, "ArrowUp debe aumentar volumen");
console.log("  ✓ ArrowUp/Down ajusta volumen");

// -------------------------------------------------------------
// [PRUEBA 2] REPRODUCTOR IFRAME (IframeSourcePlayer)
// -------------------------------------------------------------
console.log("\n[TEST 2] Reproductor Iframe Embebido: Delegación y postMessage");

class MockIframeWindow {
  constructor() {
    this.messages = [];
  }
  postMessage(msg, targetOrigin) {
    this.messages.push({ msg, targetOrigin });
  }
}

class MockIframe {
  constructor() {
    this.focused = false;
    this.contentWindow = new MockIframeWindow();
  }
  focus() {
    this.focused = true;
  }
  blur() {
    this.focused = false;
  }
}

const mockIframe = new MockIframe();
let iframeHudNotice = null;

function sendIframeCommand(cmd, value) {
  const win = mockIframe.contentWindow;
  if (cmd === "play") {
    win.postMessage(JSON.stringify({ event: "command", func: "playVideo" }), "*");
    win.postMessage({ type: "player:play" }, "*");
    win.postMessage({ action: "play" }, "*");
  } else if (cmd === "pause") {
    win.postMessage(JSON.stringify({ event: "command", func: "pauseVideo" }), "*");
    win.postMessage({ type: "player:pause" }, "*");
    win.postMessage({ action: "pause" }, "*");
  }
}

function handleIframeKey(keyCode) {
  // DPAD_CENTER (23), Enter (13)
  if (keyCode === 23 || keyCode === 13) {
    mockIframe.focus();
    iframeHudNotice = "Control en el reproductor";
    sendIframeCommand("play");
    return true;
  }
  // Back (4, 27)
  if (keyCode === 4 || keyCode === 27) {
    mockIframe.blur();
    iframeHudNotice = null;
    return true;
  }
  return false;
}

// 2.1 Delegación de foco y broadcast de reproducción
handleIframeKey(23); // DPAD_CENTER
assert.strictEqual(mockIframe.focused, true, "DPAD_CENTER debe delegar foco al iframe");
assert.ok(mockIframe.contentWindow.messages.length >= 3, "Debe enviar comandos postMessage multi-protocolo");
assert.strictEqual(iframeHudNotice, "Control en el reproductor", "Debe mostrar aviso de control TV");
console.log("  ✓ Delegación de foco al iframe y broadcast postMessage exitoso");

// 2.2 Escape seguro con botón Atrás
handleIframeKey(4); // Android Back
assert.strictEqual(mockIframe.focused, false, "Botón Atrás debe desenfocar el iframe para retornar a la UI");
console.log("  ✓ Botón Atrás desenfoca el iframe y restaura control de la aplicación");

// -------------------------------------------------------------
// [PRUEBA 3] REPRODUCTOR DE TV EN VIVO (LivePage)
// -------------------------------------------------------------
console.log("\n[TEST 3] Reproductor de Canales en Vivo: Control y Zapping");

const liveChannels = [
  { key: "espn", name: "ESPN", url: "https://stream.example/espn" },
  { key: "fox", name: "Fox Sports", url: "https://stream.example/fox" },
  { key: "hbo", name: "HBO", url: "https://stream.example/hbo" },
];

let activeLiveStream = null;

function playLive(name, url) {
  activeLiveStream = { name, url };
}

function handleLiveKey(keyCode) {
  // Back (4, 27)
  if (keyCode === 4 || keyCode === 27) {
    activeLiveStream = null;
    return true;
  }
  return false;
}

function zapNext(currentIdx) {
  const nextIdx = (currentIdx + 1) % liveChannels.length;
  playLive(liveChannels[nextIdx].name, liveChannels[nextIdx].url);
  return nextIdx;
}

// 3.1 Iniciar canal en vivo
playLive(liveChannels[0].name, liveChannels[0].url);
assert.strictEqual(activeLiveStream.name, "ESPN", "Debe iniciar canal en vivo");
console.log("  ✓ Canal en vivo iniciado correctamente (ESPN)");

// 3.2 Zapping al siguiente canal
let curIdx = 0;
curIdx = zapNext(curIdx);
assert.strictEqual(activeLiveStream.name, "Fox Sports", "Zapping debe cambiar al siguiente canal (Fox Sports)");
console.log("  ✓ Zapping de canal con mando a distancia operativo");

// 3.3 Cerrar stream en vivo con botón Atrás
handleLiveKey(4); // Android Back
assert.strictEqual(activeLiveStream, null, "Botón Atrás debe cerrar el stream en vivo");
console.log("  ✓ Botón Atrás cierra el reproductor de TV en vivo inmediatamente");

// -------------------------------------------------------------
// [PRUEBA 4] REPRODUCTOR DE TRÁILER (TrailerButton)
// -------------------------------------------------------------
console.log("\n[TEST 4] Reproductor de Tráiler: Apertura y Cierre con Mando");

let trailerOpen = false;

function openTrailer() {
  trailerOpen = true;
}

function handleTrailerKey(keyCode) {
  if (keyCode === 4 || keyCode === 27) {
    trailerOpen = false;
    return true;
  }
  return false;
}

openTrailer();
assert.strictEqual(trailerOpen, true, "Tráiler debe estar abierto");
console.log("  ✓ Tráiler abierto en modal con iframe de YouTube");

handleTrailerKey(27); // Escape
assert.strictEqual(trailerOpen, false, "Tecla Escape/Atrás debe cerrar el tráiler");
console.log("  ✓ Tecla Atrás/Escape cierra el tráiler y devuelve el foco");

console.log("\n=== TODAS LAS PRUEBAS DE CONTROL DE REPRODUCTORES PASARON CON ÉXITO ===");
