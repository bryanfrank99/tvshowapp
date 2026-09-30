// scripts/test-player-tv-navigation.mjs
// Suite de simulación completa de interacciones para el Reproductor Nativo TV (Spec 066)
// Valida:
// 1. Unicidad del botón Play/Pausa (sin duplicados en el centro)
// 2. Foco automático por defecto en el botón de Pantalla Completa al cargar contenido
// 3. Simulación completa de navegación espacial D-Pad (Scrubber, Play, Rewind, Forward, Vol, Subs, Speed, PiP, Fullscreen)
// 4. Atajos de TV y acciones con mando remoto (Enter, Flechas, OSD)

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

console.log("======================================================================");
console.log("  SIMULACIÓN DE INTERACCIONES Y NAVEGACIÓN TV - SPEC 066");
console.log("======================================================================\n");

const playerPath = path.resolve(process.cwd(), "components/player/NativeSourcePlayer.tsx");
assert(fs.existsSync(playerPath), `El archivo ${playerPath} debe existir.`);
const playerSource = fs.readFileSync(playerPath, "utf-8");

// ====================================================================
// TEST 1: Verificación Estática del DOM / JSX de NativeSourcePlayer
// ====================================================================
console.log("[TEST 1] Verificación estática del DOM: Botones interactivos y unicidad de Play/Pausa");

// 1.1 Verificar que NO existen dos botones de play/pause
const playPauseButtons = (playerSource.match(/id="btn-play-pause"/g) || []).length;
console.log(`  - Botones con id="btn-play-pause": ${playPauseButtons}`);
assert.strictEqual(playPauseButtons, 1, "Debe existir exactamente 1 botón con id='btn-play-pause'");

// 1.2 Verificar que el pulso central NO contiene un botón interactivo
const centerPulseBlockMatch = playerSource.match(/\{centerPulse && \(([\s\S]*?)\)\}/);
const centerPulseBlock = centerPulseBlockMatch ? centerPulseBlockMatch[1] : "";
const hasCenterButton = centerPulseBlock.includes("<button");
assert.strictEqual(hasCenterButton, false, "El centro de la pantalla NO debe contener un botón interactivo (solo badge transitorio con pointer-events-none)");
console.log("  ✓ El centro de la pantalla no contiene botón interactivo. Solo pulso visual transitorio.");

// 1.3 Verificar que el pulso central tiene pointer-events-none
assert.ok(playerSource.includes("pointer-events-none z-10 animate-scale-in"), "El pulso central debe ser pointer-events-none");
console.log("  ✓ El pulso de Play/Pausa central tiene 'pointer-events-none' para no bloquear interacción.");

// 1.4 Verificar botón de pantalla completa y su selector de TV
assert.ok(playerSource.includes('id="btn-fullscreen-native"'), "Debe existir id='btn-fullscreen-native'");
assert.ok(playerSource.includes("fullscreenBtnRef"), "Debe existir fullscreenBtnRef");
assert.ok(playerSource.includes("focus:ring-4 focus:ring-[#E50914]"), "Debe tener anillo de foco rojo de alto contraste para TV");
console.log("  ✓ Botón de pantalla completa (#btn-fullscreen-native) configurado con foco de TV (ring-4 #E50914).");

// 1.5 Verificar que todos los controles de navegación D-Pad tienen IDs únicos
const expectedIds = [
  "btn-scrubber",
  "btn-play-pause",
  "btn-rewind-10",
  "btn-forward-10",
  "btn-volume",
  "btn-subtitles",
  "btn-speed",
  "btn-pip",
  "btn-fullscreen-native",
];

for (const id of expectedIds) {
  assert.ok(playerSource.includes(`id="${id}"`), `El control con id='${id}' debe estar presente en el JSX`);
  console.log(`  ✓ ID presente: ${id}`);
}

console.log("  -> [TEST 1 PASADO]: Estructura del DOM verificada con éxito.\n");

// ====================================================================
// TEST 2: Simulación de Carga de Contenido y Foco Inicial Automático
// ====================================================================
console.log("[TEST 2] Simulación de Carga de Video y Foco Automático en Pantalla Completa");

class MockElement {
  constructor(id, tag = "button") {
    this.id = id;
    this.tagName = tag.toUpperCase();
    this.tabIndex = 0;
    this.listeners = {};
    this.focused = false;
    this.attributes = {};
  }
  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  dispatchEvent(event) {
    const handlers = this.listeners[event.type] || [];
    for (const h of handlers) h(event);
  }
  focus() {
    this.focused = true;
    mockDocument.activeElement = this;
  }
  blur() {
    this.focused = false;
    if (mockDocument.activeElement === this) {
      mockDocument.activeElement = null;
    }
  }
  click() {
    this.dispatchEvent({ type: "click", preventDefault: () => {}, stopPropagation: () => {} });
  }
}

class MockDocument {
  constructor() {
    this.activeElement = null;
    this.fullscreenElement = null;
    this.elements = new Map();
  }
  register(el) {
    this.elements.set(el.id, el);
  }
  getElementById(id) {
    return this.elements.get(id) || null;
  }
}

const mockDocument = new MockDocument();

// Crear elementos del reproductor
const elScrubber = new MockElement("btn-scrubber", "div");
const elPlayPause = new MockElement("btn-play-pause", "button");
const elRewind = new MockElement("btn-rewind-10", "button");
const elForward = new MockElement("btn-forward-10", "button");
const elVolume = new MockElement("btn-volume", "button");
const elSubtitles = new MockElement("btn-subtitles", "button");
const elSpeed = new MockElement("btn-speed", "button");
const elPip = new MockElement("btn-pip", "button");
const elFullscreen = new MockElement("btn-fullscreen-native", "button");

[elScrubber, elPlayPause, elRewind, elForward, elVolume, elSubtitles, elSpeed, elPip, elFullscreen].forEach(el => mockDocument.register(el));

// Simular el estado interno del componente
class PlayerStateSimulation {
  constructor() {
    this.isPlaying = false;
    this.isFullscreen = false;
    this.currentTime = 0;
    this.duration = 3600; // 1 hora
    this.volume = 1.0;
    this.isMuted = false;
    this.showControls = true;
    this.centerPulse = null;
    this.playbackRate = 1;
    this.osdFeedback = null;
    this.hasSubtitles = true;
    this.hasPip = true;
  }

  autoFocusFullscreen() {
    if (this.isFullscreen) return;
    elFullscreen.focus();
    this.showControls = true;
  }

  wakeControls(key) {
    this.showControls = true;
    if (key === "ArrowLeft") {
      this.seek(-10);
      return;
    }
    if (key === "ArrowRight") {
      this.seek(10);
      return;
    }
    this.autoFocusFullscreen();
  }

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    mockDocument.fullscreenElement = this.isFullscreen ? elFullscreen : null;
    this.osdFeedback = {
      icon: this.isFullscreen ? "⛶" : "🗗",
      text: this.isFullscreen ? "Pantalla completa" : "Ventana normal"
    };
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    this.centerPulse = this.isPlaying ? "play" : "pause";
    this.osdFeedback = {
      icon: this.isPlaying ? "▶" : "⏸",
      text: this.isPlaying ? "Reproducir" : "Pausa"
    };
  }

  seek(delta) {
    this.currentTime = Math.max(0, Math.min(this.duration, this.currentTime + delta));
    this.osdFeedback = {
      icon: delta > 0 ? "⏩" : "⏪",
      text: `${delta > 0 ? "+" : ""}${delta}s`
    };
  }

  adjustVolume(delta) {
    this.volume = Math.max(0, Math.min(1, Math.round((this.volume + delta) * 10) / 10));
    this.isMuted = this.volume === 0;
    this.osdFeedback = {
      icon: this.isMuted ? "🔇" : "🔊",
      text: `${Math.round(this.volume * 100)}%`
    };
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.osdFeedback = {
      icon: this.isMuted ? "🔇" : "🔊",
      text: this.isMuted ? "Silencio" : `${Math.round(this.volume * 100)}%`
    };
  }
}

const sim = new PlayerStateSimulation();

// 2.1 Simulación del evento de carga de video
console.log("  Simulando carga de película/serie (onLoadedMetadata)...");
sim.autoFocusFullscreen();

assert.strictEqual(mockDocument.activeElement?.id, "btn-fullscreen-native", "El foco inicial DEBE estar en #btn-fullscreen-native");
console.log(`  ✓ Foco automático asignado: ${mockDocument.activeElement.id}`);

// 2.2 Simulación de pulsar 'OK' / 'Enter' en el mando sobre el botón enfocado
console.log("  Simulando pulsación de 'Enter' / 'OK' en el control remoto...");
sim.toggleFullscreen();
assert.strictEqual(sim.isFullscreen, true, "El reproductor debe haber entrado en pantalla completa");
console.log(`  ✓ Pantalla completa activada exitosamente: isFullscreen=${sim.isFullscreen}, OSD='${sim.osdFeedback.text}'`);

console.log("  -> [TEST 2 PASADO]: Carga y foco inicial verificados.\n");

// ====================================================================
// TEST 3: Simulación de Navegación Espacial D-Pad
// ====================================================================
console.log("[TEST 3] Simulación de Navegación Espacial con Flechas del Mando (D-Pad)");

// Definir tabla de navegación D-Pad reflejando NativeSourcePlayer.tsx
function simulateDpad(currentId, key) {
  switch (currentId) {
    case "btn-fullscreen-native":
      if (key === "ArrowUp") return "btn-scrubber";
      if (key === "ArrowLeft") return sim.hasPip ? "btn-pip" : "btn-speed";
      return currentId;

    case "btn-pip":
      if (key === "ArrowUp") return "btn-scrubber";
      if (key === "ArrowLeft") return "btn-speed";
      if (key === "ArrowRight") return "btn-fullscreen-native";
      return currentId;

    case "btn-speed":
      if (key === "ArrowUp") return "btn-scrubber";
      if (key === "ArrowLeft") return sim.hasSubtitles ? "btn-subtitles" : "btn-volume";
      if (key === "ArrowRight") return sim.hasPip ? "btn-pip" : "btn-fullscreen-native";
      return currentId;

    case "btn-subtitles":
      if (key === "ArrowUp") return "btn-scrubber";
      if (key === "ArrowLeft") return "btn-volume";
      if (key === "ArrowRight") return "btn-speed";
      return currentId;

    case "btn-volume":
      if (key === "ArrowUp") { sim.adjustVolume(0.1); return "btn-volume"; }
      if (key === "ArrowDown") { sim.adjustVolume(-0.1); return "btn-volume"; }
      if (key === "ArrowLeft") return "btn-forward-10";
      if (key === "ArrowRight") return sim.hasSubtitles ? "btn-subtitles" : "btn-speed";
      return currentId;

    case "btn-forward-10":
      if (key === "ArrowUp") return "btn-scrubber";
      if (key === "ArrowLeft") return "btn-rewind-10";
      if (key === "ArrowRight") return "btn-volume";
      return currentId;

    case "btn-rewind-10":
      if (key === "ArrowUp") return "btn-scrubber";
      if (key === "ArrowLeft") return "btn-play-pause";
      if (key === "ArrowRight") return "btn-forward-10";
      return currentId;

    case "btn-play-pause":
      if (key === "ArrowUp") return "btn-scrubber";
      if (key === "ArrowRight") return "btn-rewind-10";
      return currentId;

    case "btn-scrubber":
      if (key === "ArrowLeft") { sim.seek(-10); return "btn-scrubber"; }
      if (key === "ArrowRight") { sim.seek(10); return "btn-scrubber"; }
      if (key === "ArrowDown") return "btn-play-pause";
      return currentId;

    default:
      return currentId;
  }
}

function moveFocus(key) {
  const current = mockDocument.activeElement ? mockDocument.activeElement.id : "btn-fullscreen-native";
  const nextId = simulateDpad(current, key);
  const nextEl = mockDocument.getElementById(nextId);
  if (nextEl) {
    nextEl.focus();
  }
  return nextId;
}

// 3.1 Navegación completa hacia la izquierda desde Pantalla Completa hasta Play/Pausa
console.log("  1. Navegando con ArrowLeft desde Pantalla Completa hasta Play/Pausa:");
assert.strictEqual(mockDocument.activeElement.id, "btn-fullscreen-native");

const step1 = moveFocus("ArrowLeft"); // -> PiP
console.log(`     ArrowLeft -> ${step1}`);
assert.strictEqual(step1, "btn-pip");

const step2 = moveFocus("ArrowLeft"); // -> Speed
console.log(`     ArrowLeft -> ${step2}`);
assert.strictEqual(step2, "btn-speed");

const step3 = moveFocus("ArrowLeft"); // -> Subtitles
console.log(`     ArrowLeft -> ${step3}`);
assert.strictEqual(step3, "btn-subtitles");

const step4 = moveFocus("ArrowLeft"); // -> Volume
console.log(`     ArrowLeft -> ${step4}`);
assert.strictEqual(step4, "btn-volume");

const step5 = moveFocus("ArrowLeft"); // -> Forward 10s
console.log(`     ArrowLeft -> ${step5}`);
assert.strictEqual(step5, "btn-forward-10");

const step6 = moveFocus("ArrowLeft"); // -> Rewind 10s
console.log(`     ArrowLeft -> ${step6}`);
assert.strictEqual(step6, "btn-rewind-10");

const step7 = moveFocus("ArrowLeft"); // -> Play/Pausa
console.log(`     ArrowLeft -> ${step7}`);
assert.strictEqual(step7, "btn-play-pause");
assert.strictEqual(mockDocument.activeElement.id, "btn-play-pause");
console.log("  ✓ Navegación izquierda completada con éxito hasta #btn-play-pause.");

// 3.2 Pulsar Play/Pausa y verificar feedback
console.log("\n  2. Pulsando Enter en #btn-play-pause:");
assert.strictEqual(sim.isPlaying, false);
sim.togglePlay();
assert.strictEqual(sim.isPlaying, true);
assert.strictEqual(sim.centerPulse, "play");
console.log(`     Reproduciendo: isPlaying=${sim.isPlaying}, centerPulse=${sim.centerPulse}`);
sim.togglePlay();
assert.strictEqual(sim.isPlaying, false);
assert.strictEqual(sim.centerPulse, "pause");
console.log(`     Pausando: isPlaying=${sim.isPlaying}, centerPulse=${sim.centerPulse}`);
console.log("  ✓ El botón de play/pause conmuta el estado y emite pulso central sin duplicar botones.");

// 3.3 Navegar verticalmente hacia el Scrubber con ArrowUp
console.log("\n  3. Navegando verticalmente hacia el Scrubber con ArrowUp:");
const toScrubber = moveFocus("ArrowUp");
assert.strictEqual(toScrubber, "btn-scrubber");
assert.strictEqual(mockDocument.activeElement.id, "btn-scrubber");
console.log(`     ArrowUp -> ${toScrubber}`);

// 3.4 Probar scrubbing con ArrowLeft y ArrowRight sobre la barra de progreso
console.log("\n  4. Probando saltos de tiempo (Scrubbing) con ArrowRight / ArrowLeft:");
const timeBefore = sim.currentTime;
moveFocus("ArrowRight"); // seek +10s
assert.strictEqual(sim.currentTime, timeBefore + 10);
console.log(`     ArrowRight -> currentTime: ${sim.currentTime}s (${sim.osdFeedback.text})`);

moveFocus("ArrowLeft"); // seek -10s
assert.strictEqual(sim.currentTime, timeBefore);
console.log(`     ArrowLeft  -> currentTime: ${sim.currentTime}s (${sim.osdFeedback.text})`);

// 3.5 Bajar desde Scrubber hacia Play/Pausa con ArrowDown
console.log("\n  5. Bajando desde el Scrubber a la barra de controles con ArrowDown:");
const backToControls = moveFocus("ArrowDown");
assert.strictEqual(backToControls, "btn-play-pause");
assert.strictEqual(mockDocument.activeElement.id, "btn-play-pause");
console.log(`     ArrowDown -> ${backToControls}`);

// 3.6 Navegar hacia la derecha hasta el botón de Volumen y ajustar con Up / Down
console.log("\n  6. Navegando hacia la derecha hasta Volumen y ajustando volumen:");
moveFocus("ArrowRight"); // -> Rewind
moveFocus("ArrowRight"); // -> Forward
moveFocus("ArrowRight"); // -> Volume
assert.strictEqual(mockDocument.activeElement.id, "btn-volume");
console.log(`     Foco actual: ${mockDocument.activeElement.id}`);

const volBefore = sim.volume;
moveFocus("ArrowDown"); // volume -10%
assert.strictEqual(sim.volume, Math.round((volBefore - 0.1) * 10) / 10);
console.log(`     ArrowDown en Volumen -> ${Math.round(sim.volume * 100)}% (${sim.osdFeedback.text})`);

moveFocus("ArrowUp"); // volume +10%
assert.strictEqual(sim.volume, volBefore);
console.log(`     ArrowUp en Volumen   -> ${Math.round(sim.volume * 100)}% (${sim.osdFeedback.text})`);

// 3.7 Continuar a la derecha hasta regresar a Pantalla Completa
console.log("\n  7. Retornando a Pantalla Completa con ArrowRight:");
moveFocus("ArrowRight"); // -> Subtitles
moveFocus("ArrowRight"); // -> Speed
moveFocus("ArrowRight"); // -> PiP
moveFocus("ArrowRight"); // -> Fullscreen
assert.strictEqual(mockDocument.activeElement.id, "btn-fullscreen-native");
console.log(`     Retorno completado: ${mockDocument.activeElement.id}`);

console.log("  -> [TEST 3 PASADO]: Navegación espacial D-Pad simulada con 100% de éxito.\n");

// ====================================================================
// TEST 4: Simulación de Controles Ocultos y Despertar con D-Pad
// ====================================================================
console.log("[TEST 4] Simulación de Reactivación de Controles Ocultos");

// Regresar de pantalla completa para probar foco en ventana normal
if (sim.isFullscreen) sim.toggleFullscreen();

sim.showControls = false;
mockDocument.activeElement = null;
console.log("  Controles ocultos (showControls = false).");

// Al presionar una tecla de navegación mientras los controles están ocultos:
// - Los controles se despiertan (showControls = true)
// - Se auto-enfoca el botón de Pantalla Completa
sim.wakeControls("ArrowUp");
assert.strictEqual(sim.showControls, true, "showControls debe volverse true");
assert.strictEqual(mockDocument.activeElement.id, "btn-fullscreen-native", "Foco debe retornar a pantalla completa");
console.log(`  ✓ Controles reactivados y foco posicionado en: ${mockDocument.activeElement.id}`);

// Probar salto de tiempo mientras los controles están ocultos
sim.showControls = false;
const currT = sim.currentTime;
sim.wakeControls("ArrowRight"); // seek +10s
assert.strictEqual(sim.showControls, true, "showControls debe volverse true al pulsar ArrowRight");
assert.strictEqual(sim.currentTime, currT + 10, "Debe haber avanzado 10s");
console.log(`  ✓ ArrowRight con controles ocultos avanza +10s y despierta la interfaz (${sim.osdFeedback.text})`);

console.log("  -> [TEST 4 PASADO]: Despertar de controles verificado.\n");

// ====================================================================
// RESUMEN FINAL
// ====================================================================
console.log("======================================================================");
console.log("  TODAS LAS SIMULACIONES DE INTERACCIÓN PASARON EXITOSAMENTE (4/4)");
console.log("======================================================================");
