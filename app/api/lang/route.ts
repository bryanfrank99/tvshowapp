import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const lang = body.lang === "en" ? "en" : body.lang === "es" ? "es" : "pt";
    const res = NextResponse.json({ ok: true, lang });
    res.cookies.set("tvshow_lang", lang, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
