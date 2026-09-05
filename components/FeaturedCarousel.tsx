"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { img } from "@/lib/tmdb";
import { imdbTitleUrl, type Media } from "@/lib/imdb";

export default function FeaturedCarousel({ items }: { items: Media[] }) {
  const [i, setI] = useState(0);
  const router = useRouter();
  const timer = useRef<NodeJS.Timeout | null>(null);
  const n = items.length;
  const go = useCallback((d: number) => setI((v) => (v + d + n) % n), [n]);

  useEffect(() => {
    if (n < 2) return;
    timer.current = setInterval(() => setI((v) => (v + 1) % n), 6000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [n]);

  if (!n) return null;
  const it = items[i];
  const type = it.media_type || "movie";
  const title = it.title || it.name || "?";

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-white/10 h-80 md:h-[30rem] cursor-pointer"
      onClick={() => router.push(`/${type}/${it.id}`)}
      onMouseEnter={() => timer.current && clearInterval(timer.current)}
      onMouseLeave={() => { if (n > 1) timer.current = setInterval(() => setI((v) => (v + 1) % n), 6000); }}
    >
      {items.map((f, k) => (
        <Image
          key={String(f.id)}
          src={img(f.backdrop_path || f.poster_path, "original")}
          alt={f.title || f.name || ""}
          fill
          priority={k === 0}
          className={`object-cover transition-opacity duration-700 ${k === i ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      <div className="absolute bottom-0 p-5 md:p-7 max-w-2xl">
        <p className="text-[#f5c518] text-xs font-bold uppercase tracking-widest mb-1">Featured today</p>
        <Link href={`/${type}/${it.id}`} className="hover:text-violet-300">
          <h3 className="text-2xl md:text-4xl font-black drop-shadow">{title}</h3>
        </Link>
        <p className="text-sm text-zinc-300 mt-1">
          ⭐ {Math.round((it.vote_average ?? 0) * 10) / 10}
          {it.imdb_id && <a className="imdb-badge" target="_blank" rel="noopener" href={imdbTitleUrl(it.imdb_id)} onClick={(e) => e.stopPropagation()}>IMDb {it.imdb_id} ↗</a>}
        </p>
      </div>
      {n > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Anterior" className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 border border-white/20 hover:bg-violet-600">‹</button>
          <button onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Siguiente" className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 border border-white/20 hover:bg-violet-600">›</button>
          <div className="absolute bottom-3 right-4 flex gap-1.5">
            {items.map((_, k) => (
              <button key={k} onClick={(e) => { e.stopPropagation(); setI(k); }} aria-label={`Ir a ${k + 1}`} className={`h-1.5 rounded-full transition-all ${k === i ? "w-6 bg-[#f5c518]" : "w-1.5 bg-white/40 hover:bg-white/70"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
