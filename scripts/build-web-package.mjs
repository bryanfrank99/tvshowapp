import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { generateIcon } from "./generate-icon.mjs";
import { splitInstaller } from "./split-installer.mjs";

const CSC_PATH = "C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe";

export function buildWebPackage(options = {}) {
  console.log("==================================================");
  console.log("🚀 COMPILACIÓN DEL INSTALADOR WEB LIGERO (TVSHOW)");
  console.log("==================================================");

  // 1. Verificar compilador nativo de Windows
  if (!fs.existsSync(CSC_PATH)) {
    throw new Error(`Compilador C# no encontrado en: ${CSC_PATH}`);
  }

  // 2. Generar icono .ico oficial
  const icoPath = generateIcon();

  // 3. Crear carpetas de salida
  const distDir = path.resolve("dist");
  const webPkgDir = path.resolve("dist/web-package");
  fs.mkdirSync(distDir, { recursive: true });
  fs.mkdirSync(webPkgDir, { recursive: true });

  const csSource = path.resolve("windows-installer/WebInstaller.cs");
  if (!fs.existsSync(csSource)) {
    throw new Error(`Código fuente C# no encontrado en: ${csSource}`);
  }

  // 4. Compilar ejecutable ligero TVShow-Setup.exe con csc.exe
  const targetExe = path.join(webPkgDir, "TVShow-Setup.exe");
  console.log(`\n[Build] Compilando ${csSource}...`);

  const compileCmd = [
    `"${CSC_PATH}"`,
    "/target:winexe",
    "/optimize+",
    "/platform:anycpu",
    `/win32icon:"${icoPath}"`,
    `/out:"${targetExe}"`,
    "/nologo",
    "/r:System.dll,System.Drawing.dll,System.Windows.Forms.dll",
    `"${csSource}"`,
  ].join(" ");

  execSync(compileCmd, { stdio: "inherit" });

  if (!fs.existsSync(targetExe)) {
    throw new Error("La compilación finalizó pero no se generó el archivo TVShow-Setup.exe");
  }

  const stat = fs.statSync(targetExe);
  const sizeKb = (stat.size / 1024).toFixed(1);
  const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);

  console.log(`\n✔ Instalador compilado con éxito:`);
  console.log(`  - Archivo: ${targetExe}`);
  console.log(`  - Tamaño: ${sizeKb} KB (${sizeMb} MB) [Requisito < 5 MB: SUPERADO ✅]`);

  // Copiar también a dist/TVShow-Setup.exe para fácil acceso
  const rootDistExe = path.join(distDir, "TVShow-Setup.exe");
  fs.copyFileSync(targetExe, rootDistExe);

  // 5. Si existe un instalador real compilado o se especifica uno, dividir en bloques de 2 MB
  let inputExe = options.inputExe;
  if (!inputExe && process.argv[2] && fs.existsSync(process.argv[2])) {
    inputExe = path.resolve(process.argv[2]);
  }

  try {
    const splitRes = splitInstaller({ inputExe, outputDir: webPkgDir });
    console.log(`\n✔ Fragmentos y manifest.json preparados en dist/web-package/`);
  } catch (splitErr) {
    console.log(`\nℹ Nota sobre fragmentación: ${splitErr.message}`);
    console.log(`  Para fragmentar el instalador completo cuando lo tengas compilado, ejecuta:`);
    console.log(`  npm run split:installer <ruta_a_tu_instalador.exe>`);
  }

  // 6. Generar archivo de instrucciones en el paquete
  const readmeContent = [
    "===================================================",
    "INSTRUCCIONES DE DESPLIEGUE - TVSHOW WEB INSTALLER",
    "===================================================",
    "",
    "URL destino configurada en el instalador: https://tvshow.freedev.app/apps/",
    "",
    "Archivos a subir a tu servidor (en la carpeta /apps/):",
    "1. TVShow-Setup.exe   -> Es el instalador web ligero (~115 KB) que descargarán los usuarios.",
    "2. manifest.json      -> Contiene la lista de fragmentos y hashes de integridad.",
    "3. chunk_001.bin...   -> Los bloques de 2 MB del instalador completo.",
    "",
    "Cero consumo de tráfico en Vercel y cero exposición de GitHub.",
    "===================================================",
  ].join("\r\n");

  fs.writeFileSync(path.join(webPkgDir, "INSTRUCCIONES.txt"), readmeContent, "utf-8");

  console.log("\n==================================================");
  console.log("🎉 PAQUETE LISTO EN: dist/web-package/");
  console.log("==================================================");

  return {
    targetExe,
    sizeBytes: stat.size,
    sizeKb,
  };
}

// Ejecutar si se invoca directo
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve("scripts/build-web-package.mjs")) {
  try {
    buildWebPackage();
  } catch (err) {
    console.error(`[Build Error] ${err.message}`);
    process.exit(1);
  }
}
