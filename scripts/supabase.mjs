// Uso: node scripts/supabase.mjs ping | seed
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const f of [".env.local", ".env"]) {
  const p = join(root, f);
  if (existsSync(p)) for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const cmd = process.argv[2] || "ping";
const url = process.env.SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_KEY || "";
if (!url || !key) {
  console.error("Falta SUPABASE_URL / SUPABASE_SERVICE_KEY en .env.local");
  process.exit(1);
}
const h = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

if (cmd === "ping") {
  for (const tbl of ["access_codes", "providers", "admin_users"]) {
    const r = await fetch(`${url}/rest/v1/${tbl}?select=id&limit=1`, { headers: h });
    console.log(`${tbl}: HTTP ${r.status} ${r.ok ? "OK" : await r.text().then((t) => t.slice(0, 120))}`);
  }
} else if (cmd === "seed") {
  console.log("ℹ️ public/providers.json ha sido retirado. Los datos se gestionan directamente en Supabase.");
  console.log("Para inicializar tablas o esquemas, ejecuta el contenido de supabase/seed.sql en el SQL Editor de Supabase.");
}
