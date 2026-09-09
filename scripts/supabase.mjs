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
  const j = JSON.parse(readFileSync(join(root, "public", "providers.json"), "utf8"));
  for (const p of j.providers || []) {
    const r = await fetch(`${url}/rest/v1/providers`, {
      method: "POST", headers: { ...h, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ id: p.id, name: p.name, movie_tpl: p.movie, tv_tpl: p.tv, needs_tmdb: !!p.needsTmdb, tv_ok: !!p.tvOk, entry_key: p.key || "", active: true, ord: 0 }),
    });
    console.log(`provider ${p.id}: ${r.status}`);
  }
  for (const l of j.live || []) {
    const r = await fetch(`${url}/rest/v1/live_sources`, {
      method: "POST", headers: { ...h, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ id: l.id, name: l.name, format: l.format, list_url: l.list, active: true, ord: 0 }),
    });
    console.log(`live ${l.id}: ${r.status}`);
  }
  await fetch(`${url}/rest/v1/config`, {
    method: "POST", headers: { ...h, Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ key: "providers_version", value: String(j.version || "1") }),
  });
  console.log("seed done");
}
