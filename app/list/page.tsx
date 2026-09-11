"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useFavorites } from "@/hooks/useFavorites";
import ContinueWatching from "@/components/ContinueWatching";
import { IconFilm, IconTv, IconHeart, IconX } from "@/components/Icons";
import { MediaCard } from "@/components/Cards";
import { GridSkeleton } from "@/components/Skeleton";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/dict";

export default function ListPage() {
  const { favs, remove } = useFavorites();
  const { lang } = useLang();
  const d = t(lang);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <GridSkeleton n={6} />;

  const movies = favs.filter((f) => f.type === "movie");
  const series = favs.filter((f) => f.type === "tv");
  const block = (icon: React.ReactNode, text: string, arr: typeof favs) => (
    <section className="mb-8">
      <h2 className="text-xl font-extrabold mb-3 inline-flex items-center gap-2">{icon}{text} ({arr.length})</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {arr.map((f) => (
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
                className="w-8 h-8 rounded-full bg-black/65 backdrop-blur-md border border-white/20 hover:bg-red-600 hover:border-red-600 active:scale-90 transition-all flex items-center justify-center text-white shadow-md cursor-pointer"
              >
                <IconX size={12} />
              </button>
            }
          />
        ))}
      </div>
    </section>
  );

  return (
    <>
      <ContinueWatching />
      {!favs.length && (
        <div className="text-center py-16">
          <p className="mb-3 flex justify-center text-zinc-600"><IconHeart size={44} filled={false} /></p>
          <h1 className="text-2xl font-black">{d.mi_lista_vacia}</h1>
          <p className="text-sm text-zinc-400 mt-2">{d.mi_lista_hint}</p>
          <Link href="/" className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-[#008CFF] font-bold">{d.explorar}</Link>
        </div>
      )}
      {series.length > 0 && block(<IconTv className="text-[#008CFF]" />, d.series, series)}
      {movies.length > 0 && block(<IconFilm className="text-[#008CFF]" />, d.movies, movies)}
    </>
  );
}

