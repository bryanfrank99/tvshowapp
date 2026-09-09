// Sube el segundo número (X.Y+1) en package.json. Lo llama el hook pre-commit.
// El hash se añade solo en visualización: vX.Y.d<hash> (no se guarda en el json).
// Saltar con: SKIP_VERSION=1 git commit ...
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

if (process.env.SKIP_VERSION) process.exit(0);
const pkgPath = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const parts = String(pkg.version).split(".").map(Number);
const maj = parts[0] || 5;
const minor = parts.length === 2 ? (parts[1] || 0) : (parts[1] || 0);
// Migrar 3 números a 2: 5.0.18 -> 5.18
const nextMinor = parts.length === 3 ? (parts[2] || 0) + 1 : minor + 1;
pkg.version = `${maj}.${nextMinor}`;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`version → ${pkg.version}`);
