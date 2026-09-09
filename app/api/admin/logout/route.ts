import { NextRequest, NextResponse } from "next/server";
import { destroyAdminSession, ADMIN_COOKIE } from "@/lib/access";

export async function DELETE(req: NextRequest) {
  await destroyAdminSession(req.cookies.get(ADMIN_COOKIE)?.value);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
