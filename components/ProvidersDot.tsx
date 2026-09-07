"use client";
import { useEffect, useState } from "react";
import { fetchProviders, fetchLiveSources } from "@/lib/providers";

type Status = { state: "checking" | "online" | "local"; count?: number; version?: string };

// Píldora de estado del JSON remoto (para la página de búsqueda).
export default function ProvidersDot({ label, dotOnly = false }: { label?: string; dotOnly?: boolean }) {
  const [st, setSt] = useState<Status>({ state: "checking" });

  useEffect(() => {
    let alive = true;
    const to = setTimeout(() => { if (alive) setSt({ state: "local" }); }, 10000);
    Promise.all([fetchProviders().catch(() => null), fetchLiveSources().catch(() => [])])
      .then(([prov, live]) => {
        clearTimeout(to);
        if (!alive) return;
        if (prov && prov.list.length) {
          setSt({ state: "online", count: prov.list.length + live.length, version: prov.version });
        } else {
          setSt({ state: "local" });
        }
      })
      .catch(() => { if (alive) setSt({ state: "local" }); });
    return () => { alive = false; clearTimeout(to); };
  }, []);

  return (
    <span
      title={st.state === "online" ? `Lista v${st.version || "?"} en línea (${st.count} entradas)` : "Sin conexión al JSON remoto"}
      className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap"
    >
      <span className={`w-2 h-2 rounded-full ${
        st.state === "online" ? "bg-emerald-400" : st.state === "local" ? "bg-red-400" : "bg-yellow-400 animate-pulse"
      }`} />
      <span className="text-zinc-400">
        {!dotOnly && label && <span className="mr-1.5">{label}</span>}
        {!dotOnly && (st.state === "online" ? `(${st.count})${st.version ? ` v${st.version}` : ""}` : st.state === "local" ? "sin lista" : "···")}
      </span>
    </span>
  );
}
