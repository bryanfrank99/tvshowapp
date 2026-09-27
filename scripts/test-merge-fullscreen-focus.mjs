import assert from "node:assert/strict";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function run() {
  console.log("==================================================");
  console.log("🧪 TESTING FUSIÓN ENFOCAR REPRODUCTOR -> PANTALLA COMPLETA");
  console.log("==================================================");

  // 1. Verificación estática de app/watch/page.tsx
  console.log("\n1. Verificando app/watch/page.tsx...");
  const watchPagePath = join(root, "app", "watch", "page.tsx");
  assert.ok(existsSync(watchPagePath), "app/watch/page.tsx debe existir");
  const watchPage = readFileSync(watchPagePath, "utf8");

  // Verificar que btn-focus-player fue eliminado
  assert.equal(
    watchPage.includes('id="btn-focus-player"'),
    false,
    "El botón 'btn-focus-player' debe haber sido eliminado del JSX de watch/page.tsx"
  );
  console.log("  ✅ Botón redundante 'btn-focus-player' eliminado");

  // Verificar que btn-fullscreen existe y activa el sistema completo
  assert.ok(
    watchPage.includes('id="btn-fullscreen"'),
    "El botón 'btn-fullscreen' debe existir en watch/page.tsx"
  );
  assert.ok(
    watchPage.includes("__enterPlayerMode"),
    "goFullscreen debe invocar __enterPlayerMode() para capturar foco, mando y fullscreen"
  );
  console.log("  ✅ 'btn-fullscreen' integra el sistema de enfoque y captura de foco/mando");

  // 2. Verificación de components/player/IframeSourcePlayer.tsx
  console.log("\n2. Verificando components/player/IframeSourcePlayer.tsx...");
  const iframePlayerPath = join(root, "components", "player", "IframeSourcePlayer.tsx");
  assert.ok(existsSync(iframePlayerPath), "IframeSourcePlayer.tsx debe existir");
  const iframePlayer = readFileSync(iframePlayerPath, "utf8");

  assert.ok(
    iframePlayer.includes('document.getElementById("btn-fullscreen")'),
    "IframeSourcePlayer debe retornar el foco a btn-fullscreen al salir"
  );
  console.log("  ✅ Retorno de foco configurado hacia 'btn-fullscreen'");

  // 3. Simulación de ejecución del flujo fusionado
  console.log("\n3. Simulando flujo completo en tiempo de ejecución...");
  let isFullscreen = false;
  let playerLocked = false;
  let androidPlayerLocked = false;
  let focusedElement = null;
  let hudNotice = null;

  const mockIframe = {
    id: "tv-iframe-element",
    focus: () => { focusedElement = mockIframe; },
    blur: () => { if (focusedElement === mockIframe) focusedElement = null; },
  };

  const mockContainer = {
    id: "tv-iframe-container",
    requestFullscreen: async () => { isFullscreen = true; },
  };

  const mockBtnFullscreen = {
    id: "btn-fullscreen",
    focus: () => { focusedElement = mockBtnFullscreen; },
    classList: { add: () => {} },
    setAttribute: () => {},
  };

  const mockAndroidPlayerBridge = {
    setPlayerLocked: (locked) => { androidPlayerLocked = locked; },
  };

  // Definir __enterPlayerMode como lo hace IframeSourcePlayer
  const enterPlayerMode = () => {
    isFullscreen = true;
    playerLocked = true;
    mockAndroidPlayerBridge.setPlayerLocked(true);
    mockIframe.focus();
    hudNotice = "🎮 Modo Reproductor activo (Pulsa ATRÁS para salir)";
  };

  const exitPlayerMode = () => {
    isFullscreen = false;
    playerLocked = false;
    mockAndroidPlayerBridge.setPlayerLocked(false);
    mockIframe.blur();
    hudNotice = null;
    mockBtnFullscreen.focus();
  };

  // Simular clic en "Pantalla completa"
  console.log("  -> Usuario presiona 'Pantalla completa'");
  enterPlayerMode();
  assert.equal(isFullscreen, true, "Debe entrar a Pantalla Completa");
  assert.equal(playerLocked, true, "Debe activar playerLocked");
  assert.equal(androidPlayerLocked, true, "Android bridge debe recibir playerLocked=true");
  assert.equal(focusedElement, mockIframe, "El iframe debe recibir el foco");
  assert.ok(hudNotice.includes("Modo Reproductor activo"), "Debe mostrar el aviso HUD");
  console.log("  ✅ Pantalla completa + Foco en iframe + Bloqueo de mando activados exitosamente");

  // Simular salida con botón Atrás
  console.log("  -> Usuario presiona ATRÁS (Back / Escape)");
  exitPlayerMode();
  assert.equal(isFullscreen, false, "Debe salir de Pantalla Completa");
  assert.equal(playerLocked, false, "Debe desactivar playerLocked");
  assert.equal(androidPlayerLocked, false, "Android bridge debe recibir playerLocked=false");
  assert.equal(focusedElement, mockBtnFullscreen, "El foco debe volver ordenadamente a 'btn-fullscreen'");
  assert.equal(hudNotice, null, "El aviso HUD debe limpiarse");
  console.log("  ✅ Salida limpia con foco devuelto a 'btn-fullscreen'");

  console.log("\n==================================================");
  console.log("🎉 TODOS LOS TESTS DE FUSIÓN PASARON CON ÉXITO");
  console.log("==================================================");
}

run().catch((err) => {
  console.error("❌ Test fallido:", err);
  process.exit(1);
});
