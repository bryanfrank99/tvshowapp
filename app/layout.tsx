import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import TvNav from "@/components/TvNav";
import SideNav from "@/components/SideNav";
import MobileBottomNav from "@/components/MobileBottomNav";
import AppUpdater from "@/components/AppUpdater";
import AutoAccessHandler from "@/components/AutoAccessHandler";
import { displayVersion } from "@/lib/version";
import { getLang } from "@/lib/tmdb";
import { t } from "@/lib/dict";

export const metadata: Metadata = {
  metadataBase: new URL("https://tvshowapp.net"),
  title: "TVShow — Catálogo + Player",
  description: "TMDB + IMDb + multi-player",
  icons: { icon: "/favicon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const d = t(getLang());
  return (
    <html lang={getLang()} className="overflow-x-hidden max-w-full">
      <body className="bg-[#0b0b10] text-zinc-100 min-h-screen overflow-x-hidden max-w-full w-full">
        <AppUpdater />
        <AutoAccessHandler />
        <div className="flex min-h-screen w-full max-w-full overflow-x-hidden">
          <TvNav />
          <SideNav labels={{ nav_home: d.nav_home, nav_movies: d.nav_movies, nav_series: d.nav_series, nav_kids: d.nav_kids, nav_search: d.nav_search, nav_live: d.nav_live, nav_list: d.nav_list }} />
          <div className="flex-1 min-w-0 flex flex-col min-h-screen max-w-full overflow-x-hidden">
            <Header />
            <main className="w-full max-w-[1840px] mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 pb-24 md:pb-8 flex-1 min-w-0">{children}</main>
            <footer className="w-full max-w-[1840px] mx-auto px-4 sm:px-6 md:px-8 pb-28 md:pb-10 text-xs text-zinc-500 space-y-2 text-center">
              <p className="text-sm text-zinc-400">{d.footer_love}</p>
              <p><a href="/dmca" className="text-[#008CFF] underline">{d.footer_dmca}</a> · <span title="Versión de la aplicación">{displayVersion()}</span></p>
              <p>{d.footer_rights}</p>
            </footer>
          </div>
        </div>
        <MobileBottomNav />
      </body>
    </html>
  );
}


