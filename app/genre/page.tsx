export const dynamic = "force-dynamic";

import { getByGenre } from "@/lib/catalog";
import { Section } from "@/components/Cards";
import { MoreGrid } from "@/components/More";
import { getLang } from "@/lib/tmdb";
import { t } from "@/lib/dict";

export default async function GenrePage({ searchParams }: { searchParams: { id?: string; name?: string } }) {
  const d = t(getLang());
  const gid = searchParams.id || "0";
  const name = searchParams.name || "";
  const first = await getByGenre(gid, name, 1, 24);
  return (
    <>
      <h1 className="text-2xl font-black mb-4">{name}</h1>
      <Section title={d.movies}>
        <MoreGrid initial={first.items.filter((x: any) => x.media_type === "movie")} source="genre" params={{ id: gid, name }} />
      </Section>
      <Section title={d.series}>
        <MoreGrid initial={first.items.filter((x: any) => x.media_type !== "movie")} source="genre" params={{ id: gid, name }} />
      </Section>
      {!first.items.length && <p className="text-sm text-zinc-500">{d.search_no_results}</p>}
    </>
  );
}
