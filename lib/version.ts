import pkg from "@/package.json";

export function displayVersion() {
  const base = String((pkg as any).version || "6.17.0");
  const parts = base.split(".");
  const clean = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : base;
  return `v${clean}`;
}

