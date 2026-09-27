export const dynamic = "force-dynamic";

import { getFeaturedToday, getMovies, getSeries, getTop10TmdbWeek } from "@/lib/catalog";
import { Section, MediaCard, Top10Card } from "@/components/Cards";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import { IconSparkles, IconFilm, IconTv, IconTrophy } from "@/components/Icons";
import { getLang } from "@/lib/tmdb";
import { t } from "@/lib/dict";

const T = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <span className="inline-flex items-center gap-2">{icon}{text}</span>
);

export default async function Home() {
  const d = t(getLang());
  const [feat, popMovies, popSeries, top10] = await Promise.all([
    getFeaturedToday(1, 5),
    getMovies(1, 12),
    getSeries(1, 12),
    getTop10TmdbWeek(),
  ]);
  return (
    <>
      <Section title={<T icon={<IconSparkles className="text-[#f5c518]" />} text={d.feat} />}>
        <FeaturedCarousel items={feat.items} />
      </Section>
      <Section title={<T icon={<IconFilm className="text-[#008CFF]" />} text={d.popular_movies} />}>
        <div className="rail">{popMovies.items.map((x: any) => <MediaCard key={String(x.id)} item={x} />)}</div>
      </Section>
      <Section title={<T icon={<IconTv className="text-[#008CFF]" />} text={d.popular_series} />}>
        <div className="rail">{popSeries.items.map((x: any) => <MediaCard key={String(x.id)} item={x} />)}</div>
      </Section>
      <Section title={<T icon={<IconTrophy className="text-[#f5c518]" />} text={d.top10} />}>
        <div className="grid top10 md:grid-cols-2 gap-3">{top10.map((x: any) => <Top10Card key={String(x.id)} item={x} />)}</div>
      </Section>
    </>
  );
}

