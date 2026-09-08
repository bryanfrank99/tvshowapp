"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { img } from "@/lib/img";
import type { Media } from "@/lib/ids";
import { useFavorites } from "@/hooks/useFavorites";
import { IconPlay, IconStar } from "@/components/Icons";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/dict";

export function RatingBadge({ value }: { value?: number | null }) {
  if (!value) return null;
  return (
    <span className="absolute top-1.5 right-1.5 text-[11px] font-bold bg-black/70 rounded-md px-1.5 py-0.5 inline-flex items-center gap-1">
      <IconStar size={11} className="text-[#f5c518]" />{Math.round(value * 10) / 10}
    </span>
  );
}

export default function FeaturedCarousel({ items }: { items: Media[] }) {
  const [i, setI] = useState(0);
  const router = useRouter();
  const { has, toggle } = useFavorites();
  const timer = useRef<NodeJS.Timeout | null>(null);
  const n = items.length;
  const go = useCallback((d: number) => setI((v) => (v + d + n) % n), [n]);

  useEffect(() => {
    if (n < 2) return;
    timer.current = setInterval(() => setI((v) => (v + 1) % n), 7000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [n]);

  const { lang } = useLang();
  const d = t(lang);

  if (!n) return null;
  const it = items[i];
  const type = it.media_type || "movie";
  const title = it.title || it.name || "?";
  const fav = has(type, it.id);
  const poster = img(it.poster_path ?? null);

  const playHref = type === "tv"
    ? `/watch?type=tv&id=${it.id}&s=1&e=1`
    : `/watch?type=movie&id=${it.id}`;

  return (
    <div
      className="tv-hero relative rounded-2xl overflow-hidden border border-white/10 h-72 sm:h-80 md:h-[26rem] cursor-pointer"
      onClick={() => router.push(`/title?type=${type}&id=${it.id}`)}
      onMouseEnter={() => timer.current && clearInterval(timer.current)}
      onMouseLeave={() => { if (n > 1) timer.current = setInterval(() => setI((v) => (v + 1) % n), 7000); }}
    >
      {items.map((f, k) => (
        <Image
          key={String(f.id)}
          src={img(f.backdrop_path || f.poster_path, "original")}
          alt={f.title || f.name || ""}
          fill
          priority={k === 0}
          className={`object-cover object-top transition-opacity duration-700 ${k === i ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-black/85" />
      <div className="absolute inset-y-0 right-0 w-full md:w-[38%] bg-gradient-to-l from-[#0b0b10] via-[#0b0b10]/85 to-transparent flex flex-col justify-end md:justify-center p-4 md:p-8 pb-8 md:pb-8">
        <p className="text-[#f5c518] text-[11px] md:text-xs font-bold uppercase tracking-widest mb-1">{d.feat_kicker}</p>
        <h3 className="text-xl sm:text-2xl md:text-4xl font-black drop-shadow leading-tight line-clamp-2">{title}</h3>
        <p className="text-sm text-zinc-300 mt-1 inline-flex items-center gap-1.5">
          <IconStar size={13} className="text-[#f5c518]" />{Math.round((it.vote_average ?? 0) * 10) / 10} · {type === "tv" ? d.serie : d.pelicula}
        </p>
        <div className="flex gap-2 mt-3 md:mt-4 flex-wrap" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => router.push(playHref)}
            className="px-4 md:px-5 py-2 rounded-lg border border-white/40 text-xs md:text-sm font-bold hover:bg-white hover:text-black transition inline-flex items-center gap-2"><IconPlay size={15} />{d.ver_ahora}</button>
          <button onClick={() => toggle({ type: type as "movie" | "tv", id: String(it.id), title, poster, rating: it.vote_average ?? 0 })}
            className="px-3 md:px-4 py-2 rounded-lg border border-white/25 text-xs md:text-sm hover:border-red-400 transition">
            {fav ? d.en_lista : d.anadir}
          </button>
        </div>
      </div>
      {n > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
          {items.map((_, k) => (
            <button key={k} tabIndex={-1} onClick={() => setI(k)} aria-label={`Ir a ${k + 1}`} className={`h-1.5 rounded-full transition-all ${k === i ? "w-6 bg-[#008CFF]" : "w-1.5 bg-white/40 hover:bg-white/70"}`} />
          ))}
        </div>
      )}
    </div>
  );
}



