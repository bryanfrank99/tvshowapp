export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { tmdb, hasKey, getLang } from "@/lib/tmdb";
import { img } from "@/lib/img";
import { getImdbId, imdbTitleUrl } from "@/lib/imdb";
import { tmdbUrl } from "@/lib/ids";
import { isImdbId, cineMeta, cineMovieDetail, cineSeriesDetail, cineSeasons, cineEpisodes } from "@/lib/free";
import FavButton from "@/components/FavButton";
import ContinueSeriesButton from "@/components/ContinueSeriesButton";
import TrailerButton from "@/components/TrailerButton";
import ScoreRing from "@/components/ScoreRing";
import { IconPlay, IconStar } from "@/components/Icons";
import { t } from "@/lib/dict";
import { getTitle, saveTitle, getEpisodes, saveSeason, certOf } from "@/lib/db";

const fmtRuntime = (min: any) => {
  const n = Number(min);
  if (!Number.isFinite(n) || n <= 0) return "";
  const h = Math.floor(n / 60);
  const m = n % 60;
  return h ? `${h}h ${m}m` : `${m} min`;
};

export async function generateMetadata({ searchParams }: { searchParams: { type?: string; id?: string } }) {
  const fallback = { title: "TVShow — Catálogo + Player" };
  try {
    const type = searchParams.type === "tv" ? "tv" : "movie";
    const id = searchParams.id || "";
    if (!id) return fallback;
    const lang = getLang();
    let title = "", overview = "", poster = "";
    const cached = !isImdbId(id) && hasKey() ? await getTitle(type, id, lang) : null;
    if (cached) {
      title = cached.title;
      overview = cached.overview;
      poster = img(cached.poster_path, "original");
    } else if (isImdbId(id) || !hasKey()) {
      const meta = await cineMeta(type === "movie" ? "movie" : "series", id);
      title = meta.name;
      overview = meta.description || "";
      poster = meta.poster || "";
    } else {
      const m = await tmdb<any>(`/${type}/${id}`);
      title = m.title || m.name || "";
      overview = m.overview || "";
      poster = m.poster_path ? img(m.poster_path, "original") : "";
    }
    if (!title) return fallback;
    return {
      title: `${title} — TVShow`,
      description: overview.slice(0, 160),
      openGraph: { title: `${title} — TVShow`, description: overview.slice(0, 200), images: poster ? [{ url: poster }] : [] },
      twitter: { card: "summary_large_image", title: `${title} — TVShow`, description: overview.slice(0, 200), images: poster ? [poster] : [] },
    };
  } catch {
    return fallback;
  }
}

export default async function TitlePage({ searchParams }: { searchParams: { type?: string; id?: string; season?: string } }) {
  const type = searchParams.type === "tv" ? "tv" : "movie";
  const id = searchParams.id || "";
  if (!id) return <p>—</p>;
  try {
    const el = type === "movie" ? await MovieDetail(id) : await TvDetail(id, searchParams.season);
    // Si el tipo no trae título (404 silencioso), probar el otro tipo.
    return el;
  } catch {
    try {
      return type === "movie" ? await TvDetail(id, undefined) : await MovieDetail(id);
    } catch {
      return (
        <div className="text-center py-16">
          <h1 className="text-2xl font-black">Contenido no encontrado</h1>
          <p className="text-sm text-zinc-400 mt-2">Este ID no existe en el catálogo.</p>
        </div>
      );
    }
  }
}

async function MovieDetail(id: string) {
  const lang = getLang();
  const d = t(lang);
  const useFree = isImdbId(id) || !hasKey();
  let m: any;
  let imdbId: string | null;
  if (!useFree) {
    const cached = await getTitle("movie", id, lang);
    if (cached) {
      m = cached;
      imdbId = cached.imdb_id || null;
    } else {
      m = await tmdb(`/movie/${id}?append_to_response=credits,videos,release_dates`);
      imdbId = await getImdbId("movie", id);
      m.certification = m.certification || certOf(m);
      await saveTitle("movie", id, lang, m, imdbId, {
        cast: (m.credits?.cast || []).slice(0, 20),
        crew: (m.credits?.crew || []).slice(0, 20),
      });
    }
    if (!m.certification) m.certification = certOf(m);
  } else {
    m = cineMovieDetail(await cineMeta("movie", id), id);
    imdbId = id;
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
              {/^\d+$/.test(id) && <a className="tmdb-badge" target="_blank" rel="noopener" href={tmdbUrl("movie", id)}>TMDB ↗</a>}
            </p>
            <div className="flex items-center gap-4 mt-4 flex-wrap">
              <span className="inline-flex items-center gap-2">
                <ScoreRing value={m.vote_average || 0} />
                <span className="text-sm font-bold leading-tight">{d.score}<br />TMDB</span>
              </span>
              {trailerKey && <TrailerButton videoKey={trailerKey} label={d.ver_trailer} />}
            </div>
            <div className="flex gap-2 mt-4 flex-wrap items-center">
              <Link href={`/watch?type=movie&id=${m.id || id}`} className="bg-[#008CFF] rounded-xl px-5 py-2.5 font-bold inline-flex items-center gap-2 text-sm"><IconPlay size={15} />{d.ver_ahora_btn}</Link>
              <FavButton big type="movie" id={id} title={m.title} poster={img(m.poster_path)} rating={m.vote_average ?? 0} />
            </div>
            {m.tagline && <p className="mt-4 italic text-zinc-400">{m.tagline}</p>}
            <h2 className="text-lg font-bold mt-3">{d.overview_h}</h2>
            <p className="mt-1 text-zinc-300 text-sm">{m.overview || d.sin_sinopsis}</p>
            {directors.length > 0 && (
              <div className="flex gap-8 mt-4 flex-wrap">
                {directors.map((c: any) => (
                  <div key={c.id || c.name}>
                    <Link href={`/person?name=${encodeURIComponent(c.name)}`} className="font-bold text-sm hover:text-[#008CFF]">{c.name}</Link>
                    <p className="text-xs text-zinc-500">{c.job}</p>
                  </div>
                ))}
              </div>
            )}
            {genres.length > 0 && (
              <div className="flex gap-1.5 mt-4 flex-wrap">{genres.map((g) => (
                <Link key={g.id} href={`/genre?id=${typeof g.id === "number" ? g.id : 0}&name=${encodeURIComponent(g.name)}`}
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
              <Link key={c.id || c.name} href={`/person?name=${encodeURIComponent(c.name)}`}
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

async function TvDetail(id: string, seasonParam?: string) {
  const lang = getLang();
  const d = t(lang);
  const useFree = isImdbId(id) || !hasKey();
  let s: any;
  let det: any;
  if (useFree) {
    const meta = await cineMeta("series", id);
    s = cineSeriesDetail(meta, id);
    const seasons = cineSeasons(meta);
    const sel = parseInt(seasonParam || String(seasons[0]?.season_number || 1));
    det = { episodes: cineEpisodes(meta, sel) };
    return renderTv(s, det, id, sel, seasons, id, d);
  }
  const cached = await getTitle("tv", id, lang);
  s = cached || await tmdb(`/tv/${id}?append_to_response=credits,videos,content_ratings`);
  if (!cached) {
    const imdb0 = await getImdbId("tv", id);
    await saveTitle("tv", id, lang, s, imdb0, {
      cast: (s.credits?.cast || []).slice(0, 20),
      crew: (s.credits?.crew || []).slice(0, 20),
    });
    (s as any).imdb_id = imdb0;
  }
  const imdbId = (s as any).imdb_id || await getImdbId("tv", id);
  const seasons = (s.seasons_info?.length ? s.seasons_info : s.seasons).filter((x: any) => x.season_number > 0);
  const sel = parseInt(seasonParam || String(seasons[0]?.season_number || 1));
  const cachedEps = await getEpisodes(id, sel, lang);
  if (cachedEps) {
    det = { episodes: cachedEps.map((e: any) => ({ episode_number: e.episode, name: e.name, overview: e.overview, still_path: e.still_path, vote_average: e.vote_average, air_date: e.air_date })) };
  } else {
    det = await tmdb(`/tv/${id}/season/${sel}`);
    await saveSeason(id, sel, lang, det);
  }
  return renderTv(s, det, id, sel, seasons, imdbId, d);
}

function renderTv(s: any, det: any, id: string, sel: number, seasons: any[], imdbId: string | null, d: any) {
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
              {/^\d+$/.test(id) && <a className="tmdb-badge" target="_blank" rel="noopener" href={tmdbUrl("tv", id)}>TMDB ↗</a>}
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
              <FavButton big type="tv" id={id} title={s.name} poster={img(s.poster_path)} rating={s.vote_average ?? 0} />
            </div>
            {s.tagline && <p className="mt-4 italic text-zinc-400">{s.tagline}</p>}
            <h2 className="text-lg font-bold mt-3">{d.overview_h}</h2>
            <p className="mt-1 text-zinc-300 text-sm">{s.overview || d.sin_sinopsis}</p>
            {creators.length > 0 && (
              <div className="flex gap-8 mt-4 flex-wrap">
                {creators.map((c: any) => (
                  <div key={c.id || c.name}>
                    <Link href={`/person?name=${encodeURIComponent(c.name)}`} className="font-bold text-sm hover:text-[#008CFF]">{c.name}</Link>
                    <p className="text-xs text-zinc-500">Creator</p>
                  </div>
                ))}
              </div>
            )}
            {genres.length > 0 && (
              <div className="flex gap-1.5 mt-4 flex-wrap">{genres.map((g) => (
                <Link key={g.id} href={`/genre?id=${typeof g.id === "number" ? g.id : 0}&name=${encodeURIComponent(g.name)}`}
                  className="text-xs font-semibold bg-[#008CFF]/15 text-[#008CFF] border border-[#008CFF]/30 rounded-full px-2.5 py-0.5 hover:bg-[#008CFF]/30">{g.name}</Link>
              ))}</div>
            )}
            <div className="flex gap-2 mt-4 flex-wrap">{seasons.map((x: any) => (
              <Link key={x.season_number} href={`/title?type=tv&id=${id}&season=${x.season_number}`}
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
              <Link key={c.id || c.name} href={`/person?name=${encodeURIComponent(c.name)}`}
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
