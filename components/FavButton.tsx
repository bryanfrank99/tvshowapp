"use client";
import { useFavorites } from "@/hooks/useFavorites";

// Corazón reutilizable. Es <span> (no <a>) para poder vivir dentro de tarjetas-Link.
export default function FavButton({ type, id, title, poster, big = false, end = false }: {
  type: "movie" | "tv"; id: string | number; title: string; poster: string; big?: boolean; end?: boolean;
}) {
  const { has, toggle } = useFavorites();
  const active = has(type, id);
  return (
    <span
      role="button" tabIndex={0} title={active ? "Quitar de Mi lista" : "Añadir a Mi lista"}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle({ type, id: String(id), title, poster }); }}
      onKeyDown={(e) => { if (e.key === "Enter") toggle({ type, id: String(id), title, poster }); }}
      className={big
        ? "inline-block px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:border-red-400 cursor-pointer"
        : end
          ? "ml-auto shrink-0 w-10 h-10 rounded-full bg-white/5 border border-white/20 text-lg cursor-pointer hover:border-red-400 flex items-center justify-center"
          : "absolute top-1.5 left-1.5 w-7 h-7 rounded-full bg-black/70 border border-white/20 text-sm cursor-pointer hover:border-red-400 flex items-center justify-center"}
    >
      <span className={active ? "text-red-500" : "text-white"}>{active ? "♥" : "♡"}</span>
      {big && <span className="ml-1">{active ? "En Mi lista" : "Mi lista"}</span>}
    </span>
  );
}
