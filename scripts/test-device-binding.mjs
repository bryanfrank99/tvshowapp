// Test suite para Spec 035: Control Anti-Reúso de Dispositivos
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const f of [".env.local", ".env"]) {
  const p = join(root, f);
  if (existsSync(p)) {
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
    }
  }
}

import { checkDeviceEligibility, bindDeviceToCode, resetSessionsForCode } from "../lib/access.ts";
import { supa } from "../lib/supa.ts";

async function runTests() {
  console.log("==================================================");
  console.log("🧪 TESTING SPEC 035: CONTROL ANTI-REÚSO DE DISPOSITIVOS");
  console.log("==================================================");

  const sb = supa();
  const testDevId = `DEV-TEST-${Date.now().toString(16).toUpperCase()}`;

  // 1. Crear Clave A (Demo de prueba) y Clave B
  const codeAHash = `hash_a_${Date.now()}`;
  const codeBHash = `hash_b_${Date.now()}`;
  const refA = `TV-TEST-A1`;
  const refB = `TV-TEST-B2`;

  const now = new Date();
  const futureExp = new Date(now.getTime() + 3 * 86400000).toISOString(); // +3 días
  const pastExp = new Date(now.getTime() - 3600000).toISOString(); // expirado hace 1h

  console.log("\n1. Creando claves de prueba en Supabase...");
  const { data: codeA, error: errA } = await sb
    .from("access_codes")
    .insert({
      code_hash: codeAHash,
      ref_code: refA,
      label: "Cliente Demo Test A",
      expires_at: futureExp,
      revoked: false,
    })
    .select("id, ref_code, expires_at, revoked")
    .single();

  if (errA || !codeA) {
    throw new Error(`Error creando clave A: ${JSON.stringify(errA)}`);
  }

  const { data: codeB, error: errB } = await sb
    .from("access_codes")
    .insert({
      code_hash: codeBHash,
      ref_code: refB,
      label: "Cliente Demo Test B",
      expires_at: futureExp,
      revoked: false,
    })
    .select("id, ref_code, expires_at, revoked")
    .single();

  if (errB || !codeB) {
    throw new Error(`Error creando clave B: ${JSON.stringify(errB)}`);
  }

  try {
    // Test 1: Dispositivo nuevo sin vinculaciones previas debe ser elegible
    console.log("\n2. Test: Dispositivo nuevo es elegible para activar Clave A...");
    const check1 = await checkDeviceEligibility(testDevId, codeA.id);
    if (!check1.eligible) throw new Error("Fallo: Dispositivo nuevo debería ser elegible");
    console.log("  ✅ Dispositivo nuevo elegible: OK");

    // Vincular el dispositivo a Clave A
    console.log("\n3. Vinculando dispositivo a Clave A...");
    await bindDeviceToCode(testDevId, codeA.id, "Test Unitario PC", "127.0.0.1");

    // Test 2: Reactivación de la misma clave A permitida
    console.log("\n4. Test: Reactivación de la misma Clave A permitida...");
    const checkSame = await checkDeviceEligibility(testDevId, codeA.id);
    if (!checkSame.eligible) throw new Error("Fallo: Misma clave debería ser elegible");
    console.log("  ✅ Misma clave permitida: OK");

    // Test 3: Clave A caduca (expirada) -> Intentar activar Clave B debe ser BLOQUEADO
    console.log("\n5. Simulando vencimiento de Clave A...");
    await sb.from("access_codes").update({ expires_at: pastExp }).eq("id", codeA.id);

    console.log("6. Test: Intento de activar Clave B desde el mismo dispositivo con Clave A vencida...");
    const checkBlockedExpired = await checkDeviceEligibility(testDevId, codeB.id);
    if (checkBlockedExpired.eligible) {
      throw new Error("Fallo: Debería haber bloqueado la activación de Clave B");
    }
    if (checkBlockedExpired.reason !== "device_blocked_inactive") {
      throw new Error(`Fallo: Razón esperada 'device_blocked_inactive', recibida: ${checkBlockedExpired.reason}`);
    }
    if (checkBlockedExpired.boundRef !== refA) {
      throw new Error(`Fallo: Referencia vinculada esperada ${refA}, recibida: ${checkBlockedExpired.boundRef}`);
    }
    console.log(`  ✅ Bloqueo por clave vencida verificado: ${checkBlockedExpired.reason} (Ref previa: ${checkBlockedExpired.boundRef})`);

    // Test 4: Clave A revocada -> Intentar activar Clave B debe ser BLOQUEADO
    console.log("\n7. Simulando Clave A revocada por el administrador...");
    await sb.from("access_codes").update({ expires_at: futureExp, revoked: true }).eq("id", codeA.id);

    console.log("8. Test: Intento de activar Clave B desde el dispositivo con Clave A revocada...");
    const checkBlockedRevoked = await checkDeviceEligibility(testDevId, codeB.id);
    if (checkBlockedRevoked.eligible) {
      throw new Error("Fallo: Debería haber bloqueado la activación de Clave B");
    }
    console.log(`  ✅ Bloqueo por clave revocada verificado: ${checkBlockedRevoked.reason}`);

    // Test 5: Cliente renueva Clave A (+30 días, reactivada) -> Reingreso de Clave A permitido
    console.log("\n9. Simulando renovación de Clave A (+30 días, revoked: false)...");
    await sb.from("access_codes").update({ expires_at: futureExp, revoked: false }).eq("id", codeA.id);

    const checkRenewed = await checkDeviceEligibility(testDevId, codeA.id);
    if (!checkRenewed.eligible) {
      throw new Error("Fallo: Clave A renovada debe ser elegible en su propio dispositivo");
    }
    console.log("  ✅ Reactivación de clave original renovada: OK");

    // Test 6: Administrador desvincula dispositivos de Clave A (resetSessionsForCode)
    console.log("\n10. Administrador desvincula dispositivos de Clave A...");
    await resetSessionsForCode(codeA.id);

    // Vencer Clave A nuevamente
    await sb.from("access_codes").update({ expires_at: pastExp }).eq("id", codeA.id);

    console.log("11. Test: Tras desvinculación formal por el admin, dispositivo puede enlazar Clave B...");
    const checkAfterReset = await checkDeviceEligibility(testDevId, codeB.id);
    if (!checkAfterReset.eligible) {
      throw new Error("Fallo: Tras reset administrativo el dispositivo debe poder activarse");
    }
    console.log("  ✅ Dispositivo liberado tras desvinculación administrativa: OK");

    console.log("\n==================================================");
    console.log("🎉 TODAS LAS PRUEBAS DE LA SPEC 035 PASARON CON ÉXITO");
    console.log("==================================================");
  } finally {
    // Limpieza
    console.log("\nLimpiando registros de prueba...");
    try {
      await sb.from("device_bindings").delete().eq("device_id", testDevId);
      await sb.from("access_codes").delete().eq("id", codeA.id);
      await sb.from("access_codes").delete().eq("id", codeB.id);
    } catch {}
  }
}

runTests().catch((err) => {
  console.error("❌ Error en pruebas:", err);
  process.exit(1);
});
