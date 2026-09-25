"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconFilm, IconTv, IconSignal, IconHeart } from "@/components/Icons";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/dict";

export default function MobileBottomNav() {
  const path = usePathname();
  const { lang } = useLang();
  const d = t(lang);

  // En la vista de reproducción a pantalla completa, no mostrar barra para máxima inmersión
  if (path.startsWith("/watch")) {
    return null;
  }

  const items = [
    { href: "/", label: d.tabs_home, Icon: IconHome },
    { href: "/movies", label: d.tabs_movies, Icon: IconFilm },
    { href: "/series", label: d.tabs_series, Icon: IconTv },
    { href: "/live", label: d.tabs_live, Icon: IconSignal },
    { href: "/list", label: d.tabs_list, Icon: IconHeart },
  ];

  return (
    <nav
      aria-label="Navegación Móvil"
      className="flex md:hidden [.tv_&]:!hidden fixed bottom-0 inset-x-0 z-50 bg-[#0b0b10]/95 backdrop-blur-xl border-t border-white/10 px-1 pt-1.5 pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.6rem))] items-center shadow-[0_-10px_25px_rgba(0,0,0,0.8)] select-none w-full max-w-full"
    >
      <div className="grid grid-cols-5 w-full max-w-lg mx-auto">
        {items.map(({ href, label, Icon }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center min-h-[50px] py-1 px-1 rounded-xl transition-all duration-150 ${
                active
                  ? "text-[#008CFF] font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 active:scale-95"
              }`}
            >
              <span className={`relative flex items-center justify-center ${active ? "scale-110" : ""}`}>
                <Icon size={20} />
                {active && (
                  <span className="absolute -bottom-1.5 w-1 h-1 bg-[#008CFF] rounded-full shadow-[0_0_8px_#008CFF]" />
                )}
              </span>
              <span className="text-[10px] tracking-tight mt-1 truncate max-w-[64px] text-center">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
