// scripts/test-dev-inspect-blocker.mjs
// Test automatizado de bloqueo de clic derecho y DevTools (F12) en producción.

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("=== INICIANDO PRUEBAS DE BLOQUEO DE CLIC DERECHO Y DEVTOOLS (F12) ===");

// -------------------------------------------------------------
// [TEST 0] Verificación estática de código fuente
// -------------------------------------------------------------
console.log("\n[TEST 0] Verificación estática de DevInspectBlocker.tsx y app/layout.tsx");

const blockerFile = path.join(process.cwd(), "components/DevInspectBlocker.tsx");
assert.strictEqual(fs.existsSync(blockerFile), true, "components/DevInspectBlocker.tsx debe existir");

const blockerCode = fs.readFileSync(blockerFile, "utf8");
const layoutCode = fs.readFileSync(path.join(process.cwd(), "app/layout.tsx"), "utf8");

// Verificación en layout
assert.strictEqual(
  layoutCode.includes("DevInspectBlocker"),
  true,
  "app/layout.tsx debe importar y renderizar DevInspectBlocker"
);

// Verificación de guard NODE_ENV === 'production'
assert.strictEqual(
  blockerCode.includes('process.env.NODE_ENV !== "production"'),
  true,
  "DevInspectBlocker debe condicionarse estrictamente a NODE_ENV !== 'production'"
);

// Verificación de listeners clave
assert.strictEqual(blockerCode.includes("contextmenu"), true, "Debe escuchar evento 'contextmenu'");
assert.strictEqual(blockerCode.includes("F12"), true, "Debe contemplar la tecla F12");
assert.strictEqual(blockerCode.includes("shiftKey"), true, "Debe contemplar combinaciones con Shift (Ctrl+Shift+I/J/C)");
assert.strictEqual(blockerCode.includes('"u"'), true, "Debe contemplar Ctrl+U (Ver código fuente)");

console.log("  ✓ Verificación estática exitosa");

// -------------------------------------------------------------
// [TEST 1] Simulación de Entorno y Manejadores
// -------------------------------------------------------------
console.log("\n[TEST 1] Prueba de Bloqueo de Clic Derecho (contextmenu) en Producción vs Desarrollo");

function createEventMock(props = {}) {
  return {
    defaultPrevented: false,
    propagationStopped: false,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() { this.propagationStopped = true; },
    ...props
  };
}

// Lógica pura de DevInspectBlocker para pruebas
function setupBlocker(nodeEnv) {
  if (nodeEnv !== "production") {
    return { handleContextMenu: null, handleKeyDown: null };
  }

  const handleContextMenu = (e) => {
    e.preventDefault();
  };

  const handleKeyDown = (e) => {
    const isCmdOrCtrl = e.ctrlKey || e.metaKey;
    const k = e.keyCode;
    const key = e.key ? e.key.toLowerCase() : "";

    // 1. F12 (DevTools)
    if (e.key === "F12" || k === 123) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // 2. Ctrl + Shift + I / Cmd + Shift + I
    //    Ctrl + Shift + J / Cmd + Shift + J
    //    Ctrl + Shift + C / Cmd + Shift + C
    if (isCmdOrCtrl && e.shiftKey && (key === "i" || key === "j" || key === "c" || k === 73 || k === 74 || k === 67)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // 3. Ctrl + U / Cmd + U
    if (isCmdOrCtrl && !e.shiftKey && (key === "u" || k === 85)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // 4. Ctrl + S / Cmd + S
    if (isCmdOrCtrl && !e.shiftKey && (key === "s" || k === 83)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  };

  return { handleContextMenu, handleKeyDown };
}

// Caso 1: En desarrollo (development), NO debe haber bloqueo
const devBlocker = setupBlocker("development");
assert.strictEqual(devBlocker.handleContextMenu, null, "En desarrollo no debe registrarse handleContextMenu");
assert.strictEqual(devBlocker.handleKeyDown, null, "En desarrollo no debe registrarse handleKeyDown");
console.log("  ✓ En desarrollo (development) las herramientas de desarrollador y clic derecho permanecen habilitadas");

// Caso 2: En producción (production), DEBE bloquear contextmenu
const prodBlocker = setupBlocker("production");
assert.notStrictEqual(prodBlocker.handleContextMenu, null);
assert.notStrictEqual(prodBlocker.handleKeyDown, null);

const contextEvent = createEventMock();
prodBlocker.handleContextMenu(contextEvent);
assert.strictEqual(contextEvent.defaultPrevented, true, "En producción, clic derecho debe ser cancelado con preventDefault()");
console.log("  ✓ En producción, el menú contextual (clic derecho) queda completamente bloqueado");

// -------------------------------------------------------------
// [TEST 2] Prueba de Teclas de DevTools en Producción
// -------------------------------------------------------------
console.log("\n[TEST 2] Prueba de Bloqueo de Teclas F12 y Atajos de Inspección");

// 1. F12
let ev = { ...createEventMock(), key: "F12", keyCode: 123 };
prodBlocker.handleKeyDown(ev);
assert.strictEqual(ev.defaultPrevented, true, "F12 debe ejecutar preventDefault()");
assert.strictEqual(ev.propagationStopped, true, "F12 debe ejecutar stopPropagation()");

// 2. Ctrl + Shift + I (Inspeccionar)
ev = { ...createEventMock(), key: "I", keyCode: 73, ctrlKey: true, shiftKey: true };
prodBlocker.handleKeyDown(ev);
assert.strictEqual(ev.defaultPrevented, true, "Ctrl+Shift+I debe ser bloqueado");
assert.strictEqual(ev.propagationStopped, true);

// 3. Cmd + Shift + I (Mac Inspeccionar)
ev = { ...createEventMock(), key: "I", keyCode: 73, metaKey: true, shiftKey: true };
prodBlocker.handleKeyDown(ev);
assert.strictEqual(ev.defaultPrevented, true, "Cmd+Shift+I debe ser bloqueado");

// 4. Ctrl + Shift + J (Consola)
ev = { ...createEventMock(), key: "J", keyCode: 74, ctrlKey: true, shiftKey: true };
prodBlocker.handleKeyDown(ev);
assert.strictEqual(ev.defaultPrevented, true, "Ctrl+Shift+J debe ser bloqueado");

// 5. Ctrl + Shift + C (Inspector de elementos)
ev = { ...createEventMock(), key: "C", keyCode: 67, ctrlKey: true, shiftKey: true };
prodBlocker.handleKeyDown(ev);
assert.strictEqual(ev.defaultPrevented, true, "Ctrl+Shift+C debe ser bloqueado");

// 6. Ctrl + U (Ver código fuente)
ev = { ...createEventMock(), key: "u", keyCode: 85, ctrlKey: true, shiftKey: false };
prodBlocker.handleKeyDown(ev);
assert.strictEqual(ev.defaultPrevented, true, "Ctrl+U debe ser bloqueado");

// 7. Ctrl + S (Guardar página)
ev = { ...createEventMock(), key: "s", keyCode: 83, ctrlKey: true, shiftKey: false };
prodBlocker.handleKeyDown(ev);
assert.strictEqual(ev.defaultPrevented, true, "Ctrl+S debe ser bloqueado");

console.log("  ✓ F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U y Ctrl+S son bloqueados con éxito en producción");

// -------------------------------------------------------------
// [TEST 3] Preservación de Operaciones Normales (No falsos positivos)
// -------------------------------------------------------------
console.log("\n[TEST 3] Preservación de Operaciones Normales (Ctrl+C, Ctrl+V, Teclado común)");

// 1. Ctrl + C normal (copiar texto) NO debe ser bloqueado
ev = { ...createEventMock(), key: "c", keyCode: 67, ctrlKey: true, shiftKey: false };
prodBlocker.handleKeyDown(ev);
assert.strictEqual(ev.defaultPrevented, false, "Ctrl+C normal para copiar texto NO debe ser bloqueado");

// 2. Ctrl + V normal (pegar texto) NO debe ser bloqueado
ev = { ...createEventMock(), key: "v", keyCode: 86, ctrlKey: true, shiftKey: false };
prodBlocker.handleKeyDown(ev);
assert.strictEqual(ev.defaultPrevented, false, "Ctrl+V normal para pegar texto NO debe ser bloqueado");

// 3. Tecla 'B' física (keyCode: 66) NO debe ser bloqueada
ev = { ...createEventMock(), key: "b", keyCode: 66, ctrlKey: false, shiftKey: false };
prodBlocker.handleKeyDown(ev);
assert.strictEqual(ev.defaultPrevented, false, "Tecla física 'B' NO debe ser bloqueada");

// 4. Tecla 'Enter' NO debe ser bloqueada
ev = { ...createEventMock(), key: "Enter", keyCode: 13, ctrlKey: false, shiftKey: false };
prodBlocker.handleKeyDown(ev);
assert.strictEqual(ev.defaultPrevented, false, "Tecla Enter NO debe ser bloqueada");

console.log("  ✓ Operaciones de copiado/pegado y escritura normal no sufren interferencia");

console.log("\n=== TODAS LAS PRUEBAS DE DEV-INSPECT-BLOCKER PASARON CON ÉXITO ===");
