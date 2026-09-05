export const dynamic = "force-dynamic";

import { tmdb, hasKey } from "@/lib/tmdb";
import { searchAll } from "@/lib/catalog";
import { Section, MediaCard } from "@/components/Cards";

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q || "";
  let res: any[] = [];
  if (q) {
    if (hasKey()) {
      try {
        const r: any = await tmdb(`/search/multi?query=${encodeURIComponent(q)}`, 300);
        res = (r.results || []).filter((x: any) => x.media_type === "movie" || x.media_type === "tv");
      } catch {
        res = await searchAll(q);
      }
    } else {
      res = await searchAll(q);
    }
  }
  return (
    <Section title={`Resultados: ${q}`}>
      <div className="rail">{res.map((x: any) => <MediaCard key={String(x.id)} item={x} />)}</div>
    </Section>
  );
}

