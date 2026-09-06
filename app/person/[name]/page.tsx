export const dynamic = "force-dynamic";

import Image from "next/image";
import { getPersonWorks } from "@/lib/catalog";
import { Section, MediaCard } from "@/components/Cards";
import { getLang, hasKey } from "@/lib/tmdb";
import { t } from "@/lib/dict";
import { img } from "@/lib/img";

export default async function PersonPage({ params }: { params: { name: string } }) {
  const d = t(getLang());
  const name = decodeURIComponent(params.name);
  const { person, works } = await getPersonWorks(name);
  const movies = works.filter((x: any) => x.media_type === "movie");
  const series = works.filter((x: any) => x.media_type !== "movie");
  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        {person.photo && (
          <Image src={img(person.photo)} alt={person.name} width={120} height={120} className="w-20 h-20 rounded-full object-cover border-2 border-white/10" />
        )}
        <div>
          <h1 className="text-2xl font-black">{person.name}</h1>
          {person.known && <p className="text-sm text-zinc-400">{person.known}</p>}
        </div>
      </div>
      {movies.length > 0 && (
        <Section title={d.movies}>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {movies.map((x: any) => <MediaCard key={`m-${x.id}`} item={x} />)}
          </div>
        </Section>
      )}
      {series.length > 0 && (
        <Section title={d.series}>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {series.map((x: any) => <MediaCard key={`s-${x.id}`} item={x} />)}
          </div>
        </Section>
      )}
      {!works.length && <p className="text-sm text-zinc-500">{d.search_no_results}</p>}
      {!hasKey() && (
        <p className="text-xs text-zinc-600 mt-4">Modo free: solo series (TVMaze). Con key de TMDB también verías películas.</p>
      )}
    </>
  );
}
