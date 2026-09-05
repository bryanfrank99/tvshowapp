"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useFavorites } from "@/hooks/useFavorites";
import ContinueWatching from "@/components/ContinueWatching";
import { IconFilm, IconTv, IconHeart, IconX } from "@/components/Icons";

export default function ListPage() {
  const { favs, remove } = useFavorites();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const movies = favs.filter((f) => f.type === "movie");
  const series = favs.filter((f) => f.type === "tv");
  const block = (icon: React.ReactNode, text: string, arr: typeof favs) => (
    <section className="mb-8">
      <h2 className="text-xl font-extrabold mb-3 inline-flex items-center gap-2">{icon}{text} ({arr.length})</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {arr.map((f) => (
          <div key={`${f.type}-${f.id}`} className="relative bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <Link href={`/${f.type}/${f.id}`} className="block">
              <Image src={f.poster || "https://via.placeholder.com/500x750?text=?"} alt={f.title} width={300} height={450} className="w-full aspect-[2/3] object-cover" loading="lazy" />
              <div className="p-2"><p className="text-sm font-semibold truncate">{f.title}</p></div>
            </Link>
            <button onClick={() => remove(f.type, f.id)} aria-label={`Quitar ${f.title}`}
              className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/70 border border-white/20 hover:bg-red-600 flex items-center justify-center"><IconX size={12} /></button>
          </div>
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
          <h1 className="text-2xl font-black">Mi lista está vacía</h1>
          <p className="text-sm text-zinc-400 mt-2">Toca el corazón en cualquier tarjeta para guardarla aquí.</p>
          <Link href="/" className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-violet-600 font-bold">Explorar</Link>
        </div>
      )}
      {series.length > 0 && block(<IconTv className="text-violet-400" />, "Series", series)}
      {movies.length > 0 && block(<IconFilm className="text-violet-400" />, "Películas", movies)}
    </>
  );
}
