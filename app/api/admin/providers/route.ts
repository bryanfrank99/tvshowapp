// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/supa";
import { needAdmin } from "@/lib/access";

// GET lista completa (con templates) · PUT upsert · PATCH toggle · DELETE
export async function GET(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;
  const sb = supa();
  const [p, c] = await Promise.all([
    sb.from("providers").select("*").order("ord"),
    sb.from("config").select("value").eq("key", "providers_version").maybeSingle(),
  ]);
  if (p.error) return NextResponse.json({ error: "db" }, { status: 500 });
  return NextResponse.json({ providers: p.data, version: c.data?.value || "" });
}

export async function PUT(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;
  let b: any = {};
  try { b = await req.json(); } catch {}
  if (!b.id || !b.name || !b.movie_tpl || !b.tv_tpl) {
    return NextResponse.json({ error: "params" }, { status: 400 });
  }
  const row = {
    id: String(b.id), name: String(b.name),
    movie_tpl: String(b.movie_tpl), tv_tpl: String(b.tv_tpl),
    needs_tmdb: !!b.needs_tmdb, tv_ok: !!b.tv_ok,
    entry_key: String(b.entry_key || ""),
    active: b.active !== false, ord: Number(b.ord) || 0,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supa().from("providers").upsert(row, { onConflict: "id" });
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  await bump();
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;
  let b: any = {};
  try { b = await req.json(); } catch {}
  if (!b.id) return NextResponse.json({ error: "params" }, { status: 400 });
  const patch: any = { updated_at: new Date().toISOString() };
  if (typeof b.active === "boolean") patch.active = b.active;
  const { error } = await supa().from("providers").update(patch).eq("id", b.id);
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  await bump();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "params" }, { status: 400 });
  const { error } = await supa().from("providers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  await bump();
  return NextResponse.json({ ok: true });
}

async function bump() {
  try {
    const sb = supa();
    const { data } = await sb.from("config").select("value").eq("key", "providers_version").maybeSingle();
    const v = String(Number(data?.value || 0) + 1);
    await sb.from("config").upsert({ key: "providers_version", value: v }, { onConflict: "key" });
  } catch {}
}




