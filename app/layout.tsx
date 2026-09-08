import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import TvNav from "@/components/TvNav";
import SideNav from "@/components/SideNav";
import LoveGate from "@/components/LoveGate";
import pkg from "@/package.json";
const appVersion = pkg.version;
import { getLang } from "@/lib/tmdb";
import { t } from "@/lib/dict";

export const metadata: Metadata = {
  title: "TVShow — Catálogo + Player",
  description: "TMDB + IMDb + multi-player",
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const d = t(getLang());
  return (
    <html lang={getLang()}>
      <body className="bg-[#0b0b10] text-zinc-100 min-h-screen">
        <Header />
        <TvNav />
        <SideNav labels={{ nav_home: d.nav_home, nav_movies: d.nav_movies, nav_series: d.nav_series, nav_search: d.nav_search, nav_live: d.nav_live, nav_list: d.nav_list }} />
        <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-6 pl-20">{children}</main>
        <footer className="max-w-7xl mx-auto px-4 pl-20 pb-10 text-xs text-zinc-500 space-y-2 text-center">
          <p className="text-sm text-zinc-400"><LoveGate label={d.footer_love} /></p>
          <p><a href="/dmca" className="text-[#008CFF] underline">{d.footer_dmca}</a> · <span title="Versión de la aplicación">v{appVersion}</span></p>
          <p>{d.footer_rights}</p>
        </footer>
      </body>
    </html>
  );
}


