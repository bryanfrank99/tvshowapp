export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { tmdb, hasKey, img } from "@/lib/tmdb";
import { getImdbId, imdbTitleUrl } from "@/lib/imdb";
import { isImdbId, cineMeta, cineMovieDetail } from "@/lib/free";
import FavButton from "@/components/FavButton";
import { IconPlay, IconStar } from "@/components/Icons";

export default async function MoviePage({ params }: { params: { id: string } }) {
  const useFree = isImdbId(params.id) || !hasKey();
  const m: any = useFree
    ? cineMovieDetail(await cineMeta("movie", params.id), params.id)
    : await tmdb(`/movie/${params.id}?append_to_response=credits`);
  const imdbId = useFree ? params.id : await getImdbId("movie", params.id);
  return (
    <div className="grid md:grid-cols-[220px_1fr] gap-6">
      <Image src={img(m.poster_path)} alt={m.title} width={440} height={660} className="rounded-2xl w-full max-w-[220px] sm:max-w-none mx-auto md:mx-0" />
      <div>
        <h1 className="text-3xl font-black">{m.title}</h1>
        <p className="text-sm text-zinc-400 mt-1 inline-flex items-center gap-1.5 flex-wrap"><IconStar size={13} className="text-[#f5c518]" />{Math.round((m.vote_average || 0) * 10) / 10} · {m.release_date} · {m.runtime} min
          {imdbId && <> · <a className="imdb-badge" target="_blank" rel="noopener" href={imdbTitleUrl(imdbId)}>IMDb {imdbId} ↗</a></>}</p>
        <p className="mt-3 text-zinc-300">{m.overview}</p>
        <div className="flex gap-2 mt-2 flex-wrap">{(m.credits?.cast || []).slice(0, 8).map((c: any) => <span key={c.id} className="text-xs bg-white/5 border border-white/10 rounded-full px-2 py-0.5">{c.name}</span>)}</div>
        <div className="mt-4 flex gap-2 flex-wrap items-center"><Link href={`/watch?type=movie&id=${m.id}`} className="bg-violet-600 hover:bg-violet-500 rounded-xl px-5 py-2.5 font-bold inline-flex items-center gap-2"><IconPlay size={15} />Ver ahora</Link><FavButton big type="movie" id={params.id} title={m.title} poster={img(m.poster_path)} /></div>
      </div>
    </div>
  );
}
