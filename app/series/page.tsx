export const dynamic = "force-dynamic";

import { getSeries } from "@/lib/catalog";
import { Section } from "@/components/Cards";
import { MoreGrid } from "@/components/More";
import { IconTv } from "@/components/Icons";
import { getLang } from "@/lib/tmdb";
import { t } from "@/lib/dict";

export default async function SeriesPage() {
  const d = t(getLang());
  const first = await getSeries(1, 24);
  return (
    <Section title={<span className="inline-flex items-center gap-2"><IconTv className="text-[#008CFF]" />{d.series}</span>}>
      <MoreGrid initial={first.items} source="series" />
    </Section>
  );
}
