// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/supa";
import { needAdmin } from "@/lib/access";

// GET/PUT/DELETE fuentes live (misma forma que providers, tabla live_sources).
export async function GET(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;
  const { data, error } = await supa().from("live_sources").select("*").order("ord");
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  return NextResponse.json({ live: data });
}

export async function PUT(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;
  let b: any = {};
  try { b = await req.json(); } catch {}
  if (!b.id || !b.name || !b.format || !b.list) {
    return NextResponse.json({ error: "params" }, { status: 400 });
  }
  const { error } = await supa().from("live_sources").upsert({
    id: String(b.id), name: String(b.name), format: String(b.format),
    list: String(b.list), active: b.active !== false, ord: Number(b.ord) || 0,
  }, { onConflict: "id" });
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;
  let b: any = {};
  try { b = await req.json(); } catch {}
  if (!b.id) return NextResponse.json({ error: "params" }, { status: 400 });
  const patch: any = {};
  if (typeof b.active === "boolean") patch.active = b.active;
  const { error } = await supa().from("live_sources").update(patch).eq("id", b.id);
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "params" }, { status: 400 });
  const { error } = await supa().from("live_sources").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  return NextResponse.json({ ok: true });
}




