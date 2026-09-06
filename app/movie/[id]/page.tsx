export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { tmdb, hasKey, getLang } from "@/lib/tmdb";
import { img } from "@/lib/img";
import { getImdbId, imdbTitleUrl } from "@/lib/imdb";
import { isImdbId, cineMeta, cineMovieDetail } from "@/lib/free";
import FavButton from "@/components/FavButton";
import TrailerButton from "@/components/TrailerButton";
import ScoreRing from "@/components/ScoreRing";
import { IconPlay } from "@/components/Icons";
import { t } from "@/lib/dict";
import { getTitle, saveTitle, certOf } from "@/lib/db";

const fmtRuntime = (min: any) => {
  const n = Number(min);
  if (!Number.isFinite(n) || n <= 0) return "";
  const h = Math.floor(n / 60);
  const m = n % 60;
  return h ? `${h}h ${m}m` : `${m} min`;
};

export default async function MoviePage({ params }: { params: { id: string } }) {
  const lang = getLang();
  const d = t(lang);
  const useFree = isImdbId(params.id) || !hasKey();
  let m: any;
  let imdbId: string | null;
  if (!useFree) {
    const cached = getTitle("movie", params.id, lang);
    if (cached) {
      m = cached;
      imdbId = cached.imdb_id || null;
    } else {
      m = await tmdb(`/movie/${params.id}?append_to_response=credits,videos,release_dates`);
      imdbId = await getImdbId("movie", params.id);
      m.certification = m.certification || certOf(m);
      saveTitle("movie", params.id, lang, m, imdbId, {
        cast: (m.credits?.cast || []).slice(0, 20),
        crew: (m.credits?.crew || []).slice(0, 20),
      });
    }
    if (!m.certification) m.certification = certOf(m);
  } else {
    m = cineMovieDetail(await cineMeta("movie", params.id), params.id);
    imdbId = params.id;
  }

  const year = (m.release_date || "").slice(0, 4);
  const genres: { id: any; name: string }[] = (m.genres || []).map((g: any) =>
    typeof g === "string" ? { id: g, name: g } : { id: g.id, name: g.name });
  const directors = ((m.credits?.crew || []).filter((c: any) => c.job === "Director" || c.job === "Writer")).slice(0, 3);
  const cast = (m.credits?.cast || []).slice(0, 10);
  const vids = Array.isArray(m.videos) ? m.videos : ((m.videos as any)?.results || []);
  const trailer = vids.find((v: any) => v.key && (!v.site || v.site === "YouTube"));
  const trailerKey = trailer?.key || "";
  const cert = m.certification || "";

  return (
    <>
      <div className="relative -mx-3 sm:-mx-4 -mt-4 sm:-mt-6 px-3 sm:px-4 pt-8 sm:pt-12 pb-8 overflow-hidden">
        {m.backdrop_path && (
          <>
            <Image src={img(m.backdrop_path, "original")} alt="" fill className="object-cover object-top opacity-30" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b10] via-[#0b0b10]/60 to-[#0b0b10]/20" />
          </>
        )}
        <div className="relative grid md:grid-cols-[220px_1fr] gap-6">
        <Image src={img(m.poster_path)} alt={m.title} width={440} height={660} className="rounded-2xl w-full max-w-[220px] sm:max-w-none mx-auto md:mx-0" />
        <div className="min-w-0">
          <h1 className="text-3xl font-black">{m.title} {year && <span className="font-light text-zinc-400">({year})</span>}</h1>
          <p className="text-sm text-zinc-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {cert && <span className="border border-white/30 rounded px-1.5 text-xs">{cert}</span>}
            {m.release_date && <span>{m.release_date}</span>}
            {genres.length > 0 && <span>· {genres.map((g) => g.name).join(", ")}</span>}
            {fmtRuntime(m.runtime) && <span>· {fmtRuntime(m.runtime)}</span>}
            {imdbId && <a className="imdb-badge" target="_blank" rel="noopener" href={imdbTitleUrl(imdbId)}>IMDb ↗</a>}
          </p>
          <div className="flex items-center gap-4 mt-4 flex-wrap">
            <span className="inline-flex items-center gap-2">
              <ScoreRing value={m.vote_average || 0} />
              <span className="text-sm font-bold leading-tight">{d.score}<br />TMDB</span>
            </span>
            {trailerKey && <TrailerButton videoKey={trailerKey} label={d.ver_trailer} />}
          </div>
          <div className="flex gap-2 mt-4 flex-wrap items-center">
            <Link href={`/watch?type=movie&id=${m.id || params.id}`} className="bg-[#008CFF] rounded-xl px-5 py-2.5 font-bold inline-flex items-center gap-2 text-sm"><IconPlay size={15} />{d.ver_ahora_btn}</Link>
            <FavButton big type="movie" id={params.id} title={m.title} poster={img(m.poster_path)} />
          </div>
          {m.tagline && <p className="mt-4 italic text-zinc-400">{m.tagline}</p>}
          <h2 className="text-lg font-bold mt-3">{d.overview_h}</h2>
          <p className="mt-1 text-zinc-300 text-sm">{m.overview || d.sin_sinopsis}</p>
          {directors.length > 0 && (
            <div className="flex gap-8 mt-4 flex-wrap">
              {directors.map((c: any) => (
                <div key={c.id || c.name}>
                  <Link href={`/person/${encodeURIComponent(c.name)}`} className="font-bold text-sm hover:text-[#008CFF]">{c.name}</Link>
                  <p className="text-xs text-zinc-500">{c.job}</p>
                </div>
              ))}
            </div>
          )}
          {genres.length > 0 && (
            <div className="flex gap-1.5 mt-4 flex-wrap">{genres.map((g) => (
              <Link key={g.id} href={`/genre/${typeof g.id === "number" ? g.id : 0}?name=${encodeURIComponent(g.name)}`}
                className="text-xs font-semibold bg-[#008CFF]/15 text-[#008CFF] border border-[#008CFF]/30 rounded-full px-2.5 py-0.5 hover:bg-[#008CFF]/30">{g.name}</Link>
            ))}</div>
          )}
        </div>
      </div>
      </div>

      {cast.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-extrabold mb-3">{d.cast_h}</h2>
          <div className="rail">
            {cast.map((c: any) => (
              <Link key={c.id || c.name} href={`/person/${encodeURIComponent(c.name)}`}
                className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-[#008CFF]" style={{ flex: "0 0 130px" }}>
                <Image src={img(c.photo || c.profile_path, "w185")} alt={c.name} width={260} height={390} className="w-full aspect-[2/3] object-cover" loading="lazy" />
                <div className="p-2">
                  <p className="text-xs font-bold truncate">{c.name}</p>
                  <p className="text-[11px] text-zinc-500 truncate">{c.character || ""}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

    </>
  );
}
