import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const DEFAULT_CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB

export function splitInstaller(options = {}) {
  const inputExe = options.inputExe || findInstallerExe();
  if (!inputExe || !fs.existsSync(inputExe)) {
    throw new Error(
      `No se encontró el instalador original para dividir. Especifica la ruta o compila la app primero con 'npm run electron:dist'.`
    );
  }

  const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
  const outputDir = path.resolve(options.outputDir || "dist/web-package");
  fs.mkdirSync(outputDir, { recursive: true });

  const inputStats = fs.statSync(inputExe);
  const totalSize = inputStats.size;
  const fileName = path.basename(inputExe);

  console.log(`[Splitter] Procesando: ${fileName} (${(totalSize / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`[Splitter] Tamaño de fragmento: ${(chunkSize / (1024 * 1024)).toFixed(2)} MB (2.097.152 bytes)`);

  const fileBuffer = fs.readFileSync(inputExe);
  const totalHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

  const totalChunks = Math.ceil(totalSize / chunkSize);
  const chunks = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, totalSize);
    const chunkBuffer = fileBuffer.subarray(start, end);

    const chunkName = `chunk_${String(i + 1).padStart(3, "0")}.bin`;
    const chunkPath = path.join(outputDir, chunkName);
    const chunkHash = crypto.createHash("sha256").update(chunkBuffer).digest("hex");

    fs.writeFileSync(chunkPath, chunkBuffer);

    chunks.push({
      name: chunkName,
      size: chunkBuffer.length,
      sha256: chunkHash,
    });
  }

  // Leer versión del package.json
  let version = "7.15.0";
  try {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
    if (pkg.version) version = pkg.version;
  } catch {}

  const manifest = {
    app: "TVShow",
    version,
    targetFile: fileName,
    totalSize,
    chunkSize,
    totalChunks,
    sha256: totalHash,
    createdAt: new Date().toISOString(),
    chunks,
  };

  const manifestPath = path.join(outputDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  console.log(`\n✔ Fragmentación completada exitosamente:`);
  console.log(`  - Fragmentos generados: ${totalChunks} archivos .bin`);
  console.log(`  - Manifiesto generado: ${manifestPath}`);
  console.log(`  - Carpeta de salida: ${outputDir}`);

  return {
    outputDir,
    manifestPath,
    totalChunks,
    totalSize,
    sha256: totalHash,
  };
}

function findInstallerExe() {
  if (process.argv[2] && fs.existsSync(process.argv[2])) {
    return path.resolve(process.argv[2]);
  }

  // Buscar el archivo instalador más pesado en dist/ que no sea TVShow-Setup.exe web
  const distDir = path.resolve("dist");
  if (!fs.existsSync(distDir)) return null;

  const files = fs.readdirSync(distDir);
  let bestCandidate = null;
  let maxBytes = 10 * 1024 * 1024; // Mínimo 10 MB para ser el instalador completo

  for (const f of files) {
    if (f.toLowerCase().endsWith(".exe") && !f.toLowerCase().includes("web")) {
      const fullPath = path.join(distDir, f);
      const st = fs.statSync(fullPath);
      if (st.size > maxBytes) {
        maxBytes = st.size;
        bestCandidate = fullPath;
      }
    }
  }

  return bestCandidate;
}

// Si se ejecuta directo por terminal
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve("scripts/split-installer.mjs")) {
  try {
    splitInstaller();
  } catch (err) {
    console.error(`[Splitter Error] ${err.message}`);
    process.exit(1);
  }
}
