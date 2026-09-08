"use client";
import Image from "next/image";
import Link from "next/link";
import { img } from "@/lib/img";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/dict";

export function SpotCard({ show, seasonNum, ep }: { show: any; seasonNum: number; ep: any }) {
  const { lang } = useLang();
  const d = t(lang);
  const src = img(ep?.still_path || show.poster_path || (show as any).backdrop_path);
  return (
    <Link href={`/watch?type=tv&id=${show.id}&s=${seasonNum}&e=${ep?.episode_number || 1}`}
      className="block bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-[#008CFF]" style={{ flex: "0 0 300px" }}>
      <Image src={src} alt={show.name} width={480} height={270} className="w-full aspect-video object-cover" loading="lazy" />
      <div className="p-2">
        <p className="text-sm font-bold truncate">{show.name} · {d.tv_t}{seasonNum}{d.ep_e}{ep?.episode_number ?? 1}</p>
        <p className="text-xs text-zinc-400 line-clamp-2">{ep?.name ? ep.name + " — " : ""}{ep?.overview || show.overview || ""}</p>
        <span className="text-xs text-[#008CFF] font-bold inline-flex items-center gap-1 mt-1">▶ {d.ver_episodio}</span>
      </div>
    </Link>
  );
}

export function episodeSpotCard({ show, seasonNum, ep }: { show: any; seasonNum: number; ep: any }) {
  return <SpotCard show={show} seasonNum={seasonNum} ep={ep} />;
}
