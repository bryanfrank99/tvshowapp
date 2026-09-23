// Mantiene y gestiona el incremento automático de versión para TVShow en cada commit.
// En package.json se guarda como SemVer de 3 partes (X.Y.0) para compatibilidad
// obligatoria con electron-builder, pero para el usuario y tags se maneja como vX.Y (ej. v7.1).
// Lo llama el hook pre-commit. Para saltar: SKIP_VERSION=1 git commit ...
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

if (process.env.SKIP_VERSION) process.exit(0);
const pkgPath = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const parts = String(pkg.version).split(".").map(Number);
const maj = Number.isInteger(parts[0]) ? parts[0] : 7;
const minor = Number.isInteger(parts[1]) ? parts[1] : 0;

// Incrementar automáticamente el segundo número en cada commit (7.0 -> 7.1 -> 7.2)
const nextMinor = minor + 1;
pkg.version = `${maj}.${nextMinor}.0`;

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`TVShow Version → ${pkg.version} (Display Tag: v${maj}.${nextMinor})`);

