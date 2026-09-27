import assert from "node:assert/strict";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function run() {
  console.log("==================================================");
  console.log("🧪 TESTING REDISEÑO UI/UX REPRODUCTOR TV EN VIVO");
  console.log("==================================================");

  const livePagePath = join(root, "app", "live", "page.tsx");
  assert.ok(existsSync(livePagePath), "app/live/page.tsx debe existir");
  const livePage = readFileSync(livePagePath, "utf8");

  // 1. Verificar dimensionamiento acotado y proporcional
  console.log("\n1. Verificando dimensionamiento proporcional...");
  assert.ok(
    livePage.includes("max-w-4xl") || livePage.includes("max-w-5xl"),
    "El reproductor debe estar acotado con max-w-4xl o max-w-5xl para evitar video gigante"
  );
  assert.ok(
    livePage.includes("aspect-video"),
    "El reproductor debe mantener proporción aspect-video"
  );
  assert.ok(
    livePage.includes("max-h-") || livePage.includes("playerSize"),
    "El reproductor debe contar con control de altura máxima o modo de tamaño"
  );
  console.log("  ✅ Dimensionamiento acotado y proporcional verificado");

  // 2. Verificar Glassmorphism Header y metadatos del canal
  console.log("\n2. Verificando header y metadatos del canal...");
  assert.ok(
    livePage.includes("current.image") || livePage.includes("current?.image"),
    "El header debe soportar y renderizar el logo del canal"
  );
  assert.ok(
    livePage.includes("currentNow") || livePage.includes("current.now") || livePage.includes("current?.now"),
    "El header debe mostrar la programación actual (EPG / now)"
  );
  assert.ok(
    livePage.includes("en_vivo"),
    "El header debe incluir el indicador en vivo"
  );
  console.log("  ✅ Header con metadatos (logo, EPG y badge en vivo) verificado");

  // 3. Verificar Toolbar de Acciones
  console.log("\n3. Verificando toolbar de controles...");
  assert.ok(livePage.includes('id="btn-live-prev"'), "Falta botón btn-live-prev");
  assert.ok(livePage.includes('id="btn-live-next"'), "Falta botón btn-live-next");
  assert.ok(livePage.includes('id="btn-live-reload"'), "Falta botón de recarga btn-live-reload");
  assert.ok(livePage.includes('id="btn-live-size"'), "Falta toggle de tamaño btn-live-size");
  assert.ok(livePage.includes('id="btn-live-fullscreen"'), "Falta botón de pantalla completa btn-live-fullscreen");
  assert.ok(livePage.includes('id="btn-live-close"'), "Falta botón de cierre btn-live-close");
  console.log("  ✅ Toolbar de controles completa (zapping, recarga, tamaño, fullscreen, cerrar)");

  // 4. Verificar Orden (Video arriba, Controles abajo) y Eliminación del carrusel redundante
  console.log("\n4. Verificando posición de video arriba, controles abajo y eliminación del riel...");
  const iframeIdx = livePage.indexOf("<iframe");
  const toolbarIdx = livePage.indexOf('id="btn-live-prev"');
  assert.ok(iframeIdx > 0 && toolbarIdx > 0, "Iframe y toolbar deben estar presentes");
  assert.ok(iframeIdx < toolbarIdx, "El marco de video debe posicionarse arriba de la barra de controles");
  assert.equal(
    livePage.includes('id="live-zapping-rail"'),
    false,
    "El riel de zapping horizontal 'live-zapping-rail' debe haber sido eliminado"
  );
  console.log("  ✅ Disposición confirmada: Video arriba, controles abajo, riel inferior eliminado");

  // 5. Verificar control con mando a distancia y atajos
  console.log("\n5. Verificando soporte para mando a distancia...");
  assert.ok(livePage.includes("GoBack"), "Debe soportar tecla GoBack para salir");
  assert.ok(livePage.includes("Escape"), "Debe soportar tecla Escape para salir");
  console.log("  ✅ Atajos de control remoto verificados");

  console.log("\n==================================================");
  console.log("🎉 TODOS LOS TESTS DE UI/UX LIVE PASARON CON ÉXITO");
  console.log("==================================================");
}

run().catch((err) => {
  console.error("❌ Test fallido:", err);
  process.exit(1);
});
