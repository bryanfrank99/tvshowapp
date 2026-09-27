export const dynamic = "force-dynamic";

import { getFeaturedToday, getTrendingToday, getUpcoming, getTop10ImdbWeek } from "@/lib/catalog";
import { Section, MediaCard, Top10Card } from "@/components/Cards";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import { IconSparkles, IconFire, IconTrophy } from "@/components/Icons";
import { getLang } from "@/lib/tmdb";
import { t } from "@/lib/dict";

const T = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <span className="inline-flex items-center gap-2">{icon}{text}</span>
);

export default async function Home() {
  const d = t(getLang());
  const [feat, trending, upcoming, top10] = await Promise.all([
    getFeaturedToday(1, 5),
    getTrendingToday(1, 12),
    getUpcoming(1, 12),
    getTop10ImdbWeek(),
  ]);
  return (
    <>
      <Section title={<T icon={<IconSparkles className="text-[#f5c518]" />} text={d.feat} />}>
        <FeaturedCarousel items={feat.items} />
      </Section>
      <Section title={<T icon={<IconFire className="text-orange-400" />} text={d.toppicks} />}>
        <div className="rail">{trending.items.map((x: any) => <MediaCard key={String(x.id)} item={x} />)}</div>
      </Section>
      <Section title={<T icon={<span className="text-base leading-none">🍿</span>} text={d.upcoming} />}>
        <div className="rail">{upcoming.items.map((x: any) => <MediaCard key={String(x.id)} item={x} />)}</div>
      </Section>
      <Section title={<T icon={<IconTrophy className="text-[#f5c518]" />} text={d.top10} />}>
        <div className="grid top10 md:grid-cols-2 gap-3">{top10.map((x: any) => <Top10Card key={String(x.id)} item={x} />)}</div>
      </Section>
    </>
  );
}

