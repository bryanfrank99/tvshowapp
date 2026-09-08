"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { IconSearch, IconHome, IconFilm, IconTv, IconSignal, IconHeart } from "@/components/Icons";
import { useLang } from "@/hooks/useLang";
import Clock from "@/components/Clock";
import { useIsTV } from "@/hooks/useIsTV";
import { t } from "@/lib/dict";

const TABS = [
  { href: "/", label: "tabs_home", Icon: IconHome },
  { href: "/movies", label: "tabs_movies", Icon: IconFilm },
  { href: "/series", label: "tabs_series", Icon: IconTv },
  { href: "/search", label: "tabs_search", Icon: IconSearch },
  { href: "/live", label: "tabs_live", Icon: IconSignal },
  { href: "/list", label: "tabs_list", Icon: IconHeart },
];

export default function Header() {
  const path = usePathname();
  const { lang } = useLang();
  const d = t(lang);
  const isTV = useIsTV();
  const crumbMap: Record<string, string> = {
    "/movies": d.nav_movies.charAt(0) + d.nav_movies.slice(1).toLowerCase(),
    "/series": d.nav_series.charAt(0) + d.nav_series.slice(1).toLowerCase(),
    "/live": d.nav_live.charAt(0) + d.nav_live.slice(1).toLowerCase(),
    "/list": d.nav_list.charAt(0) + d.nav_list.slice(1).toLowerCase(),
    "/search": d.nav_search.charAt(0) + d.nav_search.slice(1).toLowerCase(),
    "/title": d.crumb_detalle,
    "/person": d.crumb_persona,
    "/genre": d.crumb_genero,
    "/watch": d.crumb_ver,
    "/dmca": "DMCA",
  };
  const crumb = crumbMap[path] || "";

  return (
    <>
    <header className="sticky top-0 z-40 backdrop-blur bg-[#0b0b10]/90 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:pl-20 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-4">
        <nav aria-label="Ruta" className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm min-w-0 flex-1 overflow-hidden">
          <Link href="/" className="text-zinc-500 hover:text-white shrink-0">{d.nav_home.charAt(0) + d.nav_home.slice(1).toLowerCase()}</Link>
          {crumb && (
            <>
              <span className="text-zinc-600 shrink-0">/</span>
              <span className="font-bold truncate">{crumb}</span>
            </>
          )}
        </nav>
        <div className="ml-auto shrink-0">
          <Clock />
        </div>
      </div>
    </header>
      {!isTV && (
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0b0b10] border-t border-white/10 shadow-[0_-8px_24px_rgba(0,0,0,0.6)]" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="grid grid-cols-6 max-w-7xl mx-auto">
          {TABS.map(({ href, label, Icon }) => (
            <Link key={href} href={href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${path === href ? "text-[#008CFF]" : "text-zinc-400"}`}>
              <Icon size={20} />
              {d[label as keyof typeof d]}
            </Link>
          ))}
        </div>
      </nav>
      )}
    </>
  );
}
