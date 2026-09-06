export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { tmdb, hasKey, getLang } from "@/lib/tmdb";
import { img } from "@/lib/img";
import { getImdbId, imdbTitleUrl } from "@/lib/imdb";
import { isImdbId, cineMeta, cineSeriesDetail, cineSeasons, cineEpisodes } from "@/lib/free";
import FavButton from "@/components/FavButton";
import ContinueSeriesButton from "@/components/ContinueSeriesButton";
import TrailerButton from "@/components/TrailerButton";
import ScoreRing from "@/components/ScoreRing";
import { IconStar } from "@/components/Icons";
import { t } from "@/lib/dict";
import { getTitle, saveTitle, getEpisodes, saveSeason, certOf } from "@/lib/db";

export default async function TvPage({ params, searchParams }: { params: { id: string }; searchParams: { season?: string } }) {
  const lang = getLang();
  const d = t(lang);
  const useFree = isImdbId(params.id) || !hasKey();
  let s: any;
  let det: any;
  if (useFree) {
    const meta = await cineMeta("series", params.id);
    s = cineSeriesDetail(meta, params.id);
    const seasons = cineSeasons(meta);
    const sel = parseInt(searchParams.season || String(seasons[0]?.season_number || 1));
    det = { episodes: cineEpisodes(meta, sel) };
    return render(s, det, params.id, sel, seasons, params.id);
  }
  // SQLite primero (caché 7 días), TMDB si falta o caducó.
  const cached = !useFree && getTitle("tv", params.id, lang);
  s = useFree ? null : cached || await tmdb(`/tv/${params.id}?append_to_response=credits,videos,content_ratings`);
  if (!useFree && !cached) {
    const imdb0 = await getImdbId("tv", params.id);
    saveTitle("tv", params.id, lang, s, imdb0, {
      cast: (s.credits?.cast || []).slice(0, 20),
      crew: (s.credits?.crew || []).slice(0, 20),
    });
    (s as any).imdb_id = imdb0;
  }
  const imdbId = useFree ? params.id : ((s as any).imdb_id || await getImdbId("tv", params.id));
  const seasons = useFree ? [] : (s.seasons_info?.length ? s.seasons_info : s.seasons).filter((x: any) => x.season_number > 0);
  const sel = parseInt(searchParams.season || String(seasons[0]?.season_number || 1));
  if (!useFree) {
    const cachedEps = getEpisodes(params.id, sel, lang);
    if (cachedEps) {
      det = { episodes: cachedEps.map((e: any) => ({ episode_number: e.episode, name: e.name, overview: e.overview, still_path: e.still_path, vote_average: e.vote_average, air_date: e.air_date })) };
    } else {
      det = await tmdb(`/tv/${params.id}/season/${sel}`);
      saveSeason(params.id, sel, lang, det);
    }
  }
  return render(s, det, params.id, sel, seasons, imdbId);

  function render(s: any, det: any, id: string, sel: number, seasons: any[], imdbId: string | null) {
    const year = (s.first_air_date || "").slice(0, 4);
    const genres: { id: any; name: string }[] = (s.genres || []).map((g: any) =>
      typeof g === "string" ? { id: g, name: g } : { id: g.id, name: g.name });
    const creators = (s.created_by || []).slice(0, 3);
    const cast = (s.credits?.cast || []).slice(0, 10);
    const vids = Array.isArray(s.videos) ? s.videos : (s.videos?.results || []);
    const trailer = vids.find((v: any) => v.key && (!v.site || v.site === "YouTube"));
    const trailerKey = trailer?.key || "";
    const cert = s.certification || certOf(s);
    const nS = s.number_of_seasons ?? seasons.length;
    const nE = s.number_of_episodes ?? det.episodes?.length;
    return (
      <>
        <div className="relative -mx-3 sm:-mx-4 -mt-4 sm:-mt-6 px-3 sm:px-4 pt-8 sm:pt-12 pb-8 overflow-hidden">
          {s.backdrop_path && (
            <>
              <Image src={img(s.backdrop_path, "original")} alt="" fill className="object-cover object-top opacity-30" priority />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b10] via-[#0b0b10]/60 to-[#0b0b10]/20" />
            </>
          )}
          <div className="relative grid md:grid-cols-[220px_1fr] gap-6">
            <Image src={img(s.poster_path)} alt={s.name} width={440} height={660} className="rounded-2xl w-full max-w-[220px] sm:max-w-none mx-auto md:mx-0" />
            <div className="min-w-0">
              <h1 className="text-3xl font-black">{s.name} {year && <span className="font-light text-zinc-400">({year})</span>}</h1>
              <p className="text-sm text-zinc-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                {cert && <span className="border border-white/30 rounded px-1.5 text-xs">{cert}</span>}
                {s.first_air_date && <span>{s.first_air_date}</span>}
                {genres.length > 0 && <span>· {genres.map((g) => g.name).join(", ")}</span>}
                {nS != null && <span>· {nS}{d.det_seasons}</span>}
                {nE != null && <span>· {nE}{d.det_episodes}</span>}
                {imdbId && <a className="imdb-badge" target="_blank" rel="noopener" href={imdbTitleUrl(imdbId)}>IMDb ↗</a>}
              </p>
              <div className="flex items-center gap-4 mt-4 flex-wrap">
                <span className="inline-flex items-center gap-2">
                  <ScoreRing value={s.vote_average || 0} />
                  <span className="text-sm font-bold leading-tight">{d.score}<br />TMDB</span>
                </span>
                {trailerKey && <TrailerButton videoKey={trailerKey} label={d.ver_trailer} />}
              </div>
              <div className="flex gap-2 mt-4 flex-wrap items-center">
                <ContinueSeriesButton id={id} />
                <FavButton big type="tv" id={id} title={s.name} poster={img(s.poster_path)} />
              </div>
              {s.tagline && <p className="mt-4 italic text-zinc-400">{s.tagline}</p>}
              <h2 className="text-lg font-bold mt-3">{d.overview_h}</h2>
              <p className="mt-1 text-zinc-300 text-sm">{s.overview || d.sin_sinopsis}</p>
              {creators.length > 0 && (
                <div className="flex gap-8 mt-4 flex-wrap">
                  {creators.map((c: any) => (
                    <div key={c.id || c.name}>
                      <Link href={`/person/${encodeURIComponent(c.name)}`} className="font-bold text-sm hover:text-[#008CFF]">{c.name}</Link>
                      <p className="text-xs text-zinc-500">Creator</p>
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
              <div className="flex gap-2 mt-4 flex-wrap">{seasons.map((x: any) => (
                <Link key={x.season_number} href={`/tv/${id}?season=${x.season_number}`}
                  className={`text-xs px-3 py-1.5 rounded-full border ${x.season_number === sel ? "bg-[#008CFF] border-[#008CFF] text-white" : "border-white/15 bg-white/5"}`}>{d.tv_t}{x.season_number} ({x.episode_count})</Link>))}</div>
            </div>
          </div>
        </div>
        <h2 className="mt-6 mb-3 font-bold">{d.capitulos} {d.tv_t}{sel}</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {det.episodes.map((ep: any) => (
            <Link key={ep.episode_number} href={`/watch?type=tv&id=${id}&s=${sel}&e=${ep.episode_number}`} className="flex gap-3 bg-white/5 border border-white/10 rounded-2xl p-2 hover:border-[#008CFF]">
              <Image src={img(ep.still_path || s.poster_path)} alt={ep.name} width={224} height={126} className="w-28 rounded-xl object-cover" loading="lazy" />
              <div className="min-w-0">
                <p className="font-bold text-sm">{d.ep_e}{ep.episode_number} · {ep.name}</p>
                <p className="text-xs text-zinc-500 inline-flex items-center gap-1"><IconStar size={11} className="text-[#f5c518]" />{Math.round((ep.vote_average || 0) * 10) / 10} · {ep.air_date || ""}</p>
                <p className="text-xs text-zinc-400 line-clamp-2">{ep.overview || d.sin_desc}</p>
              </div>
            </Link>
          ))}
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
}


