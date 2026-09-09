import { NextResponse } from "next/server";
import { supa } from "@/lib/supa";

// Diagnóstico Supabase: sin exponer claves.
export async function GET() {
  try {
    const sb = supa();
    const checks: Record<string, boolean> = {};
    for (const tbl of ["access_codes", "providers", "admin_users"]) {
      try {
        const { error } = await sb.from(tbl as any).select("id").limit(1);
        checks[tbl] = !error;
      } catch {
        checks[tbl] = false;
      }
    }
    return NextResponse.json({ supabase: true, tables: checks });
  } catch (e: any) {
    return NextResponse.json({ supabase: false, error: String(e?.message || e) }, { status: 502 });
  }
}
