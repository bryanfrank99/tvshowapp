// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/supa";
import { needAdmin } from "@/lib/access";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const maxDuration = 30;

/**
 * GET /api/admin/live/health-check
 *
 * Diagnóstico automático de salud y latencia de todas las fuentes de TV en vivo.
 * Requiere permisos de Administrador o SuperAdmin.
 */
export async function GET(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;

  try {
    let sources: any[] = [];
    try {
      const { data, error } = await supa().from("live_sources").select("*").order("ord");
      if (!error && data && data.length > 0) {
        sources = data;
      }
    } catch {}

    if (!sources.length) {
      // Fallback a public/providers.json
      try {
        const fs = await import("fs/promises");
        const path = await import("path");
        const raw = await fs.readFile(path.join(process.cwd(), "public/providers.json"), "utf8");
        const parsed = JSON.parse(raw);
        sources = (parsed.live || []).map((l: any, i: number) => ({
          ...l,
          list_url: l.list,
          ord: l.ord || i + 1,
          active: l.active !== false,
        }));
      } catch {}
    }

    const checkPromises = sources.map(async (s: any) => {
      const id = String(s.id || "").trim();
      const name = String(s.name || "").trim();
      const ord = typeof s.ord === "number" ? s.ord : Number(s.ord) || 0;
      const format = String(s.format || "").trim();
      const active = s.active !== false;
      const targetUrl = s.list_url || s.list;

      if (!targetUrl || !targetUrl.startsWith("http")) {
        return {
          id,
          name,
          ord,
          format,
          active,
          latencyMs: 0,
          status: "down",
          error: "URL no configurada o inválida",
        };
      }

      const start = Date.now();
      const timeoutMs = active ? 5000 : 2500;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(targetUrl, {
          method: "GET",
          signal: controller.signal,
          headers: {
            "User-Agent": "TVShow/7.34 (+https://tvshowapp.net)",
            "Accept": "application/json, text/plain, */*",
          },
        });
        clearTimeout(timeoutId);
        const latencyMs = Date.now() - start;

        if (res.ok) {
          return {
            id,
            name,
            ord,
            format,
            active,
            latencyMs,
            statusCode: res.status,
            status: latencyMs > 2500 ? "slow" : "healthy",
          };
        } else {
          return {
            id,
            name,
            ord,
            format,
            active,
            latencyMs,
            statusCode: res.status,
            status: "down",
            error: `HTTP ${res.status}`,
          };
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        const latencyMs = Date.now() - start;
        const isTimeout = err?.name === "AbortError" || String(err?.message).includes("abort");
        return {
          id,
          name,
          ord,
          format,
          active,
          latencyMs: isTimeout ? timeoutMs : latencyMs,
          statusCode: null,
          status: "down",
          error: isTimeout ? `Timeout (${timeoutMs}ms)` : (err?.message || "Error de conexión"),
        };
      }
    });

    const resultsArray = await Promise.all(checkPromises);
    const results: Record<string, any> = {};
    for (const r of resultsArray) {
      results[r.id] = r;
    }

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      results,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "server_error", message: e?.message }, { status: 500 });
  }
}
