"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { IconHome, IconFilm, IconTv, IconSignal, IconHeart, IconSearch, IconGlobe } from "@/components/Icons";
import { useState } from "react";
import { useLang, LANGS, setClientLang } from "@/hooks/useLang";
import ProvidersDot from "@/components/ProvidersDot";
import { t } from "@/lib/dict";

// Navbar izquierda: iconos + etiquetas al expandir; abajo idioma + estado.
const ITEMS = [
  { href: "/search", Icon: IconSearch },
  { href: "/", Icon: IconHome },
  { href: "/movies", Icon: IconFilm },
  { href: "/series", Icon: IconTv },
  { href: "/live", Icon: IconSignal },
  { href: "/list", Icon: IconHeart },
];

const LANG_NAMES = { es: "Español", en: "English", pt: "Português" } as const;

export default function SideNav({ labels }: { labels: Record<string, string> }) {
  const path = usePathname();
  const { lang } = useLang();
  const [langOpen, setLangOpen] = useState(false);
  const d = t(lang);
  const names: Record<string, string> = {
    "/search": labels.nav_search,
    "/": labels.nav_home,
    "/movies": labels.nav_movies,
    "/series": labels.nav_series,
    "/live": labels.nav_live,
    "/list": labels.nav_list,
  };
  return (
    <nav aria-label="Principal"
      className="flex fixed left-0 top-0 bottom-0 z-40 w-16 hover:w-52 focus-within:w-52 transition-all bg-[#0b0b10] border-r border-white/10 flex-col items-stretch py-4 gap-1 overflow-hidden group/nav">
      <Link href="/" aria-label="Inicio" className="flex items-center gap-3 px-4 mb-4 h-10">
        <Image src="/favicon.png" alt="TV" width={32} height={32} className="w-8 h-8 shrink-0 group-hover/nav:hidden group-focus-within/nav:hidden" />
        <Image src="/TVSHOW.png" alt="TVSHOW" width={120} height={32} className="h-7 w-auto shrink-0 hidden group-hover/nav:block group-focus-within/nav:block" />
      </Link>
      {ITEMS.map(({ href, Icon }) => {
        const active = path === href;
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 h-12 rounded-xl mx-2 whitespace-nowrap ${active ? "bg-[#008CFF] text-white" : "text-zinc-300 hover:text-white hover:bg-white/10"}`}>
            <span className="w-11 h-12 shrink-0 inline-flex items-center justify-center">
              <Icon size={22} />
            </span>
            <span className="text-sm font-semibold opacity-0 group-hover/nav:opacity-100 group-focus-within/nav:opacity-100 transition">
              {names[href]}
            </span>
          </Link>
        );
      })}
      <div className="mt-auto flex flex-col gap-2 px-2 pb-1">
        <button onClick={() => setLangOpen((v) => !v)} aria-haspopup="menu" aria-expanded={langOpen}
          title={`${d.lang_label}: ${LANG_NAMES[lang]}`}
          className="flex items-center gap-3 h-10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 whitespace-nowrap">
          <span className="w-11 h-10 shrink-0 inline-flex items-center justify-center">
            <IconGlobe size={20} />
          </span>
          <span className="text-xs font-bold opacity-0 group-hover/nav:opacity-100 group-focus-within/nav:opacity-100 transition">
            {LANG_NAMES[lang]}
          </span>
        </button>
        {langOpen && (
          <div role="menu" className="fixed left-[4.5rem] bottom-6 w-40 rounded-xl border border-white/10 bg-[#14141c] shadow-xl overflow-hidden z-50">
            {LANGS.map((l) => (
              <button key={l} role="menuitem" onClick={() => { setLangOpen(false); if (l !== lang) setClientLang(l); }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-white/5 ${l === lang ? "text-white" : "text-zinc-400"}`}>
                {LANG_NAMES[l]}
                {l === lang && <span className="text-[#008CFF]">✓</span>}
              </button>
            ))}
          </div>
        )}
        <span className="hidden group-hover/nav:block group-focus-within/nav:block px-2">
          <ProvidersDot label={d.servidores_label} />
        </span>
        <span className="group-hover/nav:hidden group-focus-within/nav:hidden flex justify-center">
          <ProvidersDot dotOnly />
        </span>
      </div>
    </nav>
  );
}
