"use client";

const CODE_KEY = "tvshow_code";
const REF_KEY = "tvshow_ref_code";

let inflight: Promise<boolean> | null = null;

export function getStoredCode(): string {
  try { return localStorage.getItem(CODE_KEY) || ""; } catch { return ""; }
}
export function clearStoredCode() {
  try { localStorage.removeItem(CODE_KEY); } catch {}
}

// Intenta re-autenticar silenciosamente si el cookie se perdió pero hay code en LS.
export function ensureSession(): Promise<boolean> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const r = await fetch("/api/access", { cache: "no-store" });
      if (r.ok) return true;
      if (r.status !== 401) return false;
      const code = getStoredCode();
      if (!code) return false;
      const pr = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!pr.ok) {
        // Revoked/expired → limpiar para que gate muestre mensaje correcto
        try {
          const j = await pr.json();
          if (j.error === "revoked" || j.error === "expired") {
            try { if (j.ref_code) localStorage.setItem(REF_KEY, j.ref_code); } catch {}
            clearStoredCode();
            // No borrar ref_code: el gate lo muestra
          }
        } catch {}
        // Invalid/rate: no borrar, reintento humano
        return false;
      }
      try {
        const j = await pr.json();
        if (j.ref_code) try { localStorage.setItem(REF_KEY, j.ref_code); } catch {}
      } catch {}
      return true;
    } catch {
      return false;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
