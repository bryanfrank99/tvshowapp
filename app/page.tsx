export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { img } from "@/lib/tmdb";
import { getFeaturedToday, getEpisodeSpotlight, getTopPicks, getUpcoming, getTop10ImdbWeek } from "@/lib/catalog";
import { Section, MediaCard, Top10Card } from "@/components/Cards";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import ContinueWatching from "@/components/ContinueWatching";
import MyList from "@/components/MyList";

export default async function Home() {
  const [feat, spot, picks, upcoming, top10] = await Promise.all([
    getFeaturedToday(5), getEpisodeSpotlight(6),
    getTopPicks(12), getUpcoming(12), getTop10ImdbWeek(),
  ]);
  return (
    <>
      <ContinueWatching />
      <MyList />
      <Section title="⭐ Featured today">
        <FeaturedCarousel items={feat} />
      </Section>
      <Section title="🎬 Episode Spotlight">
        <div className="rail">
          {spot.map(({ show, seasonNum, ep }: any) => (
            <Link key={String(show.id)} href={`/watch?type=tv&id=${show.id}&s=${seasonNum}&e=${ep?.episode_number || 1}`}
              className="block bg-white/5 border border-white/10 rounded-2xl overflow-hidden" style={{ flex: "0 0 300px" }}>
              <Image src={img(ep?.still_path || show.poster_path)} alt={show.name} width={480} height={270} className="w-full aspect-video object-cover" loading="lazy" />
              <div className="p-2">
                <p className="text-sm font-bold truncate">{show.name} · T{seasonNum}E{ep?.episode_number ?? 1}</p>
                <p className="text-xs text-zinc-400 line-clamp-2">{ep?.name ? ep.name + " — " : ""}{ep?.overview || show.overview || ""}</p>
                <span className="text-xs text-violet-300 font-bold">▶ Ver episodio</span>
              </div>
            </Link>
          ))}
        </div>
      </Section>
      <Section title="🎯 Top picks">
        <div className="rail">{picks.map((x: any) => <MediaCard key={String(x.id)} item={x} />)}</div>
      </Section>
      <Section title="⏳ Upcoming">
        <div className="rail">{upcoming.map((x: any) => <MediaCard key={String(x.id)} item={x} />)}</div>
      </Section>
      <Section title="🏆 Top 10 on IMDb this week">
        <div className="grid md:grid-cols-2 gap-3">{top10.map((x: any) => <Top10Card key={String(x.id)} item={x} />)}</div>
      </Section>
    </>
  );
}

