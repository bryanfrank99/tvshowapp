export const dynamic = "force-dynamic";

import { getByGenre } from "@/lib/catalog";
import { Section, MediaCard } from "@/components/Cards";
import { getLang } from "@/lib/tmdb";
import { t } from "@/lib/dict";

export default async function GenrePage({ searchParams }: { searchParams: { id?: string; name?: string } }) {
  const d = t(getLang());
  const name = searchParams.name || "";
  const items = await getByGenre(searchParams.id || "0", name);
  const movies = items.filter((x: any) => x.media_type === "movie");
  const series = items.filter((x: any) => x.media_type !== "movie");
  return (
    <>
      <h1 className="text-2xl font-black mb-4">{name}</h1>
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
      {!items.length && <p className="text-sm text-zinc-500">{d.search_no_results}</p>}
    </>
  );
}
