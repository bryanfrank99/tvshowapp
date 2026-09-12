export const dynamic = "force-dynamic";

import { getKids, getKidsMovies, getKidsSeries } from "@/lib/catalog";
import { Section, MediaCard } from "@/components/Cards";
import { MoreGrid } from "@/components/More";
import { IconKids, IconFilm, IconTv } from "@/components/Icons";
import { getLang } from "@/lib/tmdb";
import { t } from "@/lib/dict";

export default async function KidsPage() {
  const d = t(getLang());
  const [kidsAll, kidsMovies, kidsSeries] = await Promise.all([
    getKids(1, 24),
    getKidsMovies(1, 14),
    getKidsSeries(1, 14),
  ]);

  return (
    <div className="space-y-6">
      {/* Cabecera temática Kids */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-pink-500/10 to-[#008CFF]/10 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-pink-500 to-[#008CFF] flex items-center justify-center text-white shadow-lg shadow-pink-500/25 shrink-0">
            <IconKids size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                KIDS
              </h1>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                {d.kids_title}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              {d.kids_desc}
            </p>
          </div>
        </div>
      </div>

      {/* Carril de Películas Infantiles */}
      {kidsMovies.items.length > 0 && (
        <Section title={<span className="inline-flex items-center gap-2"><IconFilm className="text-amber-400" />{d.kids_movies_rail}</span>}>
          <div className="rail">
            {kidsMovies.items.map((x: any) => (
              <MediaCard key={`km-${x.id}`} item={x} />
            ))}
          </div>
        </Section>
      )}

      {/* Carril de Series Infantiles */}
      {kidsSeries.items.length > 0 && (
        <Section title={<span className="inline-flex items-center gap-2"><IconTv className="text-pink-400" />{d.kids_series_rail}</span>}>
          <div className="rail">
            {kidsSeries.items.map((x: any) => (
              <MediaCard key={`ks-${x.id}`} item={x} />
            ))}
          </div>
        </Section>
      )}

      {/* Catálogo Unificado: Películas y Series juntas con paginación */}
      <Section title={<span className="inline-flex items-center gap-2"><IconKids className="text-[#008CFF]" />{d.kids_all_section}</span>}>
        <MoreGrid initial={kidsAll.items} source="kids" />
      </Section>
    </div>
  );
}
