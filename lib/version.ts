import pkg from "@/package.json";
import { execSync } from "child_process";

export function displayVersion() {
  const base = String((pkg as any).version || "0.0");
  let hash = "";
  try {
    hash = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "").slice(0, 7);
  } catch {}
  if (!hash) {
    try {
      hash = execSync("git rev-parse --short HEAD").toString().trim().slice(0, 7);
    } catch {
      hash = "";
    }
  }
  return `v${base}` + (hash ? `.d${hash}` : "");
}
