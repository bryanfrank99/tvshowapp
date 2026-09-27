import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

console.log("🧪 Iniciando pruebas de Verificación de Marca 'TVShow - Indexador'...");

// 1. Verificar app/layout.tsx
const layoutContent = fs.readFileSync(path.join(root, "app", "layout.tsx"), "utf8");
assert.ok(layoutContent.includes('title: "TVShow - Indexador"'), "app/layout.tsx debe tener 'TVShow - Indexador'");
assert.ok(!layoutContent.includes("Catálogo + Player"), "app/layout.tsx no debe tener 'Catálogo + Player'");
assert.ok(!layoutContent.includes("Catalogo + Player"), "app/layout.tsx no debe tener 'Catalogo + Player'");
console.log("  ✓ app/layout.tsx validado con 'TVShow - Indexador'");

// 2. Verificar app/title/page.tsx
const titlePageContent = fs.readFileSync(path.join(root, "app", "title", "page.tsx"), "utf8");
assert.ok(titlePageContent.includes('title: "TVShow - Indexador"'), "app/title/page.tsx debe tener fallback 'TVShow - Indexador'");
assert.ok(!titlePageContent.includes("Catálogo + Player"), "app/title/page.tsx no debe tener 'Catálogo + Player'");
assert.ok(!titlePageContent.includes("Catalogo + Player"), "app/title/page.tsx no debe tener 'Catalogo + Player'");
console.log("  ✓ app/title/page.tsx validado con fallback 'TVShow - Indexador'");

// 3. Verificar electron/main.js
const electronContent = fs.readFileSync(path.join(root, "electron", "main.js"), "utf8");
assert.ok(electronContent.includes("title: 'TVShow - Indexador'"), "electron/main.js debe tener title: 'TVShow - Indexador'");
console.log("  ✓ electron/main.js configurado con 'TVShow - Indexador'");

// 4. Verificar fastlane
const fastlaneContent = fs.readFileSync(path.join(root, "fastlane", "metadata", "android", "short_description.txt"), "utf8");
assert.ok(fastlaneContent.includes("Indexador"), "fastlane short_description debe mencionar Indexador");
console.log("  ✓ fastlane short_description actualizado correctamente");

console.log("🎉 ¡Todas las pruebas de cambio de marca pasaron exitosamente!");
