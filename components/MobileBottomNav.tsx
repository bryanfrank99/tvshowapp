"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconFilm, IconTv, IconSearch, IconHeart, IconGlobe } from "@/components/Icons";
import { useState } from "react";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/dict";
import LanguageModal from "@/components/LanguageModal";

export default function MobileBottomNav() {
  const path = usePathname();
  const { lang } = useLang();
  const [langOpen, setLangOpen] = useState(false);
  const d = t(lang);

  // En la vista de reproducción a pantalla completa, no mostrar barra para máxima inmersión
  if (path.startsWith("/watch")) {
    return null;
  }

  const items = [
    { href: "/", label: d.tabs_home, Icon: IconHome },
    { href: "/movies", label: d.tabs_movies, Icon: IconFilm },
    { href: "/series", label: d.tabs_series, Icon: IconTv },
    { href: "/search", label: d.tabs_search, Icon: IconSearch },
    { href: "/list", label: d.tabs_list, Icon: IconHeart },
  ];

  return (
    <>
      <nav
        aria-label="Navegación Móvil"
        className="flex md:hidden [.tv_&]:!hidden fixed bottom-0 inset-x-0 z-50 bg-[#0b0b10]/95 backdrop-blur-xl border-t border-white/10 px-1.5 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] items-center justify-around shadow-[0_-10px_25px_rgba(0,0,0,0.7)] select-none"
      >
        {items.map(({ href, label, Icon }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all duration-150 ${
                active
                  ? "text-[#008CFF] font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 active:scale-95"
              }`}
            >
              <span className={`relative flex items-center justify-center ${active ? "scale-110" : ""}`}>
                <Icon size={20} />
                {active && (
                  <span className="absolute -bottom-1.5 w-1 h-1 bg-[#008CFF] rounded-full" />
                )}
              </span>
              <span className="text-[10px] tracking-tight mt-1 truncate max-w-[56px] text-center">
                {label}
              </span>
            </Link>
          );
        })}

        {/* Botón de Idioma */}
        <button
          type="button"
          onClick={() => setLangOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={langOpen}
          aria-label={d.lang_label}
          className="flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl text-zinc-400 hover:text-zinc-200 active:scale-95 transition-all duration-150"
        >
          <span className="relative flex items-center justify-center">
            <IconGlobe size={20} />
          </span>
          <span className="text-[10px] tracking-tight mt-1 uppercase text-zinc-400 font-bold truncate max-w-[56px] text-center">
            {lang}
          </span>
        </button>
      </nav>

      <LanguageModal isOpen={langOpen} onClose={() => setLangOpen(false)} />
    </>
  );
}
