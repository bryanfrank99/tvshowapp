// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/supa";
import { needAdmin } from "@/lib/access";
import { sha } from "@/lib/access";
import { randomBytes } from "crypto";

const newCode = () => randomBytes(4).toString("hex").toUpperCase(); // 8 chars

// GET lista · POST {label, days} crea · PATCH {id, revoked} · DELETE ?id=
export async function GET(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;
  const { data, error } = await supa()
    .from("access_codes")
    .select("id,label,expires_at,revoked,created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  return NextResponse.json({ codes: data });
}

export async function POST(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;
  let body: any = {};
  try { body = await req.json(); } catch {}
  const days = Math.max(1, Math.min(3650, Number(body.days) || 30));
  const code = newCode();
  const expires_at = new Date(Date.now() + days * 86400 * 1000).toISOString();
  const { error } = await supa().from("access_codes").insert({
    code_hash: sha(code),
    label: String(body.label || ""),
    expires_at,
  });
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  // Se muestra UNA vez: el hash es irreversible.
  return NextResponse.json({ code, expires_at });
}

export async function PATCH(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;
  let body: any = {};
  try { body = await req.json(); } catch {}
  if (!body.id) return NextResponse.json({ error: "params" }, { status: 400 });
  if (body.renew) {
    const days = Math.max(1, Math.min(3650, Number(body.days) || 30));
    const code = newCode();
    const expires_at = new Date(Date.now() + days * 86400 * 1000).toISOString();
    const { error } = await supa().from("access_codes").update({ code_hash: sha(code), expires_at, revoked: false }).eq("id", body.id);
    if (error) return NextResponse.json({ error: "db" }, { status: 500 });
    return NextResponse.json({ code, expires_at });
  }
  if (body.extendDays) {
    const days = Math.max(1, Math.min(3650, Number(body.extendDays) || 30));
    const { data } = await supa().from("access_codes").select("expires_at").eq("id", body.id).maybeSingle();
    const base = data?.expires_at ? new Date(data.expires_at).getTime() : Date.now();
    const expires_at = new Date(Math.max(base, Date.now()) + days * 86400 * 1000).toISOString();
    const { error } = await supa().from("access_codes").update({ expires_at, revoked: false }).eq("id", body.id);
    if (error) return NextResponse.json({ error: "db" }, { status: 500 });
    return NextResponse.json({ ok: true, expires_at });
  }
  const { error } = await supa().from("access_codes").update({ revoked: !!body.revoked }).eq("id", body.id);
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const deny = await needAdmin(req);
  if (deny) return deny;
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "params" }, { status: 400 });
  const { error } = await supa().from("access_codes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  return NextResponse.json({ ok: true });
}




