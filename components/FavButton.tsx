"use client";
import { useFavorites } from "@/hooks/useFavorites";
import { IconHeart } from "@/components/Icons";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/dict";

// Corazón reutilizable. Es <span> (no <a>) para poder vivir dentro de tarjetas-Link.
export default function FavButton({ type, id, title, poster, rating, big = false, end = false, focusable = true }: {
  type: "movie" | "tv"; id: string | number; title: string; poster: string; rating?: number; big?: boolean; end?: boolean; focusable?: boolean;
}) {
  const { has, toggle } = useFavorites();
  const { lang } = useLang();
  const d = t(lang);
  const active = has(type, id);
  const fav = { type, id: String(id), title, poster, rating };
  return (
    <button
      type="button" tabIndex={focusable ? 0 : -1} aria-hidden={!focusable} title={active ? d.fav_remove : d.fav_add}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(fav); }}
      className={big
        ? "inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-bold hover:border-red-400 cursor-pointer"
        : end
          ? "ml-auto shrink-0 w-10 h-10 rounded-full bg-white/5 border border-white/20 text-lg cursor-pointer hover:border-red-400 flex items-center justify-center"
          : "absolute top-1.5 left-1.5 w-7 h-7 rounded-full bg-black/70 border border-white/20 text-sm cursor-pointer hover:border-red-400 flex items-center justify-center"}
    >
      <span className={active ? "text-red-500" : "text-white"}><IconHeart size={big ? 15 : 14} filled={active} /></span>
      {big && <span className="ml-1">{active ? d.fav_in : d.fav_btn}</span>}
    </button>
  );
}
