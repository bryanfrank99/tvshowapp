"use client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { providersUrl } from "@/lib/providers";

type Status = { state: "checking" | "online" | "local"; count?: number; version?: string };

const MENU = [
  { href: "/", label: "INICIO" },
  { href: "/movies", label: "PELÍCULAS" },
  { href: "/series", label: "SERIES" },
  { href: "/live", label: "TV EN VIVO" },
  { href: "/list", label: "MI LISTA" },
];

export default function Header() {
  const r = useRouter();
  const path = usePathname();
  const [q, setQ] = useState("");
  const [st, setSt] = useState<Status>({ state: "checking" });

  // Detector: ¿responde el JSON remoto de proveedores?
  useEffect(() => {
    let alive = true;
    const url = providersUrl();
    try {
      const raw = localStorage.getItem("tvshow_providers_cache_v2");
      if (raw) {
        const c = JSON.parse(raw);
        if (c.t + 3600 * 1000 > Date.now() && Array.isArray(c.list) && c.list.length) {
          let n = c.list.length;
          try {
            const rl = localStorage.getItem("tvshow_live_cache_v2");
            if (rl) {
              const cl = JSON.parse(rl);
              if (cl.t + 3600 * 1000 > Date.now() && Array.isArray(cl.list)) n += cl.list.length;
            }
          } catch {}
          setSt({ state: "online", count: n, version: c.version || "" });
          return;
        }
      }
    } catch {}
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 8000);
    fetch(url, { cache: "no-store", signal: ctrl.signal })
      .then((res) => {
        clearTimeout(to);
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((j) => {
        const n = (Array.isArray(j) ? j.length : (j.providers?.length || 0) + (j.live?.length || 0));
        const v = String((!Array.isArray(j) && j.version) || "");
        if (alive) setSt(n ? { state: "online", count: n, version: v } : { state: "local" });
      })
      .catch(() => { if (alive) setSt({ state: "local" }); });
    return () => { alive = false; clearTimeout(to); };
  }, []);

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-[#0b0b10]/90 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link href="/" className="text-xl font-black shrink-0">TV<span className="text-violet-400">SHOW</span></Link>
        <nav className="hidden lg:flex items-center gap-4 text-[13px] font-semibold">
          {MENU.map((m) => (
            <Link key={m.href} href={m.href}
              className={path === m.href ? "text-cyan-400" : "text-zinc-300 hover:text-white"}>
              {m.label}
            </Link>
          ))}
        </nav>
        <form className="flex-1 flex gap-2 max-w-md ml-auto" onSubmit={(e) => { e.preventDefault(); if (q.trim()) r.push(`/search?q=${encodeURIComponent(q.trim())}`); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar películas, series, TV en vivo…"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-violet-400" />
        </form>
        <span
          title={st.state === "online" ? `Lista de servidores v${st.version || "?"} en línea (${st.count} entradas)` : st.state === "local" ? "Sin conexión al JSON remoto" : "Verificando servidor de proveedores…"}
          className="hidden md:flex items-center gap-1.5 text-xs whitespace-nowrap shrink-0"
        >
          <span className={`w-2 h-2 rounded-full ${
            st.state === "online" ? "bg-emerald-400" : st.state === "local" ? "bg-red-400" : "bg-yellow-400 animate-pulse"
          }`} />
          <span className="text-zinc-400">
            {st.state === "online" ? `(${st.count}) v${st.version || "?"}` : st.state === "local" ? "sin lista" : "···"}
          </span>
        </span>
      </div>
      <nav className="lg:hidden max-w-7xl mx-auto px-4 pb-2 flex gap-4 text-xs font-semibold overflow-x-auto">
        {MENU.map((m) => (
          <Link key={m.href} href={m.href} className={path === m.href ? "text-cyan-400" : "text-zinc-300"}>{m.label}</Link>
        ))}
      </nav>
    </header>
  );
}
