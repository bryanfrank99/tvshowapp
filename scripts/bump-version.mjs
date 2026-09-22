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
const maj = Number.isInteger(parts[0]) ? parts[0] : 6;
const minor = Number.isInteger(parts[1]) ? parts[1] : 16;
const patch = Number.isInteger(parts[2]) ? parts[2] + 1 : 0;
pkg.version = `${maj}.${minor}.${patch}`;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`version → ${pkg.version}`);
