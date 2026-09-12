"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useLang } from "@/hooks/useLang";
import Clock from "@/components/Clock";
import { t } from "@/lib/dict";

export default function Header() {
  const path = usePathname();
  const { lang } = useLang();
  const d = t(lang);
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
    <header className="sticky top-0 z-40 backdrop-blur bg-[#0b0b10]/90 border-b border-white/10">
      <div className="max-w-7xl mx-auto pl-20 pr-3 sm:pr-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-4">
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
  );
}
