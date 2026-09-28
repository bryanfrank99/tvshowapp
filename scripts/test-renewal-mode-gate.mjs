// Test suite para Spec 053: Modo Renovación Estricto en AccessGate
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import assert from "node:assert";

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

import { getDeviceAccessStatus, bindDeviceToCode } from "../lib/access.ts";
import { supa } from "../lib/supa.ts";

async function runTests() {
  console.log("==================================================");
  console.log("🧪 TESTING SPEC 053: MODO RENOVACIÓN EN ACCESS GATE");
  console.log("==================================================");

  // 1. Verificar traducciones en lib/dict.ts
  console.log("\n1. Verificando traducciones trilingües de renovación en lib/dict.ts...");
  const dictContent = readFileSync(join(root, "lib", "dict.ts"), "utf8");
  for (const key of ["gate_check_renewal", "gate_checking", "gate_status_expired", "gate_status_revoked"]) {
    assert.ok(dictContent.includes(key), `lib/dict.ts debe contener ${key}`);
  }
  console.log("  ✅ Claves de diccionario gate_check_renewal, gate_checking, etc. presentes: OK");

  // 2. Verificar que AccessGate oculta el formulario en modo renovación
  console.log("\n2. Verificando renderizado condicional en components/AccessGate.tsx...");
  const gateContent = readFileSync(join(root, "components", "AccessGate.tsx"), "utf8");
  assert.ok(gateContent.includes("isRenewal && !canEnterCode"), "AccessGate debe comprobar isRenewal && !canEnterCode");
  assert.ok(gateContent.includes("checkStatus"), "AccessGate debe tener checkStatus");
  assert.ok(gateContent.includes("canEnterCode"), "AccessGate debe controlar canEnterCode");
  console.log("  ✅ Lógica de ocultamiento del formulario en AccessGate verificada: OK");

  // 3. Pruebas de integración con la base de datos Supabase
  const sb = supa();
  const testDevId = `DEV-REN-${Date.now().toString(16).toUpperCase()}`;
  const testRef = `TV-REN-${Date.now().toString(16).slice(-4).toUpperCase()}`;
  const now = Date.now();
  const pastExp = new Date(now - 86400000).toISOString(); // vencida ayer
  const futureExp = new Date(now + 30 * 86400000).toISOString(); // vigente 30 días

  console.log("\n3. Test: Dispositivo nuevo sin clave registrada...");
  const newDevCheck = await getDeviceAccessStatus(testDevId, "");
  assert.strictEqual(newDevCheck.status, "new_or_deleted", "Dispositivo nuevo debe ser new_or_deleted");
  assert.strictEqual(newDevCheck.canEnterCode, true, "Dispositivo nuevo debe permitir ingresar código");
  console.log("  ✅ Dispositivo nuevo -> canEnterCode: true: OK");

  console.log("\n4. Creando clave de prueba vencida en Supabase...");
  const { data: expiredCode, error: errExp } = await sb
    .from("access_codes")
    .insert({
      code_hash: `hash_exp_${now}`,
      ref_code: testRef,
      label: "Test Renovacion Vencida",
      expires_at: pastExp,
      revoked: false,
    })
    .select("id, ref_code, expires_at, revoked")
    .single();

  if (errExp || !expiredCode) {
    throw new Error(`Error creando clave vencida: ${JSON.stringify(errExp)}`);
  }

  try {
    // Vincular el dispositivo a la clave vencida
    await bindDeviceToCode(testDevId, expiredCode.id, "Test Runner", "127.0.0.1");

    console.log("5. Test: Dispositivo con clave vencida entra en MODO RENOVACIÓN...");
    const renewalCheck = await getDeviceAccessStatus(testDevId, testRef);
    assert.strictEqual(renewalCheck.status, "renewal", "Estado debe ser renewal");
    assert.strictEqual(renewalCheck.reason, "expired", "Razón debe ser expired");
    assert.strictEqual(renewalCheck.canEnterCode, false, "En renovación NO debe permitir ingresar código");
    assert.strictEqual(renewalCheck.refCode, testRef, "Debe devolver el refCode de la clave");
    console.log(`  ✅ Modo renovación por vencimiento: status=renewal, canEnterCode=false, ref=${renewalCheck.refCode}: OK`);

    console.log("\n6. Test: Clave desactivada/revocada por administrador...");
    await sb.from("access_codes").update({ revoked: true, expires_at: futureExp }).eq("id", expiredCode.id);
    const revokedCheck = await getDeviceAccessStatus(testDevId, testRef);
    assert.strictEqual(revokedCheck.status, "renewal", "Estado debe ser renewal");
    assert.strictEqual(revokedCheck.reason, "revoked", "Razón debe ser revoked");
    assert.strictEqual(revokedCheck.canEnterCode, false, "En clave revocada NO debe permitir ingresar código");
    console.log(`  ✅ Modo renovación por revocación admin: status=renewal, reason=revoked, canEnterCode=false: OK`);

    console.log("\n7. Test: Administrador reactiva y renueva clave (estado activo)...");
    await sb.from("access_codes").update({ revoked: false, expires_at: futureExp }).eq("id", expiredCode.id);
    const activeCheck = await getDeviceAccessStatus(testDevId, testRef);
    assert.strictEqual(activeCheck.status, "active", "Estado debe ser active");
    assert.strictEqual(activeCheck.canEnterCode, false, "Clave activa se auto-autentica sin pedir código");
    console.log("  ✅ Clave reactivada por admin detectada como activa: OK");

    console.log("\n8. Test: Administrador ELIMINA la clave del servidor...");
    await sb.from("access_codes").delete().eq("id", expiredCode.id);
    const deletedCheck = await getDeviceAccessStatus(testDevId, testRef);
    assert.strictEqual(deletedCheck.status, "new_or_deleted", "Clave eliminada debe ser new_or_deleted");
    assert.strictEqual(deletedCheck.canEnterCode, true, "Clave eliminada DEBE permitir ingresar nuevo código");
    console.log("  ✅ Clave eliminada del servidor -> vuelve a mostrar input (canEnterCode: true): OK");

    console.log("\n🎉 TODAS LAS PRUEBAS DE LA SPEC 053 PASARON SATISFACTORIAMENTE.\n");
  } finally {
    // Limpieza de seguridad
    try {
      await sb.from("access_codes").delete().eq("id", expiredCode.id);
      await sb.from("device_bindings").delete().eq("device_id", testDevId);
      await sb.from("config").delete().eq("key", `dev_bind:${testDevId}`);
    } catch {}
  }
}

runTests().catch((err) => {
  console.error("❌ Error en pruebas Spec 053:", err);
  process.exit(1);
});
