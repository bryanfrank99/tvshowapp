import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const f of [".env.local", ".env"]) {
  const p = join(root, f);
  if (existsSync(p)) {
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
    }
  }
}

function fillTemplate(tpl, id, s = 1, e = 1, key = "") {
  if (!tpl) return "";
  const idparam = id.startsWith("tt") ? `imdb=${id}` : `tmdb=${id}`;
  const tmdbflag = id.startsWith("tt") ? "" : "&tmdb=1";

  return tpl
    .split("{id}").join(id)
    .split("{s}").join(String(s))
    .split("{e}").join(String(e))
    .split("{key}").join(key)
    .split("{idparam}").join(idparam)
    .split("{tmdbflag}").join(tmdbflag);
}

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "es-ES,es;q=0.9,en;q=0.8,pt;q=0.7",
  "Sec-Fetch-Dest": "iframe",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "cross-site",
  "Upgrade-Insecure-Requests": "1",
};

async function runFullHealthCheck() {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_KEY || "";
  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
    return;
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: providers, error } = await sb
    .from("providers")
    .select("id, name, movie_tpl, tv_tpl, needs_tmdb, tv_ok, entry_key, active, ord")
    .order("ord");

  if (error || !providers) {
    console.error("Error fetching providers:", error);
    return;
  }

  console.log(`Checking ${providers.length} providers from Supabase...`);

  const defaultKey = process.env.VIMEUS_VIEW_KEY || "";

  const checkPromises = providers.map(async (p) => {
    const testId = p.needs_tmdb ? "550" : "tt0137523";
    const k = p.entry_key || defaultKey;
    const tpl = p.movie_tpl || p.tv_tpl || "";
    const testUrl = fillTemplate(tpl, testId, 1, 1, k);

    if (!testUrl || !testUrl.startsWith("http")) {
      return {
        id: p.id,
        name: p.name,
        ord: p.ord,
        active: !!p.active,
        latencyMs: 0,
        statusCode: null,
        status: "down",
        error: "Plantilla inválida o vacía",
        testUrl,
      };
    }

    const start = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      let res = null;
      let methodUsed = "HEAD";
      try {
        res = await fetch(testUrl, {
          method: "HEAD",
          signal: controller.signal,
          headers: BROWSER_HEADERS,
        });
      } catch {
        res = null;
      }

      if (!res || !res.ok) {
        try {
          methodUsed = "GET";
          const getRes = await fetch(testUrl, {
            method: "GET",
            signal: controller.signal,
            headers: BROWSER_HEADERS,
          });
          res = getRes;
          try {
            getRes.body?.cancel();
          } catch {}
        } catch (getErr) {
          if (!res) throw getErr;
        }
      }
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - start;
      const statusCode = res.status;

      let status = "healthy";
      let errorMsg = undefined;

      if (statusCode >= 500 || statusCode === 404) {
        status = "down";
        errorMsg = `HTTP ${statusCode}`;
      } else if (statusCode === 403 || statusCode === 429) {
        status = "degraded";
        errorMsg = statusCode === 403 ? "WAF / Protección Cloudflare" : "Rate limit (429)";
      } else if (statusCode >= 400) {
        status = "down";
        errorMsg = `HTTP ${statusCode}`;
      } else if (latencyMs > 1800) {
        status = "slow";
      }

      return {
        id: p.id,
        name: p.name,
        ord: p.ord,
        active: !!p.active,
        latencyMs,
        statusCode,
        status,
        methodUsed,
        testUrl: testUrl.split("?")[0],
        error: errorMsg,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err?.name === "AbortError" || String(err?.message).includes("abort");
      return {
        id: p.id,
        name: p.name,
        ord: p.ord,
        active: !!p.active,
        latencyMs: Date.now() - start,
        statusCode: null,
        status: "down",
        error: isTimeout ? "Timeout (>6s)" : err?.message || "Error de conexión",
        testUrl: testUrl.split("?")[0],
      };
    }
  });

  const results = await Promise.all(checkPromises);
  for (const r of results) {
    const icon = r.status === "healthy" ? "🟢" : r.status === "slow" ? "🟡" : r.status === "degraded" ? "🔵" : "🔴";
    console.log(`${icon} [${String(r.ord).padStart(2)}] ${r.id.padEnd(14)} (${r.name}): ${r.status.padEnd(8)} code=${String(r.statusCode).padEnd(4)} ${String(r.latencyMs + 'ms').padEnd(8)} via ${r.methodUsed || 'ERR'}`);
    if (r.error) console.log(`   └─ Error/Detalle: ${r.error}`);
    console.log(`   └─ URL: ${r.testUrl}`);
  }

  const summary = {
    total: results.length,
    healthy: results.filter((r) => r.status === "healthy").length,
    slow: results.filter((r) => r.status === "slow").length,
    degraded: results.filter((r) => r.status === "degraded").length,
    down: results.filter((r) => r.status === "down").length,
  };

  console.log("\n📊 RESUMEN:");
  console.log(`Total: ${summary.total} | Saludables: ${summary.healthy} | Lentos: ${summary.slow} | Degradados: ${summary.degraded} | Caídos: ${summary.down}`);
}

runFullHealthCheck();
