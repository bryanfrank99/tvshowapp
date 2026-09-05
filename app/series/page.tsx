export const dynamic = "force-dynamic";

import { getSeries } from "@/lib/catalog";
import { Section, MediaCard } from "@/components/Cards";
import { IconTv } from "@/components/Icons";

export default async function SeriesPage() {
  const series = await getSeries(24);
  return (
    <Section title={<span className="inline-flex items-center gap-2"><IconTv className="text-violet-400" />Series</span>}>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {series.map((x: any) => <MediaCard key={String(x.id)} item={x} />)}
      </div>
    </Section>
  );
}
