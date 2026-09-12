"use client";
import Image from "next/image";
import Link from "next/link";
import { img } from "@/lib/img";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/dict";

import { IconPlay } from "@/components/Icons";

export function SpotCard({ show, seasonNum, ep }: { show: any; seasonNum: number; ep: any }) {
  const { lang } = useLang();
  const d = t(lang);
  const src = img(ep?.still_path || show.poster_path || (show as any).backdrop_path);
  return (
    <Link
      href={`/watch?type=tv&id=${show.id}&s=${seasonNum}&e=${ep?.episode_number || 1}`}
      className="group relative block bg-zinc-900/60 border border-white/10 rounded-2xl overflow-hidden hover:border-[#008CFF]/80 active:scale-[0.98] transition-[transform,border-color,box-shadow] duration-200 ease-out shadow-sm hover:shadow-[0_8px_20px_rgba(0,0,0,0.35)] touch-manipulation select-none shrink-0"
      style={{ flex: "0 0 280px" }}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
        <Image
          src={src}
          alt={show.name}
          width={480}
          height={270}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-zinc-950/80 to-transparent pointer-events-none" />
        <span className="absolute inset-0 m-auto w-11 h-11 rounded-full opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 flex items-center justify-center bg-gradient-to-br from-[#008CFF] to-[#008CFF]/80 shadow-[0_0_20px_rgba(0,140,255,0.7)] ring-1 ring-white/40 pointer-events-none">
          <IconPlay size={18} className="ml-0.5 text-white" />
        </span>
      </div>
      <div className="p-3">
        <p className="text-xs sm:text-sm font-bold truncate text-zinc-100 group-hover:text-[#008CFF] transition-colors">
          {show.name} · {d.tv_t}{seasonNum}{d.ep_e}{ep?.episode_number ?? 1}
        </p>
        <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
          {ep?.name ? ep.name + " — " : ""}{ep?.overview || show.overview || ""}
        </p>
        <span className="text-xs text-[#008CFF] font-bold inline-flex items-center gap-1 mt-2 group-hover:translate-x-0.5 transition-transform">
          ▶ {d.ver_episodio}
        </span>
      </div>
    </Link>
  );
}

export function episodeSpotCard({ show, seasonNum, ep }: { show: any; seasonNum: number; ep: any }) {
  return <SpotCard show={show} seasonNum={seasonNum} ep={ep} />;
}
