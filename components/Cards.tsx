"use client";
import Image from "next/image";
import Link from "next/link";
import { img } from "@/lib/img";
import type { Media } from "@/lib/ids";
import FavButton from "@/components/FavButton";
import { IconStar, IconPlay } from "@/components/Icons";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/dict";

export function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="text-xl font-extrabold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function MediaCard({ item }: { item: Media }) {
  const type = item.media_type || "movie";
  const title = item.title || item.name || "?";
  const { lang } = useLang();
  const d = t(lang);
  return (
    <Link href={`/title?type=${type}&id=${item.id}`} className="group relative block bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-[#008CFF] hover:-translate-y-1 transition">
      <FavButton focusable={false} type={type as "movie" | "tv"} id={item.id} title={title} poster={img(item.poster_path ?? null)} rating={item.vote_average ?? 0} />
      <Image src={img(item.poster_path ?? null)} alt={title} width={300} height={450} className="w-full aspect-[2/3] object-cover" loading="lazy" />
      <span className="absolute top-1.5 right-1.5 text-[11px] font-bold bg-black/70 rounded-md px-1.5 py-0.5 inline-flex items-center gap-1"><IconStar size={11} className="text-[#f5c518]" />{Math.round((item.vote_average ?? 0) * 10) / 10}</span>
      <span className="absolute inset-0 m-auto w-14 h-14 rounded-full hidden group-hover:flex items-center justify-center bg-gradient-to-br from-[#008CFF] to-[#008CFF]/70 shadow-[0_0_24px_rgba(0,140,255,0.7)] ring-1 ring-white/40">
        <IconPlay size={22} className="ml-0.5 text-white" />
      </span>
      <div className="p-2">
        <p className="text-sm font-semibold truncate">{title}</p>
        <p className="text-xs text-zinc-500">{type === "tv" ? d.serie : d.pelicula}</p>
      </div>
    </Link>
  );
}

export function Top10Card({ item }: { item: Media }) {
  const type = item.media_type || "movie";
  const title = item.title || item.name || "?";
  const { lang } = useLang();
  const d = t(lang);
  return (
    <Link href={`/title?type=${type}&id=${item.id}`} className="relative flex gap-3 items-center bg-white/5 border border-white/10 rounded-2xl p-2">
      <span className="text-3xl font-black min-w-10 text-center" style={{ color: "transparent", WebkitTextStroke: "1.5px #f5c518" }}>{item.rank}</span>
      <Image src={img(item.poster_path ?? null)} alt={title} width={56} height={84} className="rounded-lg object-cover" loading="lazy" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold truncate">{title}</p>
        <p className="text-xs text-zinc-500 inline-flex items-center gap-1"><IconStar size={11} className="text-[#f5c518]" />{Math.round((item.vote_average ?? 0) * 10) / 10}</p>
      </div>
      <FavButton end focusable={false} type={type as "movie" | "tv"} id={item.id} title={title} poster={img(item.poster_path ?? null)} rating={item.vote_average ?? 0} />
    </Link>
  );
}







