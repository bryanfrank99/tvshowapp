// Script para crear y subir una etiqueta (tag) de versión a GitHub,
// lo que activa automáticamente el workflow de GitHub Actions para
// compilar el APK y publicar el nuevo Release con el archivo adjunto.
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const gitCmd = existsSync("C:\\Program Files\\Git\\cmd\\git.exe")
  ? '"C:\\Program Files\\Git\\cmd\\git.exe"'
  : "git";

try {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const version = pkg.version;
  const tag = `v${version}`;

  console.log(`\n========================================`);
  console.log(`🚀 INICIANDO PUBLICACIÓN DE RELEASE: ${tag}`);
  console.log(`========================================\n`);

  // 1. Asegurar que no haya cambios pendientes sin commitear
  const status = execSync(`${gitCmd} status --porcelain`, { cwd: root }).toString().trim();
  if (status) {
    console.log("Hay cambios sin commitear. Creando commit de preparación...");
    execSync(`${gitCmd} add -A`, { cwd: root });
    execSync(`${gitCmd} commit -m "chore: preparar release ${tag}"`, { cwd: root });
  }

  // 2. Subir commits pendientes a main
  console.log("Sincronizando rama main con GitHub...");
  execSync(`${gitCmd} push origin main`, { cwd: root, stdio: "inherit" });

  // 3. Crear el tag localmente (si ya existe, reemplazarlo o avisar)
  console.log(`Creando tag ${tag}...`);
  try {
    execSync(`${gitCmd} tag -a ${tag} -m "Release ${tag}"`, { cwd: root });
  } catch {
    console.log(`El tag ${tag} ya existía localmente, actualizándolo...`);
    execSync(`${gitCmd} tag -f -a ${tag} -m "Release ${tag}"`, { cwd: root });
  }

  // 4. Subir el tag a GitHub
  console.log(`Subiendo tag ${tag} a GitHub...`);
  execSync(`${gitCmd} push origin ${tag} --force`, { cwd: root, stdio: "inherit" });

  console.log(`\n============================================================`);
  console.log(`🎉 ¡TAG ${tag} ENVIADO EXITOSAMENTE A GITHUB!`);
  console.log(`GitHub Actions ha comenzado a compilar el APK en la nube.`);
  console.log(`\nPuedes monitorear el progreso del build en:`);
  console.log(`👉 https://github.com/bryanfrank99/tvshowapp/actions`);
  console.log(`\nTu nuevo Release y el APK estarán disponibles en:`);
  console.log(`👉 https://github.com/bryanfrank99/tvshowapp/releases`);
  console.log(`============================================================\n`);
} catch (err) {
  console.error("❌ Error al crear release:", err.message);
  process.exit(1);
}
