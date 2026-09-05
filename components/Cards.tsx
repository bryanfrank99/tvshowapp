"use client";
import Image from "next/image";
import Link from "next/link";
import { img } from "@/lib/tmdb";
import { imdbTitleUrl, type Media } from "@/lib/imdb";
import FavButton from "@/components/FavButton";

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="text-xl font-extrabold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function openImdb(e: React.MouseEvent, imdbId: string) {
  e.preventDefault();
  e.stopPropagation();
  window.open(imdbTitleUrl(imdbId), "_blank", "noopener");
}

export function MediaCard({ item }: { item: Media }) {
  const type = item.media_type || "movie";
  const title = item.title || item.name || "?";
  return (
    <Link href={`/${type}/${item.id}`} className="relative block bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-violet-500 hover:-translate-y-1 transition">
      <FavButton type={type as "movie" | "tv"} id={item.id} title={title} poster={img(item.poster_path ?? null)} />
      <Image src={img(item.poster_path ?? null)} alt={title} width={300} height={450} className="w-full aspect-[2/3] object-cover" loading="lazy" />
      <div className="p-2">
        <p className="text-sm font-semibold truncate">{title}</p>
        <p className="text-xs text-zinc-500">⭐ {Math.round((item.vote_average ?? 0) * 10) / 10}
          {item.imdb_id && <span role="link" tabIndex={0} title={item.imdb_id} className="imdb-badge cursor-pointer" onClick={(e) => openImdb(e, item.imdb_id!)}>IMDb</span>}
        </p>
      </div>
    </Link>
  );
}

export function Top10Card({ item }: { item: Media }) {
  const type = item.media_type || "movie";
  const title = item.title || item.name || "?";
  return (
    <Link href={`/${type}/${item.id}`} className="relative flex gap-3 items-center bg-white/5 border border-white/10 rounded-2xl p-2">
      <span className="text-3xl font-black min-w-10 text-center" style={{ color: "transparent", WebkitTextStroke: "1.5px #f5c518" }}>{item.rank}</span>
      <Image src={img(item.poster_path ?? null)} alt={title} width={56} height={84} className="rounded-lg object-cover" loading="lazy" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold truncate">{title}</p>
        <p className="text-xs text-zinc-500">⭐ {Math.round((item.vote_average ?? 0) * 10) / 10}
          {item.imdb_id ? <span role="link" tabIndex={0} title={item.imdb_id} className="imdb-badge cursor-pointer" onClick={(e) => openImdb(e, item.imdb_id!)}>IMDb ↗</span> : " · sin imdb_id"}
        </p>
      </div>
      <FavButton end type={type as "movie" | "tv"} id={item.id} title={title} poster={img(item.poster_path ?? null)} />
    </Link>
  );
}
