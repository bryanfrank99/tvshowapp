// Sube patch (x.y.Z+1) en package.json. Lo llama el hook pre-commit.
// Saltar con: SKIP_VERSION=1 git commit ...
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

if (process.env.SKIP_VERSION) process.exit(0);
const pkgPath = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const [maj, min, pat] = String(pkg.version).split(".").map(Number);
pkg.version = `${maj}.${min}.${(pat || 0) + 1}`;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`version → ${pkg.version}`);
