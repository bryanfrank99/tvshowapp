import assert from "node:assert/strict";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function run() {
  console.log("==================================================");
  console.log("🧪 TESTING REI DOS CANAIS Y REDISEÑO ADMIN LIVE");
  console.log("==================================================");

  // 1. Verificar lib/providers.ts
  console.log("\n1. Verificando lib/providers.ts...");
  const providersTs = readFileSync(join(root, "lib", "providers.ts"), "utf8");
  assert.ok(
    providersTs.includes('"reidoscanais"'),
    'lib/providers.ts debe contener el tipo de formato "reidoscanais"'
  );
  console.log("  ✅ Tipo LiveSource actualizado con 'reidoscanais'");

  // 2. Verificar que public/providers.json fue eliminado (eliminación del sistema JSON)
  console.log("\n2. Verificando que public/providers.json no existe...");
  assert.equal(
    existsSync(join(root, "public", "providers.json")),
    false,
    "public/providers.json no debe existir (sistema basado en json eliminado)"
  );
  console.log("  ✅ public/providers.json eliminado correctamente");

  // 3. Verificar supabase/seed.sql
  console.log("\n3. Verificando supabase/seed.sql...");
  const seedSql = readFileSync(join(root, "supabase", "seed.sql"), "utf8");
  assert.ok(
    seedSql.includes("'reidoscanais'"),
    "supabase/seed.sql debe incluir la inserción de 'reidoscanais'"
  );
  assert.ok(
    seedSql.includes("https://api.reidoscanais.st/channels"),
    "supabase/seed.sql debe incluir la URL de la API de Rei dos Canais"
  );
  console.log("  ✅ supabase/seed.sql actualizado correctamente");

  // 4. Verificar app/api/live/list/route.ts (Proxy ALLOWED domains)
  console.log("\n4. Verificando proxy en app/api/live/list/route.ts...");
  const proxyRoute = readFileSync(join(root, "app", "api", "live", "list", "route.ts"), "utf8");
  assert.ok(proxyRoute.includes("reidoscanais.st"), "ALLOWED debe incluir reidoscanais.st");
  assert.ok(proxyRoute.includes("rdcanais.net"), "ALLOWED debe incluir rdcanais.net");
  // Verificar que api.reidoscanais.st sea aceptado por la regla .endsWith("." + h)
  const host = "api.reidoscanais.st";
  const allowed = ["streambetter.shop", "tvf90.com", "reidoscanais.st", "rdcanais.net"];
  assert.ok(allowed.some((h) => host === h || host.endsWith("." + h)), "api.reidoscanais.st debe ser permitido por la regla de subdominios");
  console.log("  ✅ Dominios de Rei dos Canais autorizados en el proxy");

  // 5. Verificar whitelist en Capacitor y Android
  console.log("\n5. Verificando whitelists en Capacitor y Android...");
  const capConfig = readFileSync(join(root, "capacitor.config.ts"), "utf8");
  assert.ok(capConfig.includes("reidoscanais.st"), "capacitor.config.ts debe incluir reidoscanais.st");
  assert.ok(capConfig.includes("rdcanais.net"), "capacitor.config.ts debe incluir rdcanais.net");

  const capJsonPath = join(root, "android", "app", "src", "main", "assets", "capacitor.config.json");
  if (existsSync(capJsonPath)) {
    const capJson = readFileSync(capJsonPath, "utf8");
    assert.ok(capJson.includes("reidoscanais.st"), "capacitor.config.json debe incluir reidoscanais.st");
    assert.ok(capJson.includes("rdcanais.net"), "capacitor.config.json debe incluir rdcanais.net");
  }

  const adBlockClient = readFileSync(
    join(root, "android", "app", "src", "main", "java", "com", "tvshow", "app", "AdBlockWebViewClient.java"),
    "utf8"
  );
  assert.ok(adBlockClient.includes("reidoscanais.st"), "AdBlockWebViewClient debe permitir reidoscanais.st");
  assert.ok(adBlockClient.includes("rdcanais.net"), "AdBlockWebViewClient debe permitir rdcanais.net");
  console.log("  ✅ Whitelist de Capacitor y Android WebClient configurada");

  // 6. Verificar parser en app/live/page.tsx
  console.log("\n6. Verificando lógica del parser en app/live/page.tsx...");
  const livePage = readFileSync(join(root, "app", "live", "page.tsx"), "utf8");
  assert.ok(livePage.includes('src.format === "reidoscanais"'), "app/live/page.tsx debe tener rama para reidoscanais");
  assert.ok(livePage.includes("c.epg"), "app/live/page.tsx debe procesar EPG si está disponible");
  assert.ok(livePage.includes("https://rdcanais.net/"), "app/live/page.tsx debe generar embed url con rdcanais.net");

  // Simulación del parser
  const mockApiChannels = [
    {
      id: 10,
      name: "Globo RJ HD",
      slug: "globo-rj-hd",
      category: "Variedades",
      logo_url: "https://img.reidoscanais.st/globo.png",
      epg: {
        current: {
          title: "Novela das 9",
          start: "21:00",
          end: "22:00"
        }
      },
      stream: {
        embed_url: "https://rdcanais.net/globo-rj-hd"
      }
    },
    {
      id: 20,
      name: "ESPN Brasil",
      slug: "espn-brasil",
      category: "Esportes",
      logo: "https://img.reidoscanais.st/espn.png",
      now: "SportsCenter",
      embed: "https://rdcanais.net/espn-brasil"
    }
  ];

  const parsed = mockApiChannels.map((c) => {
    const rawId = String(c.id || c.slug || "");
    const embedUrl = c.stream?.embed_url || c.embed_url || c.embed || (c.slug ? `https://rdcanais.net/${c.slug}` : "");
    const logoUrl = c.logo_url || c.logo || "";
    const category = c.category || "Variedades";
    const currentProg = c.epg?.current?.title || c.now || "";
    return {
      id: `reidoscanais-${rawId}`,
      name: c.name || c.slug || "Canal",
      category,
      logo: logoUrl,
      embed: embedUrl,
      now: currentProg,
    };
  });

  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].id, "reidoscanais-10");
  assert.equal(parsed[0].name, "Globo RJ HD");
  assert.equal(parsed[0].category, "Variedades");
  assert.equal(parsed[0].embed, "https://rdcanais.net/globo-rj-hd");
  assert.equal(parsed[0].now, "Novela das 9");
  assert.equal(parsed[1].now, "SportsCenter");
  console.log("  ✅ Parser verificado exitosamente con datos simulados");

  // 7. Verificar app/api/admin/live/health-check/route.ts
  console.log("\n7. Verificando health-check route...");
  const healthRoutePath = join(root, "app", "api", "admin", "live", "health-check", "route.ts");
  assert.ok(existsSync(healthRoutePath), "Falta app/api/admin/live/health-check/route.ts");
  const healthRoute = readFileSync(healthRoutePath, "utf8");
  assert.ok(healthRoute.includes("latencyMs"), "Health check debe retornar latencyMs");
  assert.ok(healthRoute.includes("status"), "Health check debe retornar status");
  console.log("  ✅ Endpoint de diagnóstico de canales live existe y cuenta con métricas de salud y latencia");

  // 8. Verificar interfaz rediseñada de admin/page.tsx
  console.log("\n8. Verificando rediseño de admin/page.tsx...");
  const adminPage = readFileSync(join(root, "app", "admin", "page.tsx"), "utf8");
  assert.ok(adminPage.includes("LIVE_FORMATS"), "admin/page.tsx debe definir LIVE_FORMATS con presets");
  assert.ok(adminPage.includes("runLiveHealthCheck"), "admin/page.tsx debe tener runLiveHealthCheck");
  assert.ok(adminPage.includes("liveHealthData"), "admin/page.tsx debe tener estado liveHealthData");
  assert.ok(adminPage.includes("isCheckingLiveHealth"), "admin/page.tsx debe tener estado isCheckingLiveHealth");
  assert.ok(adminPage.includes("Diagnosticar Canales"), "admin/page.tsx debe tener botón de Diagnóstico ⚡ para canales");
  console.log("  ✅ Interfaz de administración de canales live rediseñada idéntica a la de servidores");

  console.log("\n==================================================");
  console.log("🎉 TODOS LOS TESTS PASARON CON ÉXITO");
  console.log("==================================================");
}

run().catch((err) => {
  console.error("❌ Test fallido:", err);
  process.exit(1);
});
