export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { img } from "@/lib/img";
import { getFeaturedToday, getEpisodeSpotlight, getTopPicks, getUpcoming, getTop10ImdbWeek } from "@/lib/catalog";
import { Section, MediaCard, Top10Card } from "@/components/Cards";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import { IconSparkles, IconFilm, IconFire, IconCalendar, IconTrophy, IconPlay } from "@/components/Icons";
import { getLang } from "@/lib/tmdb";
import { t } from "@/lib/dict";

const T = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <span className="inline-flex items-center gap-2">{icon}{text}</span>
);

export default async function Home() {
  const d = t(getLang());
  const [feat, spot, picks, upcoming, top10] = await Promise.all([
    getFeaturedToday(5), getEpisodeSpotlight(6),
    getTopPicks(12), getUpcoming(12), getTop10ImdbWeek(),
  ]);
  return (
    <>
      <Section title={<T icon={<IconSparkles className="text-[#f5c518]" />} text={d.feat} />}>
        <FeaturedCarousel items={feat} />
      </Section>
      <Section title={<T icon={<IconFilm className="text-[#008CFF]" />} text={d.spotlight} />}>
        <div className="rail">
          {spot.map(({ show, seasonNum, ep }: any) => (
            <Link key={String(show.id)} href={`/watch?type=tv&id=${show.id}&s=${seasonNum}&e=${ep?.episode_number || 1}`}
              className="block bg-white/5 border border-white/10 rounded-2xl overflow-hidden" style={{ flex: "0 0 300px" }}>
              <Image src={img(ep?.still_path || show.poster_path)} alt={show.name} width={480} height={270} className="w-full aspect-video object-cover" loading="lazy" />
              <div className="p-2">
                <p className="text-sm font-bold truncate">{show.name} · {d.tv_t}{seasonNum}{d.ep_e}{ep?.episode_number ?? 1}</p>
                <p className="text-xs text-zinc-400 line-clamp-2">{ep?.name ? ep.name + " — " : ""}{ep?.overview || show.overview || ""}</p>
                <span className="text-xs text-[#008CFF] font-bold inline-flex items-center gap-1 mt-1"><IconPlay size={12} />{d.ver_episodio}</span>
              </div>
            </Link>
          ))}
        </div>
      </Section>
      <Section title={<T icon={<IconFire className="text-orange-400" />} text={d.toppicks} />}>
        <div className="rail">{picks.map((x: any) => <MediaCard key={String(x.id)} item={x} />)}</div>
      </Section>
      <Section title={<T icon={<IconCalendar className="text-[#008CFF]" />} text={d.upcoming} />}>
        <div className="rail">{upcoming.map((x: any) => <MediaCard key={String(x.id)} item={x} />)}</div>
      </Section>
      <Section title={<T icon={<IconTrophy className="text-[#f5c518]" />} text={d.top10} />}>
        <div className="grid md:grid-cols-2 gap-3">{top10.map((x: any) => <Top10Card key={String(x.id)} item={x} />)}</div>
      </Section>
    </>
  );
}



