import { NextRequest, NextResponse } from "next/server";

// Valida el Easter Egg en servidor: el secreto nunca sale al cliente.
export async function POST(req: NextRequest) {
  const expected = (process.env.EASTER_EGG || "").trim().toLowerCase();
  let answer = "";
  try {
    const j = await req.json();
    answer = String(j.answer || "").trim().toLowerCase();
  } catch {}
  const ok = !!expected && !!answer && answer === expected;
  return NextResponse.json({ ok });
}
