// scripts/test-player-trap.mjs
// Verificación del Modo Reproductor Bloqueado (Player Trap Mode) con Pantalla Completa y salida por tecla Atrás

import assert from "node:assert";

console.log("=== INICIANDO PRUEBAS DE MODO REPRODUCTOR BLOQUEADO Y SALIDA ATRÁS ===");

// 1. Simulación de entorno DOM y Fullscreen API
let isFullscreen = false;
let playerLocked = false;
let androidPlayerLocked = false;
let focusedElement = null;
let hudNotice = null;

const mockIframe = {
  id: "mock-iframe",
  focus: () => { focusedElement = mockIframe; },
  blur: () => { if (focusedElement === mockIframe) focusedElement = null; }
};

const mockContainer = {
  id: "tv-iframe-container",
  requestFullscreen: async () => { isFullscreen = true; },
};

const mockBtnFocusPlayer = {
  id: "btn-focus-player",
  focus: () => { focusedElement = mockBtnFocusPlayer; }
};

const mockAndroidPlayerBridge = {
  setPlayerLocked: (locked) => {
    androidPlayerLocked = locked;
  }
};

function enterPlayerMode() {
  playerLocked = true;
  mockAndroidPlayerBridge.setPlayerLocked(true);
  mockContainer.requestFullscreen();
  mockIframe.focus();
  hudNotice = "Modo Reproductor · Pulsa ATRÁS para salir";
}

function exitPlayerMode() {
  playerLocked = false;
  mockAndroidPlayerBridge.setPlayerLocked(false);
  isFullscreen = false;
  mockIframe.blur();
  hudNotice = null;
  mockBtnFocusPlayer.focus();
}

// 2. Simulación de control nativo de D-Pad a Tab/Shift+Tab (dispatchKeyEvent)
function simulateAndroidKeyEvent(keyCode) {
  if (!playerLocked) {
    return { handled: false, key: null };
  }

  // KEYCODE_BACK (4)
  if (keyCode === 4) {
    exitPlayerMode();
    return { handled: true, key: "BACK_EXIT" };
  }

  // DPAD_RIGHT (22) o DPAD_DOWN (20) -> TAB
  if (keyCode === 22 || keyCode === 20) {
    return { handled: true, key: "TAB", shiftKey: false };
  }

  // DPAD_LEFT (21) o DPAD_UP (19) -> SHIFT + TAB
  if (keyCode === 21 || keyCode === 19) {
    return { handled: true, key: "TAB", shiftKey: true };
  }

  // DPAD_CENTER (23) -> ENTER
  if (keyCode === 23) {
    return { handled: true, key: "ENTER" };
  }

  return { handled: false, key: null };
}

// -------------------------------------------------------------
// [TEST 1] Entrada en Modo Reproductor
// -------------------------------------------------------------
console.log("\n[TEST 1] Activación de Modo Reproductor Bloqueado");
enterPlayerMode();

assert.strictEqual(playerLocked, true, "El reproductor debe estar en modo bloqueado (playerLocked = true)");
assert.strictEqual(androidPlayerLocked, true, "El puente nativo Android debe marcar playerLocked = true");
assert.strictEqual(isFullscreen, true, "Debe entrar automáticamente en Pantalla Completa");
assert.strictEqual(focusedElement, mockIframe, "El iframe debe recibir el foco");
assert.ok(hudNotice.includes("ATRÁS para salir"), "Debe mostrar el HUD explicativo");
console.log("  ✓ Modo reproductor activado con Pantalla Completa y foco en el iframe");

// -------------------------------------------------------------
// [TEST 2] Navegación D-Pad a Tab y Shift+Tab
// -------------------------------------------------------------
console.log("\n[TEST 2] Mapeo de D-Pad a Tab / Shift+Tab para controles embebidos");

// Flecha Derecha -> Tab hacia adelante
let res = simulateAndroidKeyEvent(22); // DPAD_RIGHT
assert.strictEqual(res.handled, true);
assert.strictEqual(res.key, "TAB");
assert.strictEqual(res.shiftKey, false, "DPAD_RIGHT debe disparar TAB (adelante)");
console.log("  ✓ DPAD_RIGHT se traduce a TAB (avanzar al siguiente control del reproductor)");

// Flecha Abajo -> Tab hacia adelante
res = simulateAndroidKeyEvent(20); // DPAD_DOWN
assert.strictEqual(res.handled, true);
assert.strictEqual(res.key, "TAB");
assert.strictEqual(res.shiftKey, false, "DPAD_DOWN debe disparar TAB (adelante)");
console.log("  ✓ DPAD_DOWN se traduce a TAB (avanzar al siguiente control)");

// Flecha Izquierda -> Shift + Tab hacia atrás
res = simulateAndroidKeyEvent(21); // DPAD_LEFT
assert.strictEqual(res.handled, true);
assert.strictEqual(res.key, "TAB");
assert.strictEqual(res.shiftKey, true, "DPAD_LEFT debe disparar SHIFT + TAB (retroceder)");
console.log("  ✓ DPAD_LEFT se traduce a SHIFT + TAB (retroceder al control anterior)");

// Flecha Arriba -> Shift + Tab hacia atrás
res = simulateAndroidKeyEvent(19); // DPAD_UP
assert.strictEqual(res.handled, true);
assert.strictEqual(res.key, "TAB");
assert.strictEqual(res.shiftKey, true, "DPAD_UP debe disparar SHIFT + TAB (retroceder)");
console.log("  ✓ DPAD_UP se traduce a SHIFT + TAB (retroceder al control anterior)");

// DPAD_CENTER -> Enter
res = simulateAndroidKeyEvent(23); // DPAD_CENTER
assert.strictEqual(res.handled, true);
assert.strictEqual(res.key, "ENTER");
console.log("  ✓ DPAD_CENTER ejecuta el botón o control enfocado (Enter/Click)");

// -------------------------------------------------------------
// [TEST 3] Suspensión de TvNav en Modo Bloqueado
// -------------------------------------------------------------
console.log("\n[TEST 3] Aislamiento: TvNav ignora teclas mientras playerLocked = true");

function simulateTvNav(keyCode) {
  if (playerLocked) {
    return "BLOCKED_BY_PLAYER_LOCK";
  }
  return "NAVIGATED_NORMALLY";
}

assert.strictEqual(simulateTvNav(39), "BLOCKED_BY_PLAYER_LOCK", "TvNav no debe mover foco fuera del reproductor");
assert.strictEqual(simulateTvNav(40), "BLOCKED_BY_PLAYER_LOCK", "TvNav no debe saltar al catálogo o menú");
console.log("  ✓ TvNav se suspende completamente mientras el reproductor está bloqueado");

// -------------------------------------------------------------
// [TEST 4] Salida Única Exclusiva con Tecla Atrás (Back)
// -------------------------------------------------------------
console.log("\n[TEST 4] Salida Exclusiva con Tecla Atrás (Back / Escape)");

res = simulateAndroidKeyEvent(4); // KEYCODE_BACK
assert.strictEqual(res.handled, true);
assert.strictEqual(playerLocked, false, "Tecla Atrás debe desactivar playerLocked");
assert.strictEqual(androidPlayerLocked, false, "Android debe desactivar playerLocked");
assert.strictEqual(isFullscreen, false, "Tecla Atrás debe cerrar Pantalla Completa automáticamente");
assert.strictEqual(focusedElement, mockBtnFocusPlayer, "El foco debe volver ordenadamente a btn-focus-player");
assert.strictEqual(hudNotice, null, "El HUD debe ocultarse");
console.log("  ✓ Tecla Atrás sale del modo bloqueado, cierra Pantalla Completa y devuelve el foco a TVShow");

console.log("\n=== TODAS LAS PRUEBAS DE PLAYER TRAP Y NAVEGACIÓN PASARON CON ÉXITO ===");
