"use client";
import Image from "next/image";
import Link from "next/link";
import { img } from "@/lib/img";
import type { Media } from "@/lib/ids";
import FavButton from "@/components/FavButton";
import { IconStar, IconPlay } from "@/components/Icons";
import { useLang } from "@/hooks/useLang";
import { useIsTV } from "@/hooks/useIsTV";
import { t } from "@/lib/dict";

export function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="text-xl font-extrabold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export type MediaCardProps = {
  item: Media | any;
  href?: string;
  subtitle?: React.ReactNode;
  extraMeta?: React.ReactNode;
  actionButton?: React.ReactNode;
  hideFav?: boolean;
  className?: string;
};

export function MediaCard({
  item,
  href,
  subtitle,
  extraMeta,
  actionButton,
  hideFav = false,
  className = "",
}: MediaCardProps) {
  const type = (item.media_type || (item as any).type || "movie") as "movie" | "tv";
  const title = item.title || item.name || "?";
  const posterSrc = img(item.poster_path || (item as any).poster || null);
  const rawRating = item.vote_average ?? (item as any).rating ?? 0;
  const rating = Number(rawRating);
  const targetHref = href || `/title?type=${type}&id=${item.id}`;
  const { lang } = useLang();
  const d = t(lang);
  const isTV = useIsTV();

  return (
    <Link
      href={targetHref}
      className={`group relative block bg-zinc-900/60 border border-white/10 rounded-2xl overflow-hidden hover:border-[#008CFF]/80 active:scale-[0.97] transition-all duration-200 shadow-sm hover:shadow-[0_8px_25px_rgba(0,0,0,0.4)] touch-manipulation select-none ${className}`.trim()}
    >
      {/* Botón de acción en la esquina superior derecha */}
      {actionButton ? (
        <div className="absolute top-2 right-2 z-20">
          {actionButton}
        </div>
      ) : !isTV && !hideFav ? (
        <div className="absolute top-2 right-2 z-20">
          <FavButton
            focusable={false}
            type={type}
            id={item.id}
            title={title}
            poster={posterSrc}
            rating={rating}
          />
        </div>
      ) : null}

      {/* Contenedor de Póster con proporción estricta 2:3 */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-900">
        {/* Insignia de Calificación en la esquina superior izquierda */}
        {rating > 0 && (
          <span className="absolute top-2 left-2 z-10 text-[11px] font-bold bg-black/65 backdrop-blur-md border border-white/10 text-white rounded-lg px-2 py-0.5 inline-flex items-center gap-1 shadow-md pointer-events-none">
            <IconStar size={11} className="text-[#f5c518]" />
            {Math.round(rating * 10) / 10}
          </span>
        )}

        <Image
          src={posterSrc}
          alt={title}
          width={300}
          height={450}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Gradiente inferior suave */}
        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-zinc-950/80 via-zinc-950/20 to-transparent pointer-events-none" />

        {/* Botón flotante de reproducción en hover */}
        <span className="absolute inset-0 m-auto w-12 h-12 rounded-full opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 flex items-center justify-center bg-gradient-to-br from-[#008CFF] to-[#008CFF]/80 shadow-[0_0_24px_rgba(0,140,255,0.7)] ring-1 ring-white/40 pointer-events-none">
          <IconPlay size={20} className="ml-0.5 text-white" />
        </span>
      </div>

      {/* Metadatos y textos */}
      <div className="p-2.5 sm:p-3">
        <p className="text-xs sm:text-sm font-semibold truncate text-zinc-100 group-hover:text-[#008CFF] transition-colors" title={title}>
          {title}
        </p>
        <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 truncate">
          {subtitle || (type === "tv" ? d.serie : d.pelicula)}
        </p>
        {extraMeta && (
          <p className="text-[10px] sm:text-[11px] text-zinc-500 mt-0.5 truncate">
            {extraMeta}
          </p>
        )}
      </div>
    </Link>
  );
}

export function Top10Card({ item }: { item: Media }) {
  const type = item.media_type || "movie";
  const title = item.title || item.name || "?";
  const isTV = useIsTV();
  const { lang } = useLang();
  const d = t(lang);
  const rating = Number(item.vote_average ?? 0);
  const overview = item.overview || (item as any).description || "";

  return (
    <Link
      href={`/title?type=${type}&id=${item.id}`}
      className="group relative flex gap-3.5 items-center bg-zinc-900/60 border border-white/10 rounded-2xl p-3 hover:border-[#008CFF]/80 active:scale-[0.98] transition-all duration-200 touch-manipulation"
    >
      <span
        className="text-3xl sm:text-4xl font-black min-w-10 text-center select-none"
        style={{ color: "transparent", WebkitTextStroke: "1.5px #f5c518" }}
      >
        {item.rank}
      </span>
      <div className="relative shrink-0 overflow-hidden rounded-xl bg-zinc-900">
        <Image
          src={img(item.poster_path ?? null)}
          alt={title}
          width={64}
          height={96}
          className="w-16 aspect-[2/3] object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold truncate group-hover:text-[#008CFF] transition-colors" title={title}>
          {title}
        </p>
        <p className="text-xs text-zinc-400 mt-1 inline-flex items-center gap-2">
          {rating > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-black/65 backdrop-blur-md px-1.5 py-0.5 rounded-md text-white border border-white/10">
              <IconStar size={10} className="text-[#f5c518]" />
              {Math.round(rating * 10) / 10}
            </span>
          )}
          <span>{type === "tv" ? d.serie : d.pelicula}</span>
        </p>
        {overview && (
          <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed">
            {overview}
          </p>
        )}
      </div>
      {!isTV && (
        <FavButton
          end
          focusable={false}
          type={type as "movie" | "tv"}
          id={item.id}
          title={title}
          poster={img(item.poster_path ?? null)}
          rating={rating}
        />
      )}
    </Link>
  );
}







