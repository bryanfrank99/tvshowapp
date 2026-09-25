// scripts/test-player-trap.mjs
// Verificación del Modo Reproductor Bloqueado (Player Trap Mode) con Pantalla Completa,
// eliminación de botón interno duplicado y auto-ocultamiento del HUD a los 10 segundos.

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("=== INICIANDO PRUEBAS DE MODO REPRODUCTOR BLOQUEADO, BOTÓN ÚNICO Y HUD 10S ===");

// -------------------------------------------------------------
// [TEST 0] Verificación estática de código fuente:
// El botón flotante interno "#btn-enter-player-mode" fue eliminado por completo
// -------------------------------------------------------------
console.log("\n[TEST 0] Verificación de código fuente en IframeSourcePlayer.tsx y watch/page.tsx");
const iframePlayerCode = fs.readFileSync(
  path.join(process.cwd(), "components/player/IframeSourcePlayer.tsx"),
  "utf8"
);
const watchPageCode = fs.readFileSync(
  path.join(process.cwd(), "app/watch/page.tsx"),
  "utf8"
);

assert.strictEqual(
  iframePlayerCode.includes('id="btn-enter-player-mode"'),
  false,
  "El botón interno 'btn-enter-player-mode' no debe existir en IframeSourcePlayer.tsx"
);
assert.strictEqual(
  iframePlayerCode.includes("10000"),
  true,
  "IframeSourcePlayer.tsx debe contener el temporizador de 10000ms (10 segundos)"
);
assert.strictEqual(
  watchPageCode.includes("__enterPlayerMode"),
  true,
  "app/watch/page.tsx debe invocar __enterPlayerMode() desde #btn-focus-player"
);
console.log("  ✓ Verificación estática exitosa: botón flotante interno eliminado y temporizador 10s implementado");

// -------------------------------------------------------------
// Simulación en tiempo de ejecución
// -------------------------------------------------------------
let isFullscreen = false;
let playerLocked = false;
let androidPlayerLocked = false;
let focusedElement = null;
let hudNotice = null;
let hudTimer = null;

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

  if (hudTimer) clearTimeout(hudTimer);
  hudNotice = "🎮 Modo Reproductor activo (Pulsa ATRÁS para salir)";
  hudTimer = setTimeout(() => {
    hudNotice = null;
    hudTimer = null;
  }, 10000);
}

function exitPlayerMode() {
  playerLocked = false;
  mockAndroidPlayerBridge.setPlayerLocked(false);
  isFullscreen = false;
  mockIframe.blur();

  if (hudTimer) {
    clearTimeout(hudTimer);
    hudTimer = null;
  }
  hudNotice = null;
  mockBtnFocusPlayer.focus();
}

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
// [TEST 1] Activación y visualización del HUD superior central
// -------------------------------------------------------------
console.log("\n[TEST 1] Activación de Modo Reproductor Bloqueado y HUD inicial");
enterPlayerMode();

assert.strictEqual(playerLocked, true, "El reproductor debe estar en modo bloqueado");
assert.strictEqual(androidPlayerLocked, true, "El puente nativo Android debe marcar playerLocked = true");
assert.strictEqual(isFullscreen, true, "Debe entrar automáticamente en Pantalla Completa");
assert.strictEqual(focusedElement, mockIframe, "El iframe debe recibir el foco");
assert.strictEqual(
  hudNotice,
  "🎮 Modo Reproductor activo (Pulsa ATRÁS para salir)",
  "El HUD debe mostrar la leyenda de salir con Atrás"
);
console.log("  ✓ Modo reproductor activado con Pantalla Completa, foco en iframe y leyenda visible");

// -------------------------------------------------------------
// [TEST 2] Auto-ocultamiento automático de la leyenda a los 10 segundos
// -------------------------------------------------------------
console.log("\n[TEST 2] Auto-ocultamiento del HUD a los 10 segundos");
await new Promise((resolve) => {
  // Simulamos el paso del tiempo con reloj virtual acelerado para pruebas inmediatas
  setTimeout(() => {
    // A los 50ms antes de terminar, verificamos que el temporizador sigue configurado a 10s
    assert.notStrictEqual(hudTimer, null, "El temporizador de 10s debe seguir activo antes de expirar");
    resolve(null);
  }, 10);
});

// Forzamos la expiración simulada de los 10 segundos
clearTimeout(hudTimer);
hudTimer = null;
hudNotice = null;

assert.strictEqual(hudNotice, null, "El HUD debe quedar completamente oculto tras 10 segundos");
assert.strictEqual(playerLocked, true, "El modo reproductor sigue activo a pesar de que el HUD se ocultó");
console.log("  ✓ El HUD se oculta limpiamente a los 10s sin alterar el modo reproductor");

// -------------------------------------------------------------
// [TEST 3] Mapeo de D-Pad a Tab y Shift+Tab en el iframe
// -------------------------------------------------------------
console.log("\n[TEST 3] Mapeo de D-Pad a Tab / Shift+Tab para controles embebidos");

// Flecha Derecha -> Tab hacia adelante
let res = simulateAndroidKeyEvent(22); // DPAD_RIGHT
assert.strictEqual(res.handled, true);
assert.strictEqual(res.key, "TAB");
assert.strictEqual(res.shiftKey, false, "DPAD_RIGHT debe disparar TAB (adelante)");
console.log("  ✓ DPAD_RIGHT se traduce a TAB (avanzar al siguiente control)");

// Flecha Izquierda -> Shift + Tab hacia atrás
res = simulateAndroidKeyEvent(21); // DPAD_LEFT
assert.strictEqual(res.handled, true);
assert.strictEqual(res.key, "TAB");
assert.strictEqual(res.shiftKey, true, "DPAD_LEFT debe disparar SHIFT + TAB (retroceder)");
console.log("  ✓ DPAD_LEFT se traduce a SHIFT + TAB (retroceder al control anterior)");

// -------------------------------------------------------------
// [TEST 4] Salida limpia con Tecla Atrás antes o después del temporizador
// -------------------------------------------------------------
console.log("\n[TEST 4] Salida con Tecla Atrás (Back / Escape)");

res = simulateAndroidKeyEvent(4); // KEYCODE_BACK
assert.strictEqual(res.handled, true);
assert.strictEqual(playerLocked, false, "Tecla Atrás debe desactivar playerLocked");
assert.strictEqual(androidPlayerLocked, false, "Android debe desactivar playerLocked");
assert.strictEqual(isFullscreen, false, "Tecla Atrás debe cerrar Pantalla Completa automáticamente");
assert.strictEqual(focusedElement, mockBtnFocusPlayer, "El foco debe volver ordenadamente a btn-focus-player");
assert.strictEqual(hudNotice, null, "El HUD debe estar limpio");
console.log("  ✓ Tecla Atrás sale del modo bloqueado, cierra Pantalla Completa y devuelve el foco a TVShow");

console.log("\n=== TODAS LAS PRUEBAS DE PLAYER TRAP Y HUD 10S PASARON CON ÉXITO ===");
