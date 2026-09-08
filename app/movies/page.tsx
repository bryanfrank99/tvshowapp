export const dynamic = "force-dynamic";

import { getMovies } from "@/lib/catalog";
import { Section } from "@/components/Cards";
import { MoreGrid } from "@/components/More";
import { IconFilm } from "@/components/Icons";
import { getLang } from "@/lib/tmdb";
import { t } from "@/lib/dict";

export default async function MoviesPage() {
  const d = t(getLang());
  const first = await getMovies(1, 24);
  return (
    <Section title={<span className="inline-flex items-center gap-2"><IconFilm className="text-[#008CFF]" />{d.movies}</span>}>
      <MoreGrid initial={first.items} source="movies" />
    </Section>
  );
}
