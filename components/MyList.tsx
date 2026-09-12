"use client";
import { useEffect, useState } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import { IconHeart, IconX } from "@/components/Icons";
import { MediaCard } from "@/components/Cards";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/dict";

export default function MyList() {
  const { favs, remove } = useFavorites();
  const { lang } = useLang();
  const d = t(lang);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !favs.length) return null;
  return (
    <section className="mb-8">
      <h2 className="text-xl font-extrabold mb-3 inline-flex items-center gap-2"><IconHeart size={18} className="text-red-500" />{d.mi_lista}</h2>
      <div className="rail">
        {favs.map((f) => (
          <MediaCard
            key={`${f.type}-${f.id}`}
            item={{
              id: f.id,
              title: f.title,
              poster_path: f.poster,
              vote_average: f.rating,
              media_type: f.type,
            }}
            actionButton={
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  remove(f.type, f.id);
                }}
                title={`${d.quitar} ${f.title}`}
                aria-label={`${d.quitar} ${f.title}`}
                className="w-8 h-8 rounded-full bg-zinc-950/90 border border-white/20 hover:bg-red-600 hover:border-red-600 active:scale-90 transition-colors flex items-center justify-center text-white shadow-md cursor-pointer"
              >
                <IconX size={12} />
              </button>
            }
          />
        ))}
      </div>
    </section>
  );
}
