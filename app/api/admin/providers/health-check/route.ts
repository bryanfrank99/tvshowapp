// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/supa";
import { needAdmin } from "@/lib/access";
import { fillTemplate } from "@/lib/adapters/provider-adapter";

export const dynamic = "force-dynamic";

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
      .select("id, name, movie_tpl, tv_tpl, needs_tmdb, tv_ok, entry_key, active, ord")
      .order("ord");

    if (error || !providers) {
      return NextResponse.json({ error: "db", message: "Error consultando proveedores" }, { status: 500 });
    }

    const defaultKey = process.env.VIMEUS_VIEW_KEY || "";

    // Test en paralelo de cada servidor con timeout estricto de 4 segundos
    const checkPromises = providers.map(async (p: any) => {
      const testId = p.needs_tmdb ? "550" : "tt0137523";
      const key = p.entry_key || defaultKey;
      const testUrl = fillTemplate(p.movie_tpl, testId, 1, 1, key);

      if (!testUrl || !testUrl.startsWith("http")) {
        return {
          id: p.id,
          name: p.name,
          active: !!p.active,
          latencyMs: 0,
          statusCode: null,
          status: "down",
          error: "Plantilla inválida o vacía",
        };
      }

      const start = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      try {
        // Primero intentamos HEAD para no consumir ancho de banda
        let res: Response;
        try {
          res = await fetch(testUrl, {
            method: "HEAD",
            signal: controller.signal,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            },
          });
        } catch {
          // Muchos iframes bloquean HEAD; intentamos GET con Range de bytes mínimo
          res = await fetch(testUrl, {
            method: "GET",
            signal: controller.signal,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
              Range: "bytes=0-200",
            },
          });
        }
        clearTimeout(timeoutId);

        const latencyMs = Date.now() - start;
        const statusCode = res.status;

        // Categorización de estado
        let status: "healthy" | "slow" | "degraded" | "down" = "healthy";
        if (statusCode >= 500 || statusCode === 404) {
          status = "down";
        } else if (statusCode === 403) {
          // Si responde 403 suele ser Cloudflare/WAF bloqueando el scraper de Node, pero el servidor está online
          status = "degraded";
        } else if (latencyMs > 1800) {
          status = "slow";
        }

        return {
          id: p.id,
          name: p.name,
          active: !!p.active,
          latencyMs,
          statusCode,
          status,
          testUrl: testUrl.split("?")[0], // URL limpia sin tokens
        };
      } catch (err: any) {
        clearTimeout(timeoutId);
        const isTimeout = err?.name === "AbortError" || String(err?.message).includes("abort");
        return {
          id: p.id,
          name: p.name,
          active: !!p.active,
          latencyMs: Date.now() - start,
          statusCode: null,
          status: "down",
          error: isTimeout ? "Timeout (>4s)" : err?.message || "Error de conexión",
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
