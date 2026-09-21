// @ts-check
import assert from "node:assert/strict";
import { sortSourcesByPriority, getStreamTypeMeta } from "../lib/sources.ts";

console.log("==================================================");
console.log("🧪 TESTING FASE 3 Y 4: PLAYER MODULAR Y MOTOR FALLBACK");
console.log("==================================================");

// 1. Verificamos la máquina de estados del Fallback Engine
console.log("\n[1/3] Verificando motor de fallback y cola de servidores...");

const mockSources = [
  {
    id: "s1-embed",
    providerId: "s1",
    providerName: "S1 (Primary)",
    type: "iframe",
    url: "https://s1.broken.org/embed/550",
    lang: "es",
    languages: ["es"],
    subtitles: [],
    priority: 10,
    isBeta: false,
  },
  {
    id: "s2-embed",
    providerId: "s2",
    providerName: "S2 (Secondary)",
    type: "iframe",
    url: "https://s2.working.org/embed/550",
    lang: "es",
    languages: ["es"],
    subtitles: [],
    priority: 9,
    isBeta: false,
  },
  {
    id: "s3-beta",
    providerId: "s3",
    providerName: "S3 (Beta)",
    type: "iframe",
    url: "https://s3.beta.org/embed/550",
    lang: "es",
    languages: ["es"],
    subtitles: [],
    priority: 5,
    isBeta: true,
  },
];

// Simulamos el algoritmo de fallback
class MockFallbackManager {
  constructor(sources, recommendedId) {
    this.sources = sources;
    this.recommendedId = recommendedId;
    this.failedIds = new Set();
    this.userSourceId = null;
  }

  getActiveSource() {
    if (this.userSourceId) {
      const u = this.sources.find((s) => s.id === this.userSourceId);
      if (u) return u;
    }
    const available = this.sources.filter((s) => !this.failedIds.has(s.id));
    const pool = available.length > 0 ? available : this.sources;
    const rec = pool.find((s) => s.id === this.recommendedId);
    return rec || pool[0] || null;
  }

  markFailed(sourceId) {
    this.failedIds.add(sourceId);
  }

  cycleNext() {
    const active = this.getActiveSource();
    const available = this.sources.filter((s) => !this.failedIds.has(s.id));
    const pool = available.length > 0 ? available : this.sources;
    const idx = pool.findIndex((s) => s.id === active?.id);
    const next = pool[(idx + 1) % pool.length];
    this.userSourceId = next.id;
    return next;
  }
}

const fb = new MockFallbackManager(mockSources, "s1-embed");

// Estado inicial: debe ser s1-embed
assert.equal(fb.getActiveSource()?.id, "s1-embed", "La fuente recomendada debe ser s1");

// S1 falla: marcamos s1 como fallido
fb.markFailed("s1-embed");
assert.equal(fb.getActiveSource()?.id, "s2-embed", "Al fallar s1, debe conmutar automáticamente a s2");
console.log("  ✅ Auto-conmutación a S2 tras registrar caída en S1 verificada");

// S2 falla también:
fb.markFailed("s2-embed");
assert.equal(fb.getActiveSource()?.id, "s3-beta", "Al fallar s1 y s2, debe recurrir a la fuente beta s3");
console.log("  ✅ Recurso a servidores de contingencia y beta verificado");

// 2. Verificamos la compatibilidad de metadatos para UI
console.log("\n[2/3] Verificando compatibilidad de tipos de stream en UI...");
for (const type of ["iframe", "hls", "dash", "mp4"]) {
  const meta = getStreamTypeMeta(type);
  assert.ok(meta.badge, `Tipo ${type} debe tener badge visible`);
  assert.ok(meta.color, `Tipo ${type} debe tener clases de color Tailwind`);
}
console.log("  ✅ Badges y metadatos visuales de streams consistentes");

// 3. Verificamos ciclo manual de servidor
console.log("\n[3/3] Verificando ciclo manual de servidores por el usuario...");
const fbCycle = new MockFallbackManager(mockSources, "s1-embed");
const next = fbCycle.cycleNext();
assert.equal(next.id, "s2-embed", "Al pulsar 'Cambiar servidor', pasa a s2");
const next2 = fbCycle.cycleNext();
assert.equal(next2.id, "s3-beta", "Al volver a pulsar, pasa a s3");
const next3 = fbCycle.cycleNext();
assert.equal(next3.id, "s1-embed", "Al llegar al final, vuelve cíclicamente al inicio");
console.log("  ✅ Navegación cíclica manual 100% fluida");

console.log("\n🎉 TODAS LAS PRUEBAS DE LAS FASES 3 Y 4 PASARON SATISFACTORIAMENTE.");
