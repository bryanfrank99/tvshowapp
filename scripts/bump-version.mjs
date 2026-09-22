// Mantiene y gestiona el formato estándar de versión para TVShow.
// En package.json se guarda como SemVer de 3 partes (X.Y.0) para compatibilidad
// obligatoria con electron-builder, pero para el usuario y tags se maneja como vX.Y (ej. v6.17).
// Lo llama el hook pre-commit. Para saltar: SKIP_VERSION=1 git commit ...
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

if (process.env.SKIP_VERSION) process.exit(0);
const pkgPath = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const parts = String(pkg.version).split(".").map(Number);
const maj = Number.isInteger(parts[0]) ? parts[0] : 7;
let minor = Number.isInteger(parts[1]) ? parts[1] : 0;

if (process.env.BUMP_VERSION) {
  minor += 1;
}

// electron-builder exige SemVer X.Y.Z (ej. 6.17.0)
const semverVersion = `${maj}.${minor}.0`;
if (pkg.version !== semverVersion) {
  pkg.version = semverVersion;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}

console.log(`TVShow Version → ${pkg.version} (Display Tag: v${maj}.${minor})`);
