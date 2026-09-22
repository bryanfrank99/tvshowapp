import pkg from "@/package.json";

export function displayVersion() {
  const base = String((pkg as any).version || "7.0.0");
  const parts = base.split(".");
  const clean = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : base;
  return `v${clean}`;
}

