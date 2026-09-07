"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useFavorites } from "@/hooks/useFavorites";
import { IconHeart, IconX, IconStar, IconPlay } from "@/components/Icons";
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
          <div key={`${f.type}-${f.id}`} className="group relative bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-[#008CFF] hover:-translate-y-1 transition">
            <Link href={`/title?type=${f.type}&id=${f.id}`} className="block">
              <Image src={f.poster || "https://via.placeholder.com/500x750?text=?"} alt={f.title} width={300} height={450} className="w-full aspect-[2/3] object-cover" loading="lazy" />
              <span className="absolute inset-0 m-auto w-14 h-14 rounded-full hidden group-hover:flex items-center justify-center bg-gradient-to-br from-[#008CFF] to-[#008CFF]/70 shadow-[0_0_24px_rgba(0,140,255,0.7)] ring-1 ring-white/40 pointer-events-none">
                <IconPlay size={22} className="ml-0.5 text-white" />
              </span>
              {(f.rating || 0) > 0 && (
                <span className="absolute top-1.5 right-1.5 text-[11px] font-bold bg-black/70 rounded-md px-1.5 py-0.5 inline-flex items-center gap-1"><IconStar size={11} className="text-[#f5c518]" />{Math.round((f.rating || 0) * 10) / 10}</span>
              )}
              <div className="p-2">
                <p className="text-sm font-semibold truncate">{f.title}</p>
                <p className="text-xs text-zinc-500">{f.type === "tv" ? d.serie : d.pelicula}</p>
              </div>
            </Link>
            <button
              onClick={() => remove(f.type, f.id)}
              title={`${d.quitar} ${f.title}`}
              aria-label={`${d.quitar} ${f.title}`}
              className="absolute top-1.5 left-1.5 w-7 h-7 rounded-full bg-black/70 border border-white/20 hover:bg-red-600 hover:border-red-600 flex items-center justify-center"
            >
              <IconX size={12} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
