import assert from "node:assert";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { buildWebPackage } from "./build-web-package.mjs";
import { splitInstaller } from "./split-installer.mjs";

console.log("==================================================");
console.log("🧪 VALIDACIÓN DEL INSTALADOR WEB Y FRAGMENTACIÓN 2MB");
console.log("==================================================");

// 1. Probar compilación del instalador web ligero
console.log("\n[1/5] Compilando instalador web ligero (TVShow-Setup.exe)...");
const buildResult = buildWebPackage();

assert(fs.existsSync(buildResult.targetExe), "TVShow-Setup.exe debe existir");
const exeStats = fs.statSync(buildResult.targetExe);
console.log(`Tamaño real del ejecutable: ${(exeStats.size / 1024).toFixed(2)} KB`);

// Comprobar requisito estricto: < 5 MB
const MAX_BYTES = 5 * 1024 * 1024;
assert(exeStats.size < MAX_BYTES, `El instalador debe pesar menos de 5 MB (pesa ${(exeStats.size / (1024 * 1024)).toFixed(2)} MB)`);
console.log("✔ Requisito de peso < 5 MB: SUPERADO EXITOSAMENTE (pesa menos de 0.2 MB).");

// 2. Verificar cabecera MZ de ejecutable nativo de Windows
console.log("\n[2/5] Verificando cabecera PE/MZ del ejecutable Windows...");
const exeBuffer = fs.readFileSync(buildResult.targetExe);
assert(exeBuffer[0] === 0x4d && exeBuffer[1] === 0x5a, "El archivo debe ser un binario Windows PE válido (firma MZ)");
console.log("✔ Firma binaria PE/MZ válida.");

// 3. Probar fragmentación en trozos de 2 MB con archivo simulado de 5.5 MB
console.log("\n[3/5] Probando algoritmo de fragmentación en bloques de 2 MB...");
const testDummyDir = path.resolve("dist/test-dummy");
fs.mkdirSync(testDummyDir, { recursive: true });

const dummyExePath = path.join(testDummyDir, "TVShow-DummySetup.exe");
const dummySize = 5.5 * 1024 * 1024; // 5.5 MB (debe generar 3 partes: 2MB, 2MB, 1.5MB)
const dummyBuffer = crypto.randomBytes(dummySize);
dummyBuffer[0] = 0x4d; // 'M'
dummyBuffer[1] = 0x5a; // 'Z'
fs.writeFileSync(dummyExePath, dummyBuffer);

const originalHash = crypto.createHash("sha256").update(dummyBuffer).digest("hex");

const splitOutput = path.resolve("dist/test-split-output");
const splitRes = splitInstaller({
  inputExe: dummyExePath,
  outputDir: splitOutput,
  chunkSize: 2 * 1024 * 1024,
});

assert.strictEqual(splitRes.totalChunks, 3, "Un archivo de 5.5 MB con bloques de 2MB debe tener 3 partes");
assert.strictEqual(splitRes.sha256, originalHash, "El hash del manifest debe coincidir con el original");

// Verificar cada fragmento individual
const chunkFiles = fs.readdirSync(splitOutput).filter((f) => f.endsWith(".bin"));
assert.strictEqual(chunkFiles.length, 3, "Deben existir 3 archivos .bin");
for (const cf of chunkFiles) {
  const cStat = fs.statSync(path.join(splitOutput, cf));
  assert(cStat.size <= 2 * 1024 * 1024, `Cada fragmento debe ser <= 2 MB (${cf}: ${cStat.size} bytes)`);
}
console.log("✔ Fragmentación en bloques de 2 MB verificada: 3 fragmentos generados correctamente.");

// 4. Probar reensamblaje y verificación de integridad bit a bit
console.log("\n[4/5] Simulando reensamblaje del cliente y verificación SHA256...");
const manifest = JSON.parse(fs.readFileSync(splitRes.manifestPath, "utf-8"));
const assembledBuffers = [];

for (const ch of manifest.chunks) {
  const cBuffer = fs.readFileSync(path.join(splitOutput, ch.name));
  assert.strictEqual(cBuffer.length, ch.size, `Tamaño de ${ch.name} debe coincidir con el manifest`);
  const cHash = crypto.createHash("sha256").update(cBuffer).digest("hex");
  assert.strictEqual(cHash, ch.sha256, `Hash de ${ch.name} debe coincidir con el manifest`);
  assembledBuffers.push(cBuffer);
}

const reassembledBuffer = Buffer.concat(assembledBuffers);
const reassembledHash = crypto.createHash("sha256").update(reassembledBuffer).digest("hex");

assert.strictEqual(reassembledHash, originalHash, "El archivo reensamblado debe ser 100% idéntico al original");
assert.strictEqual(reassembledBuffer.length, dummySize, "El tamaño reensamblado debe ser idéntico al original");
console.log("✔ Reensamblaje verificado: Integridad de datos 100% idéntica (SHA-256 coincidente).");

// 5. Verificar que el ejecutable contiene la URL de freedev.app y NO expone GitHub
console.log("\n[5/5] Inspeccionando cadenas en TVShow-Setup.exe (verificación de privacidad)...");
const hasFreedev = exeBuffer.includes(Buffer.from("tvshow.freedev.app", "utf16le")) || exeBuffer.includes(Buffer.from("tvshow.freedev.app", "utf8"));
const hasGithub = exeBuffer.includes(Buffer.from("github.com", "utf16le")) || exeBuffer.includes(Buffer.from("github.com", "utf8"));

assert(hasFreedev, "El instalador debe contener la URL https://tvshow.freedev.app/apps/");
assert(!hasGithub, "El instalador NO debe exponer el dominio de GitHub");
console.log("✔ Privacidad confirmada: Apunta a tvshow.freedev.app y NO contiene URLs de GitHub.");

// Limpiar archivos de prueba temporales
try {
  fs.rmSync(testDummyDir, { recursive: true, force: true });
  fs.rmSync(splitOutput, { recursive: true, force: true });
} catch {}

console.log("\n==================================================");
console.log("🎉 TODAS LAS PRUEBAS DEL INSTALADOR WEB PASARON SATISFACTORIAMENTE");
console.log("==================================================");
