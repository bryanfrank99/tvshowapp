import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const j = JSON.parse(readFileSync(join(root, "public", "providers.json"), "utf8"));
const q = (s) => "'" + String(s ?? "").replace(/'/g, "''") + "'";
let sql = "-- Seed inicial (generado desde public/providers.json)\n";
j.providers.forEach((p, i) => {
  sql += `insert into providers (id,name,movie_tpl,tv_tpl,needs_tmdb,tv_ok,entry_key,active,ord) values (${q(p.id)},${q(p.name)},${q(p.movie)},${q(p.tv)},${!!p.needsTmdb},${!!p.tvOk},${q(p.key || "")},true,${i}) on conflict (id) do nothing;\n`;
});
(j.live || []).forEach((l, i) => {
  sql += `insert into live_sources (id,name,format,list_url,active,ord) values (${q(l.id)},${q(l.name)},${q(l.format)},${q(l.list)},true,${i}) on conflict (id) do nothing;\n`;
});
sql += `insert into config (key,value) values ('providers_version',${q(j.version || 1)}) on conflict (key) do update set value=excluded.value;\n`;
writeFileSync(join(root, "supabase", "seed.sql"), sql);
console.log("SEED OK");
