"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { IconHome, IconFilm, IconTv, IconKids, IconSignal, IconHeart, IconSearch, IconGlobe } from "@/components/Icons";
import { useState, useRef, useEffect } from "react";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/dict";
import LanguageModal from "@/components/LanguageModal";

// Navbar izquierda: rail fijo con drawer flotante al expandir; abajo idioma + estado.
const ITEMS = [
  { href: "/search", Icon: IconSearch },
  { href: "/", Icon: IconHome },
  { href: "/movies", Icon: IconFilm },
  { href: "/series", Icon: IconTv },
  { href: "/kids", Icon: IconKids },
  { href: "/live", Icon: IconSignal },
  { href: "/list", Icon: IconHeart },
];

const LANG_NAMES = { es: "Español", en: "English", pt: "Português" } as const;

export default function SideNav({ labels }: { labels: Record<string, string> }) {
  const path = usePathname();
  const { lang } = useLang();
  const [langOpen, setLangOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const d = t(lang);
  const names: Record<string, string> = {
    "/search": labels.nav_search,
    "/": labels.nav_home,
    "/movies": labels.nav_movies,
    "/series": labels.nav_series,
    "/kids": labels.nav_kids || "KIDS",
    "/live": labels.nav_live,
    "/list": labels.nav_list,
  };

  // Al cambiar de ruta o al salir el cursor, desenfocar para colapsar inmediatamente (sin retener foco de clic)
  useEffect(() => {
    if (typeof document !== "undefined" && !document.body.classList.contains("tv")) {
      if (navRef.current && document.activeElement && navRef.current.contains(document.activeElement)) {
        (document.activeElement as HTMLElement).blur();
      }
    }
  }, [path]);

  const handleMouseLeave = () => {
    if (typeof document !== "undefined" && !document.body.classList.contains("tv")) {
      if (navRef.current && document.activeElement && navRef.current.contains(document.activeElement)) {
        (document.activeElement as HTMLElement).blur();
      }
    }
  };

  const handleItemClick = (e: React.MouseEvent<HTMLElement>) => {
    if (typeof document !== "undefined" && !document.body.classList.contains("tv")) {
      e.currentTarget.blur();
    }
  };

  return (
    <>
      <aside className="hidden md:flex [.tv_&]:flex w-16 shrink-0 relative z-40">
        <nav
          ref={navRef}
          aria-label="Principal"
          onMouseLeave={handleMouseLeave}
          className="flex fixed inset-y-0 left-0 z-40 w-16 hover:w-52 has-[:focus-visible]:w-52 [.tv_&]:focus-within:w-52 transition-[width] duration-200 ease-in-out bg-[#0b0b10] border-r border-white/10 shadow-2xl shadow-black/80 flex-col items-stretch py-4 gap-1 overflow-hidden group/nav"
        >
          <Link
            href="/"
            aria-label="Inicio"
            onClick={handleItemClick}
            className="flex items-center gap-3 px-4 mb-4 h-10"
          >
            <Image
              src="/favicon.png"
              alt="TV"
              width={32}
              height={32}
              className="w-8 h-8 shrink-0 group-hover/nav:hidden group-has-[:focus-visible]/nav:hidden [.tv_&]:group-focus-within/nav:hidden"
            />
            <Image
              src="/TVSHOW.png"
              alt="TVSHOW"
              width={120}
              height={32}
              className="tv-label h-7 w-auto shrink-0 hidden group-hover/nav:block group-has-[:focus-visible]/nav:block [.tv_&]:group-focus-within/nav:block"
            />
          </Link>
          {ITEMS.map(({ href, Icon }) => {
            const active = path === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={handleItemClick}
                className={`flex items-center gap-3 h-12 rounded-xl mx-2 whitespace-nowrap ${
                  active ? "bg-[#008CFF] text-white" : "text-zinc-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <span className="w-11 h-12 shrink-0 inline-flex items-center justify-center">
                  <Icon size={22} />
                </span>
                <span className="tv-label text-sm font-semibold opacity-0 group-hover/nav:opacity-100 group-has-[:focus-visible]/nav:opacity-100 [.tv_&]:group-focus-within/nav:opacity-100 transition">
                  {names[href]}
                </span>
              </Link>
            );
          })}
          <div className="mt-auto flex flex-col gap-1 pb-2">
            <button
              type="button"
              onClick={(e) => {
                handleItemClick(e);
                setLangOpen(true);
              }}
              aria-haspopup="dialog"
              aria-expanded={langOpen}
              title={`${d.lang_label}: ${LANG_NAMES[lang]}`}
              className="flex items-center gap-3 h-12 rounded-xl mx-2 whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/5 focus:bg-white/10 focus:text-white outline-none focus:ring-2 focus:ring-[#008CFF]"
            >
              <span className="w-11 h-12 shrink-0 inline-flex items-center justify-center">
                <IconGlobe size={22} />
              </span>
              <span className="tv-label text-sm font-semibold opacity-0 group-hover/nav:opacity-100 group-has-[:focus-visible]/nav:opacity-100 [.tv_&]:group-focus-within/nav:opacity-100 transition">
                {LANG_NAMES[lang]}
              </span>
            </button>
          </div>
        </nav>
      </aside>
      <LanguageModal isOpen={langOpen} onClose={() => setLangOpen(false)} />
    </>
  );
}

