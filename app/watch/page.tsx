"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchProviders, type Provider } from "@/lib/providers";
import { useHistory } from "@/hooks/useHistory";
import { resolveTmdbId } from "@/lib/resolve";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/dict";
import { PlayerSkeleton } from "@/components/Skeleton";

function WatchInner() {
  const sp = useSearchParams();
  const type = (sp.get("type") || "movie") as "movie" | "tv";
  const id = sp.get("id") || "";
  const s = parseInt(sp.get("s") || "1");
  const e = parseInt(sp.get("e") || "1");
  const { provider, setProvider, save } = useHistory();
  const { lang } = useLang();
  const d = t(lang);
  const [title, setTitle] = useState(`#${id}`);
  const [embedId, setEmbedId] = useState(id); // ID efectivo para el player (tras resolver IMDb→TMDB si toca)
  const [resolving, setResolving] = useState(false);
  const [noTmdb, setNoTmdb] = useState(false);
  const [list, setList] = useState<Provider[]>([]);
  const [listError, setListError] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [listVersion, setListVersion] = useState("");
  const frameBox = useRef<HTMLDivElement>(null);

  const goFullscreen = () => {
    const el = frameBox.current as any;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  };

  // Servidores SOLO del JSON remoto.
  const loadList = () => {
    setListError(false);
    setLoadingList(true);
    fetchProviders()
      .then(({ list, version }) => { setList(list); setListVersion(version); setLoadingList(false); })
      .catch(() => { setListError(true); setLoadingList(false); });
  };
  useEffect(loadList, []);

  const p = list.find((x) => x.id === provider) || list[0];
  const [src, setSrc] = useState("");

  // URL final construida en SERVIDOR (/api/embed-url inyecta la key).
  useEffect(() => {
    if (!p) { setSrc(""); return; }
    const eid = embedId || id;
    fetch(`/api/embed-url?provider=${p.id}&type=${type}&id=${encodeURIComponent(eid)}&s=${s}&e=${e}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setSrc(j.url || ""))
      .catch(() => setSrc(""));
  }, [p, embedId, type, id, s, e]);

  // Si el proveedor exige TMDB y el id es IMDb, resolver vía Cinemeta.
  useEffect(() => {
    setNoTmdb(false);
    if (!p) return;
    if (p.needsTmdb && id.startsWith("tt")) {
      setResolving(true);
      resolveTmdbId(type, id).then((tmdb) => {
        if (tmdb) setEmbedId(tmdb);
        else setNoTmdb(true);
        setResolving(false);
      });
    } else {
      setEmbedId(id);
    }
  }, [p, type, id]);

  useEffect(() => {
    // Título + seguir viendo. IDs IMDb (tt...) → Cinemeta directo (sin key, CORS abierto).
    // IDs numéricos → proxy /api/tmdb (requiere KEY en servidor).
    if (!id) return;
    const isTt = id.startsWith("tt");
    const url = isTt
      ? `https://v3-cinemeta.strem.io/meta/${type === "movie" ? "movie" : "series"}/${id}.json`
      : `/api/tmdb/${type}/${id}`;
    fetch(url).then((r) => r.json()).then((d) => {
      const m = isTt ? d.meta : d;
      const t = type === "movie" ? m.title || m.name : `${m.name} S${s}E${e}`;
      const posterUrl = m.poster_path
        ? (m.poster_path.startsWith("http") ? m.poster_path : `https://image.tmdb.org/t/p/w500${m.poster_path}`)
        : (m.poster || "");
      if (t) setTitle(t);
      save({ type, id, title: t || `#${id}`, poster: posterUrl, rating: m.vote_average ?? 0, season: s, episode: e });
    }).catch(() => {
      save({ type, id, title: `#${id}`, poster: "", season: s, episode: e });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id, s, e]);

  if (!id) return <p>{d.falta_id}</p>;
  return (
    <>
      <Link href={`/title?type=${type}&id=${id}`} className="text-xs text-zinc-400">{d.volver}</Link>
      <h1 className="text-2xl font-black">{title}</h1>
      <p className="text-xs text-zinc-500 mb-3">{d.servidor} <b className="text-[#008CFF]">{p?.name || "…"}</b> · TMDB #{id} {type === "tv" ? `· ${d.tv_t}${s}${d.ep_e}${e}` : ""}{listVersion ? ` · lista v${listVersion}` : ""}</p>
      <div className="flex gap-2 mb-3 flex-wrap">
        {list.map((x) => (
          <button key={x.id} onClick={() => setProvider(x.id)} className={`text-xs px-3 py-1 rounded-full border ${provider === x.id ? "bg-[#008CFF] border-[#008CFF] text-white" : "border-white/15 text-zinc-400"}`}>{x.name}</button>
        ))}
      </div>
      <div ref={frameBox} className="rounded-2xl overflow-hidden border border-white/10 bg-black">
        {listError ? (
          <div className="aspect-video flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-red-300">{d.list_error}</p>
            <button onClick={loadList} className="px-4 py-2 rounded-xl bg-[#008CFF] text-sm font-bold">{d.reintentar}</button>
          </div>
        ) : loadingList || resolving || !src ? (
          <PlayerSkeleton />
        ) : noTmdb ? (
          <p className="aspect-video flex items-center justify-center text-sm text-yellow-300 p-6 text-center">
            {p?.name} {d.no_tmdb}
          </p>
        ) : (
          <iframe key={src} src={src} autoFocus referrerPolicy="origin" title={title} className="w-full aspect-video bg-black" allowFullScreen allow="autoplay; encrypted-media; fullscreen; picture-in-picture" />
        )}
      </div>
      <div className="flex gap-2 mt-3 flex-wrap items-center">
        <button onClick={goFullscreen} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:border-[#008CFF]">⛶ {d.fullscreen}</button>
        {type === "tv" && <Link href={`/watch?type=tv&id=${id}&s=${s}&e=${e + 1}`} className="px-4 py-2 rounded-xl bg-[#008CFF] text-sm font-bold">{d.siguiente} {d.ep_e}{e + 1} →</Link>}
        {type === "tv" && <Link href={`/title?type=tv&id=${id}&season=${s}`} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm">{d.todos_capitulos}</Link>}
      </div>
      <p className="text-xs text-zinc-500 mt-2">{d.tv_hint}</p>
      <p className="text-xs text-zinc-500 mt-2">{d.watch_note}</p>
      <p className="text-xs text-zinc-600 mt-1">{d.block_tip} <a href="https://brave.com" target="_blank" rel="noopener" className="underline">Brave</a> · <a href="https://ublockorigin.com" target="_blank" rel="noopener" className="underline">uBlock Origin</a></p>
    </>
  );
}

export default function WatchPage() {
  return <Suspense><WatchInner /></Suspense>;
}


