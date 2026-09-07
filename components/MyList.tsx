"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useFavorites } from "@/hooks/useFavorites";
import { IconHeart, IconX } from "@/components/Icons";
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
          <div key={`${f.type}-${f.id}`} className="relative bg-white/5 border border-red-500/30 rounded-2xl overflow-hidden">
            <Link href={`/title?type=${f.type}&id=${f.id}`} className="block">
              <Image src={f.poster || "https://via.placeholder.com/500x750?text=?"} alt={f.title} width={300} height={450} className="w-full aspect-[2/3] object-cover" loading="lazy" />
              <div className="p-2">
                <p className="text-sm font-semibold truncate">{f.title}</p>
                <p className="text-xs text-zinc-500">{f.type === "tv" ? d.serie : d.pelicula}</p>
              </div>
            </Link>
            <button
              onClick={() => remove(f.type, f.id)}
              title={`Quitar ${f.title}`}
              aria-label={`Quitar ${f.title} de Mi lista`}
              className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/70 border border-white/20 hover:bg-red-600 hover:border-red-600 flex items-center justify-center"
            >
              <IconX size={12} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
