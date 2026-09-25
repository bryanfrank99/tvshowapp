"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useLang } from "@/hooks/useLang";
import Clock from "@/components/Clock";
import LangMenu from "@/components/LangMenu";
import { IconSearch } from "@/components/Icons";
import { t } from "@/lib/dict";

export default function Header() {
  const path = usePathname();
  const { lang } = useLang();
  const d = t(lang);
  const crumbMap: Record<string, string> = {
    "/movies": d.nav_movies.charAt(0) + d.nav_movies.slice(1).toLowerCase(),
    "/series": d.nav_series.charAt(0) + d.nav_series.slice(1).toLowerCase(),
    "/kids": "Kids",
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
      <header className="fixed top-0 left-0 right-0 md:left-16 [.tv_&]:left-16 z-30 pt-[env(safe-area-inset-top,0px)] bg-[#0b0b10]/95 backdrop-blur-md border-b border-white/10 transition-[left] duration-200 select-none">
        <div className="w-full max-w-[1840px] mx-auto h-12 sm:h-14 px-3 sm:px-6 md:px-8 flex items-center gap-2 sm:gap-4">
          {/* Logo solo en móvil cuando el SideNav está oculto */}
          <Link href="/" className="flex md:hidden [.tv_&]:!hidden items-center shrink-0 mr-1 sm:mr-2 pl-0.5">
            <Image src="/TVSHOW.png" alt="TVSHOW" width={80} height={21} className="h-5 w-auto object-contain" priority />
          </Link>
          <nav aria-label="Ruta" className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm min-w-0 flex-1 overflow-hidden">
            {crumb ? (
              <>
                <Link href="/" className="text-zinc-500 hover:text-white shrink-0 hidden xs:inline">{d.nav_home.charAt(0) + d.nav_home.slice(1).toLowerCase()}</Link>
                <span className="text-zinc-600 shrink-0 hidden xs:inline">/</span>
                <span className="font-bold truncate text-zinc-200">{crumb}</span>
              </>
            ) : (
              <span className="hidden md:inline text-zinc-500">{d.nav_home.charAt(0) + d.nav_home.slice(1).toLowerCase()}</span>
            )}
          </nav>
          <div className="ml-auto shrink-0 flex items-center gap-1.5 sm:gap-3">
            {/* Controles móviles adicionales: Búsqueda, Kids e Idioma */}
            <div className="flex md:hidden [.tv_&]:!hidden items-center gap-1.5">
              <Link
                href="/search"
                aria-label={d.search_btn}
                className="w-8 h-8 inline-flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 active:scale-95 transition"
              >
                <IconSearch size={16} />
              </Link>
              <Link
                href="/kids"
                aria-label="Kids"
                className="h-8 px-2 inline-flex items-center justify-center rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-black text-[11px] border border-amber-500/20 active:scale-95 transition"
              >
                KIDS
              </Link>
              <LangMenu />
            </div>
            {/* Reloj visible en todos los dispositivos */}
            <div className="flex items-center">
              <Clock />
            </div>
          </div>
        </div>
      </header>
      {/* Spacer para reservar el espacio exacto en el flujo del documento */}
      <div className="h-[calc(3rem+env(safe-area-inset-top,0px))] sm:h-[calc(3.5rem+env(safe-area-inset-top,0px))] shrink-0 pointer-events-none" aria-hidden="true" />
    </>
  );
}
