"use client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchProviders, fetchLiveSources } from "@/lib/providers";
import { IconSearch, IconHome, IconFilm, IconTv, IconSignal, IconHeart } from "@/components/Icons";
import { useLang } from "@/hooks/useLang";
import LangMenu from "@/components/LangMenu";
import { t } from "@/lib/dict";

type Status = { state: "checking" | "online" | "local"; count?: number; version?: string };

const MENU = [
  { href: "/", label: "nav_home", Icon: IconHome },
  { href: "/movies", label: "nav_movies", Icon: IconFilm },
  { href: "/series", label: "nav_series", Icon: IconTv },
  { href: "/live", label: "nav_live", Icon: IconSignal },
  { href: "/list", label: "nav_list", Icon: IconHeart },
];

const TABS = [
  { href: "/", label: "tabs_home", Icon: IconHome },
  { href: "/movies", label: "tabs_movies", Icon: IconFilm },
  { href: "/series", label: "tabs_series", Icon: IconTv },
  { href: "/live", label: "tabs_live", Icon: IconSignal },
  { href: "/list", label: "tabs_list", Icon: IconHeart },
];

export default function Header() {
  const r = useRouter();
  const path = usePathname();
  const [q, setQ] = useState("");
  const [st, setSt] = useState<Status>({ state: "checking" });
  const { lang } = useLang();
  const d = t(lang);

  // Detector: ¿responde la lista remota de proveedores? (vía fetchProviders con caché)
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
    <>
    <header className="sticky top-0 z-40 backdrop-blur bg-[#0b0b10]/90 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-4">
        <Link href="/" className="shrink-0" aria-label="Inicio">
          <Image src="/TVSHOW.png" alt="TVSHOW" width={120} height={32} className="h-7 sm:h-8 w-auto" priority />
        </Link>
        <nav className="hidden lg:flex items-center gap-5 text-[13px] font-semibold">
          {MENU.map(({ href, label, Icon }) => (
            <Link key={href} href={href}
              className={`inline-flex items-center gap-1.5 leading-none ${path === href ? "text-[#008CFF]" : "text-zinc-300 hover:text-white"}`}>
              <Icon size={15} />
              {d[label as keyof typeof d]}
            </Link>
          ))}
        </nav>
        <form className="flex-1 flex gap-1.5 sm:gap-2 max-w-xs sm:max-w-sm ml-auto" onSubmit={(e) => { e.preventDefault(); if (q.trim()) r.push(`/search?q=${encodeURIComponent(q.trim())}`); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={d.search_ph}
            style={{ height: 36 }}
            className="w-full min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 text-sm outline-none focus:border-[#008CFF]" />
          <button aria-label={d.search_btn} style={{ height: 36 }} className="bg-[#008CFF] hover:brightness-110 rounded-xl px-3 sm:px-4 font-semibold shrink-0 inline-flex items-center justify-center">
            <IconSearch size={17} className="sm:hidden" /><span className="hidden sm:inline text-sm">{d.search_btn}</span>
          </button>
        </form>
        <LangMenu />
        <span
          title={st.state === "online" ? `Lista de servidores v${st.version || "?"} en línea (${st.count} entradas)` : st.state === "local" ? "Sin conexión al JSON remoto" : "Verificando servidor de proveedores…"}
          className="hidden md:flex items-center gap-1.5 text-xs whitespace-nowrap shrink-0"
        >
          <span className={`w-2 h-2 rounded-full ${
            st.state === "online" ? "bg-emerald-400" : st.state === "local" ? "bg-red-400" : "bg-yellow-400 animate-pulse"
          }`} />
          <span className="text-zinc-400">
            {st.state === "online" ? `(${st.count})${st.version ? ` v${st.version}` : ""}` : st.state === "local" ? "sin lista" : "···"}
          </span>
        </span>
      </div>
    </header>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0b0b10] border-t border-white/10 shadow-[0_-8px_24px_rgba(0,0,0,0.6)]" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="grid grid-cols-5 max-w-7xl mx-auto">
          {TABS.map(({ href, label, Icon }) => (
            <Link key={href} href={href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${path === href ? "text-[#008CFF]" : "text-zinc-400"}`}>
              <Icon size={20} />
              {d[label as keyof typeof d]}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

