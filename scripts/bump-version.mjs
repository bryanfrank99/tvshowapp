// Mantiene y gestiona el formato estándar de versión de 2 números: vX.Y (ej. v6.16).
// Lo llama el hook pre-commit. Para saltar: SKIP_VERSION=1 git commit ...
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

if (process.env.SKIP_VERSION) process.exit(0);
const pkgPath = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const parts = String(pkg.version).split(".").map(Number);
const maj = Number.isInteger(parts[0]) ? parts[0] : 6;
const minor = Number.isInteger(parts[1]) ? parts[1] : 16;

// Asegurar formato de 2 números (vX.Y, ej: 6.16) y limpiar cualquier 3er número no deseado
if (parts.length >= 3) {
  pkg.version = `${maj}.${minor}`;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
} else if (process.env.BUMP_VERSION) {
  pkg.version = `${maj}.${minor + 1}`;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}

console.log(`version → ${pkg.version}`);
