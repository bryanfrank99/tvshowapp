import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import TvNav from "@/components/TvNav";

export const metadata: Metadata = { title: "TVShow — Catálogo + Player", description: "TMDB + IMDb + multi-player" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-[#0b0b10] text-zinc-100 min-h-screen">
        <Header />
        <TvNav />
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
        <footer className="max-w-7xl mx-auto px-4 pb-10 text-xs text-zinc-500 space-y-2">
          <p>TVShow no aloja, almacena ni distribuye ningún archivo de video en sus servidores. Todo el contenido se reproduce mediante reproductores de terceros. Los posters, sinopsis y metadatos provienen de TMDB, Cinemeta y TVMaze con fines informativos.</p>
          <p>Si eres titular de derechos y consideras que algún enlace vulnera tus derechos de autor, contacta directamente con el proveedor del reproductor correspondiente. Atenderemos solicitudes DMCA escribiendo a los proveedores externos, ya que no tenemos control sobre su contenido.</p>
          <p>© 2026 TVShow. Todos los derechos reservados.</p>
        </footer>
      </body>
    </html>
  );
}

