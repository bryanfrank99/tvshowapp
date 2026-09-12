"use client";
import { useFavorites } from "@/hooks/useFavorites";
import { IconHeart } from "@/components/Icons";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/dict";

// Corazón reutilizable. Es <button> (no <a>) para poder vivir dentro de tarjetas-Link sin anidar <a>.
export default function FavButton({
  type,
  id,
  title,
  poster,
  rating,
  big = false,
  end = false,
  focusable = true,
  className = "",
}: {
  type: "movie" | "tv";
  id: string | number;
  title: string;
  poster: string;
  rating?: number;
  big?: boolean;
  end?: boolean;
  focusable?: boolean;
  className?: string;
}) {
  const { has, toggle } = useFavorites();
  const { lang } = useLang();
  const d = t(lang);
  const active = has(type, id);
  const fav = { type, id: String(id), title, poster, rating };

  let baseClass = "";
  if (big) {
    baseClass =
      "inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-bold hover:border-red-400 active:scale-95 transition cursor-pointer";
  } else if (end) {
    baseClass =
      "ml-auto shrink-0 w-9 h-9 rounded-full bg-white/5 border border-white/20 text-lg cursor-pointer hover:border-red-400 active:scale-95 transition flex items-center justify-center";
  } else {
    baseClass =
      "w-8 h-8 rounded-full bg-zinc-950/90 border border-white/20 text-sm cursor-pointer hover:border-red-400 hover:bg-black active:scale-90 transition-[transform,colors,border-color] duration-150 flex items-center justify-center shadow-md";
  }

  return (
    <button
      type="button"
      tabIndex={focusable ? 0 : -1}
      aria-hidden={!focusable}
      title={active ? d.fav_remove : d.fav_add}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(fav);
      }}
      className={`${baseClass} ${className}`.trim()}
    >
      <span className={`transition-transform duration-200 ${active ? "text-red-500 scale-110" : "text-white/80 hover:text-white"}`}>
        <IconHeart size={big ? 15 : 14} filled={active} />
      </span>
      {big && <span className="ml-1">{active ? d.fav_in : d.fav_btn}</span>}
    </button>
  );
}
