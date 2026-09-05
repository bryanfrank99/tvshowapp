"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { providersUrl } from "@/lib/providers";

type Status = { state: "checking" | "online" | "local"; count?: number };

export default function Header() {
  const r = useRouter();
  const [q, setQ] = useState("");
  const [st, setSt] = useState<Status>({ state: "checking" });

  // Detector: ¿responde el JSON remoto de proveedores?
  useEffect(() => {
    let alive = true;
    const url = providersUrl();
    // 1) caché fresca (1h) = en línea sin gastar petición
    try {
      const raw = localStorage.getItem("tvshow_providers_cache_v1");
      if (raw) {
        const c = JSON.parse(raw);
        if (c.t + 3600 * 1000 > Date.now() && Array.isArray(c.list) && c.list.length) {
          setSt({ state: "online", count: c.list.length });
          return;
        }
      }
    } catch {}
    // 2) ping directo con timeout
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 8000);
    fetch(url, { cache: "no-store", signal: ctrl.signal })
      .then((res) => {
        clearTimeout(to);
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((j) => {
        const n = Array.isArray(j) ? j.length : j.providers?.length || 0;
        if (alive) setSt(n ? { state: "online", count: n } : { state: "local" });
      })
      .catch(() => { if (alive) setSt({ state: "local" }); });
    return () => { alive = false; clearTimeout(to); };
  }, []);

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-[#0b0b10]/85 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        <a href="/" className="text-xl font-black">TV<span className="text-violet-400">SHOW</span></a>
        <form className="flex-1 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (q.trim()) r.push(`/search?q=${encodeURIComponent(q.trim())}`); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar película, serie o persona..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-violet-400" />
          <button className="bg-violet-600 hover:bg-violet-500 rounded-xl px-4 py-2 font-semibold">Buscar</button>
        </form>
        <span
          title={st.state === "online" ? `Servidor de proveedores en línea (${st.count} servidores)` : st.state === "local" ? "Sin conexión al JSON remoto: usando lista integrada" : "Verificando servidor de proveedores…"}
          className="hidden sm:flex items-center gap-1.5 text-xs whitespace-nowrap"
        >
          <span className={`w-2 h-2 rounded-full ${
            st.state === "online" ? "bg-emerald-400" : st.state === "local" ? "bg-red-400" : "bg-yellow-400 animate-pulse"
          }`} />
          <span className="text-zinc-400">
            {st.state === "online" ? `Servidores (${st.count})` : st.state === "local" ? "Servidores local" : "···"}
          </span>
        </span>
      </div>
    </header>
  );
}
