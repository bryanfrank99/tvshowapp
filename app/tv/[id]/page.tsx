export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { tmdb, hasKey, getLang } from "@/lib/tmdb";
import { img } from "@/lib/img";
import { getImdbId, imdbTitleUrl } from "@/lib/imdb";
import { isImdbId, cineMeta, cineSeriesDetail, cineSeasons, cineEpisodes } from "@/lib/free";
import FavButton from "@/components/FavButton";
import ContinueSeriesButton from "@/components/ContinueSeriesButton";
import { IconStar } from "@/components/Icons";
import { t } from "@/lib/dict";

export default async function TvPage({ params, searchParams }: { params: { id: string }; searchParams: { season?: string } }) {
  const d = t(getLang());
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
  s = await tmdb(`/tv/${params.id}?append_to_response=credits`);
  const imdbId = await getImdbId("tv", params.id);
  const seasons = s.seasons.filter((x: any) => x.season_number > 0);
  const sel = parseInt(searchParams.season || String(seasons[0]?.season_number || 1));
  det = await tmdb(`/tv/${params.id}/season/${sel}`);
  return render(s, det, params.id, sel, seasons, imdbId);

  function render(s: any, det: any, id: string, sel: number, seasons: any[], imdbId: string | null) {
    return (
      <>
        <div className="grid md:grid-cols-[220px_1fr] gap-6">
          <Image src={img(s.poster_path)} alt={s.name} width={440} height={660} className="rounded-2xl w-full max-w-[220px] sm:max-w-none mx-auto md:mx-0" />
          <div>
            <h1 className="text-3xl font-black">{s.name}</h1>
            <p className="text-sm text-zinc-400 mt-1 inline-flex items-center gap-1.5 flex-wrap"><IconStar size={13} className="text-[#f5c518]" />{Math.round((s.vote_average || 0) * 10) / 10} · {s.first_air_date} · {s.number_of_seasons}{d.det_seasons} · {s.number_of_episodes}{d.det_episodes}
              {imdbId && <> · <a className="imdb-badge" target="_blank" rel="noopener" href={imdbTitleUrl(imdbId)}>IMDb {imdbId} ↗</a></>}</p>
            <p className="mt-3 text-zinc-300">{s.overview || d.sin_sinopsis}</p>
            <div className="flex gap-2 mt-4 flex-wrap items-center">
              <ContinueSeriesButton id={id} />
              <FavButton big type="tv" id={id} title={s.name} poster={img(s.poster_path)} />
            </div>
            <div className="flex gap-2 mt-4 flex-wrap">{seasons.map((x: any) => (
              <Link key={x.season_number} href={`/tv/${id}?season=${x.season_number}`}
                className={`text-xs px-3 py-1.5 rounded-full border ${x.season_number === sel ? "bg-[#008CFF] border-[#008CFF] text-white" : "border-white/15 bg-white/5"}`}>{d.tv_t}{x.season_number} ({x.episode_count})</Link>))}</div>
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
      </>
    );
  }
}


