import assert from "node:assert/strict";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function run() {
  console.log("==================================================");
  console.log("🧪 TESTING AJUSTE FULLSCREEN Y NOMBRE PROVEEDOR #2");
  console.log("==================================================");

  const livePagePath = join(root, "app", "live", "page.tsx");
  assert.ok(existsSync(livePagePath), "app/live/page.tsx debe existir");
  const livePage = readFileSync(livePagePath, "utf8");

  // 1. Verificar estado y listener de fullscreen
  console.log("\n1. Verificando gestión de pantalla completa...");
  assert.ok(livePage.includes("isFullscreen"), "LivePage debe manejar el estado isFullscreen");
  assert.ok(livePage.includes("fullscreenchange"), "LivePage debe escuchar eventos fullscreenchange");
  assert.ok(livePage.includes("fixed inset-0"), "LivePage debe aplicar fixed inset-0 en modo fullscreen");
  assert.ok(
    livePage.includes("flex-1 w-full h-full max-h-none aspect-auto"),
    "El marco de video debe expandirse con flex-1 y max-h-none en fullscreen para no dejar franja negra"
  );
  console.log("  ✅ Ajuste de pantalla completa (expansión flex-1 y sin espacio negro) verificado");

  // 2. Verificar nombre de proveedor #2 (Deportes ES)
  console.log("\n2. Verificando nombre dinámico del proveedor en cabecera...");
  assert.ok(
    livePage.includes("src.name ||"),
    "La sección de canales debe priorizar src.name ('Deportes ES') en lugar de sobreescribir con d.agenda"
  );
  console.log("  ✅ Respeto al nombre del proveedor configurado ('Deportes ES') verificado");

  console.log("\n==================================================");
  console.log("🎉 TODOS LOS TESTS PASARON CON ÉXITO");
  console.log("==================================================");
}

run().catch((err) => {
  console.error("❌ Test fallido:", err);
  process.exit(1);
});
