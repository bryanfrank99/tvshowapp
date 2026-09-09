// Cliente Supabase SOLO-servidor (service_role, nunca al cliente).
import { createClient } from "@supabase/supabase-js";

let admin: ReturnType<typeof createClient> | null = null;

export function supa() {
  if (!admin) {
    const url = process.env.SUPABASE_URL || "";
    const key = process.env.SUPABASE_SERVICE_KEY || "";
    if (!url || !key) throw new Error("NO_SUPABASE");
    admin = createClient(url, key, { auth: { persistSession: false } });
  }
  return admin;
}
