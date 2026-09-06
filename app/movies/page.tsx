export const dynamic = "force-dynamic";

import { getMovies } from "@/lib/catalog";
import { Section, MediaCard } from "@/components/Cards";
import { IconFilm } from "@/components/Icons";

import { getLang } from "@/lib/tmdb";
import { t } from "@/lib/dict";

export default async function MoviesPage() {
  const d = t(getLang());
  const movies = await getMovies(24);
  return (
    <Section title={<span className="inline-flex items-center gap-2"><IconFilm className="text-[#008CFF]" />{d.movies}</span>}>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {movies.map((x: any) => <MediaCard key={String(x.id)} item={x} />)}
      </div>
    </Section>
  );
}

