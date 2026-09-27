import assert from "node:assert/strict";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function run() {
  console.log("==================================================");
  console.log("🧪 TESTING ELIMINACIÓN DEL SISTEMA JSON DE PROVEEDORES");
  console.log("==================================================");

  // 1. Verificar que public/providers.json ya no existe en el proyecto
  console.log("\n1. Verificando que public/providers.json no existe...");
  const jsonPath = join(root, "public", "providers.json");
  assert.equal(
    existsSync(jsonPath),
    false,
    "public/providers.json debe haber sido eliminado del sistema de archivos"
  );
  console.log("  ✅ public/providers.json NO existe en public/");

  // 2. Verificar que lib/providers.ts no expone providersUrl
  console.log("\n2. Verificando lib/providers.ts...");
  const providersTs = readFileSync(join(root, "lib", "providers.ts"), "utf8");
  assert.equal(
    providersTs.includes("providersUrl"),
    false,
    "lib/providers.ts no debe contener providersUrl()"
  );
  assert.equal(
    providersTs.includes("/providers.json"),
    false,
    "lib/providers.ts no debe hacer referencia a /providers.json"
  );
  console.log("  ✅ lib/providers.ts limpio de referencias legacy a providers.json");

  // 3. Verificar que app/api/admin/live/health-check/route.ts no lee public/providers.json
  console.log("\n3. Verificando app/api/admin/live/health-check/route.ts...");
  const healthCheckTs = readFileSync(
    join(root, "app", "api", "admin", "live", "health-check", "route.ts"),
    "utf8"
  );
  assert.equal(
    healthCheckTs.includes("providers.json"),
    false,
    "health-check route no debe tener fallbacks a providers.json"
  );
  console.log("  ✅ health-check de admin limpio de fallbacks a providers.json");

  // 4. Verificar que /api/providers y /api/resolve usan exclusivamente Supabase
  console.log("\n4. Verificando endpoints /api/providers y /api/resolve...");
  const apiProvidersTs = readFileSync(join(root, "app", "api", "providers", "route.ts"), "utf8");
  assert.ok(apiProvidersTs.includes('sb.from("providers")'), "/api/providers debe consultar la tabla providers");
  assert.ok(apiProvidersTs.includes('sb.from("live_sources")'), "/api/providers debe consultar la tabla live_sources");
  assert.equal(apiProvidersTs.includes("providers.json"), false, "/api/providers no debe leer ningún providers.json");

  const apiResolveTs = readFileSync(join(root, "app", "api", "resolve", "route.ts"), "utf8");
  assert.ok(apiResolveTs.includes('.from("providers")'), "/api/resolve debe consultar la tabla providers");
  assert.equal(apiResolveTs.includes("providers.json"), false, "/api/resolve no debe leer ningún providers.json");
  console.log("  ✅ Rutas de producción /api/providers y /api/resolve operan 100% mediante Supabase");

  console.log("\n==================================================");
  console.log("🎉 ELIMINACIÓN DEL SISTEMA JSON VERIFICADA CON ÉXITO");
  console.log("==================================================");
}

run().catch((err) => {
  console.error("❌ Test fallido:", err);
  process.exit(1);
});
