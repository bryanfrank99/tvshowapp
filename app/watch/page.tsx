"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchProviders, type Provider, getProviderLangMeta, findBestProvider, sortProvidersByLang, clearProvidersCache } from "@/lib/providers";
import { useHistory } from "@/hooks/useHistory";
import { resolveTmdbId } from "@/lib/resolve";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/dict";
import { PlayerSkeleton } from "@/components/Skeleton";
import AccessGate from "@/components/AccessGate";
import { ensureSession } from "@/hooks/useSession";

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
  const [locked, setLocked] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingSrc, setLoadingSrc] = useState(false);
  const [srcError, setSrcError] = useState(false);
  const [listVersion, setListVersion] = useState("");
  const frameBox = useRef<HTMLDivElement>(null);

  const goFullscreen = () => {
    const el = frameBox.current as any;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  };

  // Servidores desde Supabase (requiere sesión con código válido). Si cookie expiró pero hay code en LS, re-auth silencioso.
  const loadList = () => {
    setListError(false);
    setLocked(false);
    setLoadingList(true);
    setSrcError(false);
    ensureSession()
      .then((ok) => {
        if (!ok) {
          setLocked(true);
          setLoadingList(false);
          return null;
        }
        return fetchProviders();
      })
      .then((res) => {
        if (!res) return;
        const { list: rawList, version } = res;
        const sorted = sortProvidersByLang(rawList, lang);
        setList(sorted);
        setListVersion(version);
        setLoadingList(false);

        // Cargar por defecto el proveedor que mejor se ajuste a la configuración de idioma en la app
        const best = findBestProvider(sorted, lang, provider);
        if (best && best.id !== provider) {
          setProvider(best.id);
        }
      })
      .catch((e) => {
        if (String((e as Error)?.message) === "locked") setLocked(true);
        else setListError(true);
        setLoadingList(false);
      });
  };
  useEffect(loadList, [lang]);

  const p = list.find((x) => x.id === provider) || findBestProvider(list, lang) || list[0];
  const [src, setSrc] = useState("");

  // URL final construida en SERVIDOR (/api/embed-url inyecta la key). 401 → intenta re-auth silencioso una vez.
  useEffect(() => {
    if (!p) {
      setSrc("");
      setLoadingSrc(false);
      return;
    }
    if (locked) {
      setSrc("");
      setLoadingSrc(false);
      return;
    }
    const eid = embedId || id;
    setLoadingSrc(true);
    setSrcError(false);
    let cancelled = false;

    fetch(`/api/embed-url?provider=${p.id}&type=${type}&id=${encodeURIComponent(eid)}&s=${s}&e=${e}`, { cache: "no-store" })
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 401) {
          const ok = await ensureSession();
          if (cancelled) return;
          if (ok) {
            const r2 = await fetch(`/api/embed-url?provider=${p.id}&type=${type}&id=${encodeURIComponent(eid)}&s=${s}&e=${e}`, { cache: "no-store" });
            if (cancelled) return;
            if (r2.ok) {
              const j2 = await r2.json();
              if (j2.url) {
                setSrc(j2.url);
                setLoadingSrc(false);
                return;
              }
            }
          }
          clearProvidersCache();
          setLocked(true);
          setSrc("");
          setLoadingSrc(false);
          return;
        }
        if (!r.ok) {
          setSrc("");
          setSrcError(true);
          setLoadingSrc(false);
          return;
        }
        const j = await r.json();
        if (!j.url) {
          setSrc("");
          setSrcError(true);
          setLoadingSrc(false);
          return;
        }
        setSrc(j.url);
        setLoadingSrc(false);
      })
      .catch(() => {
        if (!cancelled) {
          setSrc("");
          setSrcError(true);
          setLoadingSrc(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [p, embedId, type, id, s, e, locked]);

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
      <p className="text-xs text-zinc-400 mb-3 flex items-center gap-2 flex-wrap">
        <span>{d.servidor} <b className="text-[#008CFF]">{p?.name || "…"}</b></span>
        {p && (
          <>
            {p.is_beta && (
              <span className="text-[10px] bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full text-amber-300 font-bold inline-flex items-center gap-1" title="Servidor Beta: no se selecciona por defecto">
                <span>🧪 Servidor Beta</span>
              </span>
            )}
            <span className="text-[10px] bg-white/10 border border-white/15 px-2 py-0.5 rounded-full text-zinc-200 font-medium inline-flex items-center gap-1">
              <span>🔊 Audio:</span>
              <b className="text-white">{(p.languages || [p.lang]).map((a) => `${getProviderLangMeta(a).flag} ${getProviderLangMeta(a).name}`).join(", ")}</b>
            </span>
            {p.subtitles && p.subtitles.length > 0 && (
              <span className="text-[10px] bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 rounded-full text-sky-300 font-medium inline-flex items-center gap-1">
                <span>💬 Subs:</span>
                <b className="text-sky-200">{p.subtitles.map((s) => s.toUpperCase()).join(", ")}</b>
              </span>
            )}
          </>
        )}
        <span className="text-zinc-500">· TMDB #{id} {type === "tv" ? `· ${d.tv_t}${s}${d.ep_e}${e}` : ""}{listVersion ? ` · lista v${listVersion}` : ""}</span>
      </p>
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        {list.map((x) => {
          const audios = x.languages && x.languages.length ? x.languages : [x.lang];
          const subs = x.subtitles || [];
          const isSelected = (p?.id || provider) === x.id;
          const primaryMeta = getProviderLangMeta(audios[0] || x.lang);
          return (
            <button
              key={x.id}
              onClick={() => setProvider(x.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all active:scale-95 touch-manipulation inline-flex items-center gap-2 ${
                isSelected
                  ? "bg-[#008CFF] border-[#008CFF] text-white font-bold shadow-[0_0_12px_rgba(0,140,255,0.4)]"
                  : x.is_beta
                  ? "border-amber-500/30 text-amber-200/90 hover:border-amber-500/60 hover:text-amber-100 bg-amber-500/5"
                  : "border-white/15 text-zinc-300 hover:border-white/30 hover:text-white bg-white/5"
              }`}
            >
              <span>{x.name}</span>
              {x.is_beta && (
                <span
                  className={`px-1.5 py-0.2 rounded font-bold text-[9px] uppercase tracking-wider inline-flex items-center gap-0.5 ${
                    isSelected
                      ? "bg-amber-400 text-black shadow-sm"
                      : "bg-amber-500/20 border border-amber-500/40 text-amber-300"
                  }`}
                  title="Servidor en fase Beta (Experimental). No se reproduce por defecto."
                >
                  <span>🧪</span>
                  <span>BETA</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[10px]">
                <span
                  className={`px-1.5 py-0.2 rounded font-semibold inline-flex items-center gap-0.5 ${
                    isSelected ? "bg-white/20 text-white" : primaryMeta.color
                  }`}
                  title={`Audio: ${audios.map((a) => getProviderLangMeta(a).name).join(", ")}`}
                >
                  <span>🔊</span>
                  <span>{audios.map((a) => getProviderLangMeta(a).badge).join("/")}</span>
                </span>
                {subs.length > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded font-semibold inline-flex items-center gap-0.5 ${
                      isSelected ? "bg-white/20 text-white" : "bg-sky-500/15 border border-sky-500/30 text-sky-300"
                    }`}
                    title={`Subtítulos: ${subs.map((s) => s.toUpperCase()).join(", ")}`}
                  >
                    <span>💬</span>
                    <span>{subs.map((s) => s.toUpperCase()).join("/")}</span>
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <div ref={frameBox} className="rounded-2xl overflow-hidden border border-white/10 bg-black">
        {locked ? (
          <div className="aspect-video flex flex-col items-center justify-center gap-3 p-4 overflow-y-auto">
            <AccessGate onOk={loadList} />
          </div>
        ) : listError ? (
          <div className="aspect-video flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-red-300">{d.list_error}</p>
            <button onClick={loadList} className="px-4 py-2 rounded-xl bg-[#008CFF] text-sm font-bold active:scale-95 transition">{d.reintentar}</button>
          </div>
        ) : (loadingList || resolving || loadingSrc) && !srcError ? (
          <PlayerSkeleton />
        ) : noTmdb ? (
          <div className="aspect-video flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-yellow-300">{p?.name} {d.no_tmdb}</p>
            {list.length > 1 && (
              <button
                onClick={() => {
                  const nonBeta = list.filter((x) => !x.is_beta);
                  const pool = nonBeta.length > 0 ? nonBeta : list;
                  const idx = pool.findIndex((x) => x.id === (p?.id || provider));
                  const nextP = pool[(idx + 1) % pool.length];
                  if (nextP) setProvider(nextP.id);
                }}
                className="px-4 py-2 rounded-xl bg-[#008CFF] text-sm font-bold active:scale-95 transition"
              >
                🔄 Probar otro servidor
              </button>
            )}
          </div>
        ) : !src || srcError ? (
          <div className="aspect-video flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-yellow-300">
              {lang === "pt" ? "Não foi possível carregar o reprodutor deste servidor." : "No se pudo cargar el reproductor de este servidor."}
            </p>
            {list.length > 1 && (
              <button
                onClick={() => {
                  const nonBeta = list.filter((x) => !x.is_beta);
                  const pool = nonBeta.length > 0 ? nonBeta : list;
                  const idx = pool.findIndex((x) => x.id === (p?.id || provider));
                  const nextP = pool[(idx + 1) % pool.length];
                  if (nextP) setProvider(nextP.id);
                }}
                className="px-4 py-2 rounded-xl bg-[#008CFF] text-sm font-bold active:scale-95 transition"
              >
                🔄 Probar otro servidor
              </button>
            )}
          </div>
        ) : (
          <iframe key={src} src={src} autoFocus referrerPolicy="origin" title={title} className="w-full aspect-video bg-black" allowFullScreen allow="autoplay; encrypted-media; fullscreen; picture-in-picture" />
        )}
      </div>
      <div className="flex gap-2 mt-3 flex-wrap items-center">
        <button onClick={goFullscreen} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:border-[#008CFF] active:scale-95 transition">⛶ {d.fullscreen}</button>
        {list.length > 1 && (
          <button
            onClick={() => {
              const nonBeta = list.filter((x) => !x.is_beta);
              const pool = nonBeta.length > 0 ? nonBeta : list;
              const idx = pool.findIndex((x) => x.id === (p?.id || provider));
              const nextP = pool[(idx + 1) % pool.length];
              if (nextP) setProvider(nextP.id);
            }}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:border-[#008CFF] active:scale-95 transition inline-flex items-center gap-1.5 text-zinc-300 hover:text-white"
            title="Probar siguiente servidor si este no carga o tiene errores"
          >
            🔄 ¿Falla el video? Cambiar servidor
          </button>
        )}
        {type === "tv" && <Link href={`/watch?type=tv&id=${id}&s=${s}&e=${e + 1}`} className="px-4 py-2 rounded-xl bg-[#008CFF] text-sm font-bold active:scale-95 transition">{d.siguiente} {d.ep_e}{e + 1} →</Link>}
        {type === "tv" && <Link href={`/title?type=tv&id=${id}&season=${s}`} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm active:scale-95 transition">{d.todos_capitulos}</Link>}
      </div>
      <p className="text-sm font-medium text-zinc-200 mt-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">{d.watch_note}</p>
    </>
  );
}

export default function WatchPage() {
  return <Suspense><WatchInner /></Suspense>;
}


