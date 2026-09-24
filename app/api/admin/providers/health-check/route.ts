// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/supa";
import { needAdmin } from "@/lib/access";
import { fillTemplate } from "@/lib/adapters/provider-adapter";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const maxDuration = 30;

/**
 * GET /api/admin/providers/health-check
 *
 * Diagnóstico automático de salud y latencia de todos los servidores registrados en Supabase.
 * Requiere permisos de Administrador o SuperAdmin.
 */
export async function GET(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;

  try {
    const sb = supa();
    const { data: providers, error } = await sb
      .from("providers")
      .select("*")
      .order("ord");

    if (error || !providers) {
      return NextResponse.json({ error: "db", message: "Error consultando proveedores" }, { status: 500 });
    }

    const defaultKey = process.env.VIMEUS_VIEW_KEY || "";

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

    // Test en paralelo de cada servidor con timeout optimizado (4s activos / 2s inactivos) y fallback resiliente
    const checkPromises = providers.map(async (p: any) => {
      const provId = String(p.id || "").trim();
      const provName = String(p.name || "").trim();
      const provOrd = typeof p.ord === "number" ? p.ord : Number(p.ord) || 0;
      const isActive = !!p.active;

      const testId = p.needs_tmdb ? "550" : "tt0137523";
      const key = p.entry_key || defaultKey;
      const tpl = p.movie_tpl || p.tv_tpl || "";
      const testUrl = fillTemplate(tpl, testId, 1, 1, key, "es");

      if (!testUrl || !testUrl.startsWith("http")) {
        return {
          id: provId,
          name: provName,
          ord: provOrd,
          active: isActive,
          latencyMs: 0,
          statusCode: null,
          status: "down",
          error: "Plantilla inválida o vacía",
        };
      }

      const start = Date.now();
      const timeoutMs = isActive ? 4000 : 2000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        let res: Response | null = null;
        let methodUsed = "HEAD";
        let fetchError: any = null;

        // Primero intentamos HEAD para no consumir ancho de banda
        try {
          res = await fetch(testUrl, {
            method: "HEAD",
            signal: controller.signal,
            headers: BROWSER_HEADERS,
          });
        } catch (err: any) {
          fetchError = err;
          res = null;
        }

        // Si HEAD fue bloqueado (403 WAF), no soportado (405, 501), o falló sin abort
        // reintentamos inmediatamente con GET navegacional solo si el controller no fue abortado
        if (!controller.signal.aborted && (!res || res.status === 405 || res.status === 501 || res.status === 403)) {
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
            if (!res) fetchError = getErr;
          }
        }
        clearTimeout(timeoutId);

        if (!res) {
          throw fetchError || new Error("No response");
        }

        const latencyMs = Date.now() - start;
        const statusCode = res.status;

        // Categorización de estado
        let status: "healthy" | "slow" | "degraded" | "down" = "healthy";
        let errorMsg: string | undefined = undefined;

        if (statusCode >= 500 || statusCode === 404) {
          status = "down";
          errorMsg = `HTTP ${statusCode}`;
        } else if (statusCode === 403 || statusCode === 429) {
          // Si responde 403 suele ser Cloudflare/WAF bloqueando el scraper de Node, pero el servidor está online
          status = "degraded";
          errorMsg = statusCode === 403 ? "WAF / Protección Cloudflare" : "Rate limit (429)";
        } else if (statusCode >= 400) {
          status = "down";
          errorMsg = `HTTP ${statusCode}`;
        } else if (latencyMs > 1800) {
          status = "slow";
        }

        return {
          id: provId,
          name: provName,
          ord: provOrd,
          active: isActive,
          latencyMs,
          statusCode,
          status,
          methodUsed,
          testUrl: testUrl.split("?")[0], // URL limpia sin tokens
          error: errorMsg,
        };
      } catch (err: any) {
        clearTimeout(timeoutId);
        const isTimeout = err?.name === "AbortError" || String(err?.message).includes("abort") || controller.signal.aborted;
        return {
          id: provId,
          name: provName,
          ord: provOrd,
          active: isActive,
          latencyMs: Date.now() - start,
          statusCode: null,
          status: "down",
          error: isTimeout ? `Timeout (>${timeoutMs / 1000}s)` : err?.message || "Error de conexión",
        };
      }
    });

    const results = await Promise.all(checkPromises);

    const summary = {
      total: results.length,
      healthy: results.filter((r) => r.status === "healthy").length,
      slow: results.filter((r) => r.status === "slow").length,
      degraded: results.filter((r) => r.status === "degraded").length,
      down: results.filter((r) => r.status === "down").length,
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "server_error", message: String(err?.message || err) },
      { status: 500 }
    );
  }
}
