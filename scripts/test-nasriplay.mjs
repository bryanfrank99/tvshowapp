import fs from "fs";
import dotenv from "dotenv";

if (fs.existsSync(".env.local")) {
  const envConfig = dotenv.parse(fs.readFileSync(".env.local"));
  for (const k in envConfig) process.env[k] = envConfig[k];
}

async function debugResolve() {
  const { supa } = await import("../lib/supa");
  const { sha, newToken } = await import("../lib/access");
  const sb = supa();

  const { data: code } = await sb.from("access_codes").select("*").eq("revoked", false).gt("expires_at", new Date().toISOString()).limit(1).single();

  const token = newToken();
  const tokenHash = sha(token);
  await sb.from("sessions").insert({
    token_hash: tokenHash,
    code_id: code.id,
    device_hint: "Test Script",
  });
  console.log("Created test session token:", token.slice(0, 10) + "...");

  const { GET } = await import("../app/api/resolve/route");
  const { NextRequest } = await import("next/server");

  const req = new NextRequest("http://localhost:3000/api/resolve?type=movie&id=550&lang=es", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const res = await GET(req);
  console.log("Resolve Status:", res.status);
  const data = await res.json();
  console.log("Total sources returned:", data?.sources?.length);
  const s17Sources = (data?.sources || []).filter((s) => s.providerId === "nasriplay" || s.ord === 17);
  console.log(`Sources devueltas para S17 (${s17Sources.length}):`);
  for (const s of s17Sources) {
    console.log(`  * ID: ${s.id} | Tipo: ${s.type} | Name: ${s.providerName} | RealName: ${s.realName} | Priority: ${s.priority} | URL: ${s.url.slice(0, 80)}...`);
    if (s.embedOptions) {
      console.log(`    embedOptions (${s.embedOptions.length}):`);
      for (const emb of s.embedOptions) {
        console.log(`      - [${emb.name}] ${emb.host}: ${emb.url.slice(0, 70)}...`);
      }
    }
  }

  // Clean up test session
  await sb.from("sessions").delete().eq("token_hash", tokenHash);
}

debugResolve().catch(console.error);
