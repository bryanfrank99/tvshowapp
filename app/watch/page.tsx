// @ts-nocheck
"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  fetchProviders,
  type Provider,
  getProviderLangMeta,
  findBestProvider,
  sortProvidersByLang,
  clearProvidersCache,
} from "@/lib/providers";
import { useHistory } from "@/hooks/useHistory";
import { resolveTmdbId } from "@/lib/resolve";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/dict";
import { PlayerSkeleton } from "@/components/Skeleton";
import AccessGate from "@/components/AccessGate";
import { ensureSession } from "@/hooks/useSession";
import { isMovieInTheaters } from "@/lib/theaters";

function WatchInner() {
  const sp = useSearchParams();
  const type = (sp.get("type") || "movie") as "movie" | "tv";
  const id = sp.get("id") || "";
  const s = parseInt(sp.get("s") || "1");
  const e = parseInt(sp.get("e") || "1");
  const { save } = useHistory();
  const { lang } = useLang();
  const d = t(lang);

  const [title, setTitle] = useState(`#${id}`);
  const [embedId, setEmbedId] = useState(id); // ID efectivo para el player (tras resolver IMDb→TMDB si toca)
  const [resolving, setResolving] = useState(false);
  const [noTmdb, setNoTmdb] = useState(false);
  const [list, setList] = useState<Provider[]>([]);
  const [userProvider, setUserProvider] = useState<string | null>(null);
  const [listError, setListError] = useState(false);
  const [locked, setLocked] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingSrc, setLoadingSrc] = useState(false);
  const [srcError, setSrcError] = useState(false);
  const [listVersion, setListVersion] = useState("");
  const spTheaters = sp.get("theaters") === "1" || sp.get("in_theaters") === "1";
  const [inTheaters, setInTheaters] = useState(spTheaters);
  const frameBox = useRef<HTMLDivElement>(null);

  // Cada vez que cambia el título, temporada o episodio, se restablece la selección manual
  useEffect(() => {
    setUserProvider(null);
  }, [id, type, s, e, lang]);

  const goFullscreen = () => {
    const el = frameBox.current as any;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  };

  // Carga lista de servidores desde Supabase
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
      })
      .catch((err) => {
        if (String((err as Error)?.message) === "locked") setLocked(true);
        else setListError(true);
        setLoadingList(false);
      });
  };
  useEffect(loadList, [lang]);

  const recommended = findBestProvider(list, lang);
  const p = (userProvider && list.find((x) => x.id === userProvider)) || recommended || list[0];
  const [src, setSrc] = useState("");

  // Alternar al siguiente servidor en caso de fallo o preferencia
  const cycleNextProvider = () => {
    if (!list || list.length <= 1) return;
    const nonBeta = list.filter((x) => !x.is_beta);
    const pool = nonBeta.length > 0 ? nonBeta : list;
    const idx = pool.findIndex((x) => x.id === p?.id);
    const nextP = pool[(idx + 1) % pool.length];
    if (nextP) setUserProvider(nextP.id);
  };

  // URL final construida en SERVIDOR (/api/embed-url)
  useEffect(() => {
    if (!p || locked) {
      setSrc("");
      setLoadingSrc(false);
      return;
    }
    const eid = embedId || id;
    setLoadingSrc(true);
    setSrcError(false);
    let cancelled = false;

    fetch(`/api/embed-url?provider=${p.id}&type=${type}&id=${encodeURIComponent(eid)}&s=${s}&e=${e}`, {
      cache: "no-store",
    })
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 401) {
          const ok = await ensureSession();
          if (cancelled) return;
          if (ok) {
            const r2 = await fetch(
              `/api/embed-url?provider=${p.id}&type=${type}&id=${encodeURIComponent(eid)}&s=${s}&e=${e}`,
              { cache: "no-store" }
            );
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

  // Si el proveedor exige TMDB y el id es IMDb, resolver vía Cinemeta
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

  // Metadatos (título, historial y detección en cines)
  useEffect(() => {
    if (!id) return;
    const isTt = id.startsWith("tt");
    const url = isTt
      ? `https://v3-cinemeta.strem.io/meta/${type === "movie" ? "movie" : "series"}/${id}.json`
      : `/api/tmdb/${type}/${id}?append_to_response=release_dates`;

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        const m = isTt ? d.meta : d;
        const t = type === "movie" ? m.title || m.name : `${m.name} S${s}E${e}`;
        const posterUrl = m.poster_path
          ? m.poster_path.startsWith("http")
            ? m.poster_path
            : `https://image.tmdb.org/t/p/w500${m.poster_path}`
          : m.poster || "";
        if (t) setTitle(t);
        save({ type, id, title: t || `#${id}`, poster: posterUrl, rating: m.vote_average ?? 0, season: s, episode: e });

        if (type === "movie") {
          const isCine = spTheaters || Boolean(d.in_theaters) || Boolean(m.in_theaters) || isMovieInTheaters(m);
          setInTheaters(isCine);
        } else {
          setInTheaters(false);
        }
      })
      .catch(() => {
        save({ type, id, title: `#${id}`, poster: "", season: s, episode: e });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id, s, e]);

  if (!id) return <p className="text-center py-12 text-zinc-400">{d.falta_id}</p>;

  return (
    <div className="max-w-6xl mx-auto px-1 sm:px-3 pb-8">
      {/* 1. Barra superior limpia de navegación cinemática */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <Link
          href={`/title?type=${type}&id=${id}`}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition group py-1.5 px-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 active:scale-95 touch-manipulation"
        >
          <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
          <span>{d.volver.replace(/^←\s*/, "")}</span>
        </Link>

        <div className="flex items-center gap-2">
          {inTheaters && (
            <span className="px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-black bg-gradient-to-r from-amber-500 to-amber-400 text-black shadow-md inline-flex items-center gap-1.5 uppercase tracking-wider border border-amber-300/40 animate-pulse">
              <span>🍿</span>
              <span>{d.theater_badge}</span>
            </span>
          )}
          {type === "tv" && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#008CFF]/20 text-[#008CFF] border border-[#008CFF]/35">
              T{s} · E{e}
            </span>
          )}
        </div>
      </div>

      {/* Título de la obra */}
      <div className="mb-3">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight flex items-baseline gap-2 flex-wrap">
          <span>{title}</span>
        </h1>
      </div>

      {/* 2. Contenedor de Video 16:9 con marco cinemático y sombra ambiental */}
      <div
        ref={frameBox}
        className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 bg-black shadow-[0_12px_40px_rgba(0,0,0,0.85)] ring-1 ring-white/5"
      >
        {locked ? (
          <div className="aspect-video flex flex-col items-center justify-center gap-3 p-4 overflow-y-auto">
            <AccessGate onOk={loadList} />
          </div>
        ) : listError ? (
          <div className="aspect-video flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm sm:text-base text-red-300 font-medium">{d.list_error}</p>
            <button
              onClick={loadList}
              className="px-5 py-2.5 rounded-xl bg-[#008CFF] hover:bg-[#0077dd] text-sm font-bold active:scale-95 transition shadow-lg"
            >
              {d.reintentar}
            </button>
          </div>
        ) : (loadingList || resolving || loadingSrc) && !srcError ? (
          <PlayerSkeleton />
        ) : noTmdb ? (
          <div className="aspect-video flex flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-sm sm:text-base text-amber-300 font-medium">
              {p?.name} {d.no_tmdb}
            </p>
            {list.length > 1 && (
              <button
                onClick={cycleNextProvider}
                className="px-5 py-2.5 rounded-xl bg-[#008CFF] hover:bg-[#0077dd] text-sm font-bold active:scale-95 transition shadow-lg inline-flex items-center gap-2"
              >
                <span>🔄</span>
                <span>{lang === "pt" ? "Testar outro servidor" : "Probar otro servidor"}</span>
              </button>
            )}
          </div>
        ) : !src || srcError ? (
          <div className="aspect-video flex flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-sm sm:text-base text-amber-300 font-medium max-w-md">
              {lang === "pt"
                ? "Não foi possível reproduzir neste servidor. Selecione outro servidor abaixo."
                : "No se pudo reproducir en este servidor. Prueba seleccionando otro de la lista."}
            </p>
            {list.length > 1 && (
              <button
                onClick={cycleNextProvider}
                className="px-5 py-2.5 rounded-xl bg-[#008CFF] hover:bg-[#0077dd] text-sm font-bold active:scale-95 transition shadow-lg inline-flex items-center gap-2"
              >
                <span>🔄</span>
                <span>{lang === "pt" ? "Testar outro servidor" : "Probar otro servidor"}</span>
              </button>
            )}
          </div>
        ) : (
          <iframe
            key={src}
            src={src}
            autoFocus
            referrerPolicy="origin"
            title={title}
            className="w-full aspect-video bg-black"
            allowFullScreen
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          />
        )}
      </div>

      {/* 3. Barra de Acciones Rápidas del Reproductor */}
      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={goFullscreen}
            className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs sm:text-sm font-semibold text-zinc-200 hover:text-white hover:border-[#008CFF]/60 hover:bg-[#008CFF]/10 active:scale-95 transition inline-flex items-center gap-2 touch-manipulation"
            title={d.fullscreen}
          >
            <span>⛶</span>
            <span>{d.fullscreen}</span>
          </button>

          {list.length > 1 && (
            <button
              onClick={cycleNextProvider}
              className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white hover:border-[#008CFF]/60 hover:bg-[#008CFF]/10 active:scale-95 transition inline-flex items-center gap-2 touch-manipulation"
              title="Cambiar al siguiente servidor"
            >
              <span>🔄</span>
              <span>{lang === "pt" ? "Trocar servidor" : "Cambiar servidor"}</span>
            </button>
          )}
        </div>

        {type === "tv" && (
          <div className="flex items-center gap-2 flex-wrap">
            {e > 1 && (
              <Link
                href={`/watch?type=tv&id=${id}&s=${s}&e=${e - 1}`}
                className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs sm:text-sm font-medium text-zinc-300 hover:text-white active:scale-95 transition"
              >
                ← E{e - 1}
              </Link>
            )}
            <Link
              href={`/watch?type=tv&id=${id}&s=${s}&e=${e + 1}`}
              className="px-4 py-2 rounded-xl bg-[#008CFF] hover:bg-[#0077dd] text-white text-xs sm:text-sm font-bold active:scale-95 transition shadow-[0_0_16px_rgba(0,140,255,0.4)] inline-flex items-center gap-1.5"
            >
              <span>{d.siguiente} {d.ep_e}{e + 1}</span>
              <span>→</span>
            </Link>
            <Link
              href={`/title?type=tv&id=${id}&season=${s}`}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs sm:text-sm text-zinc-300 hover:text-white active:scale-95 transition hidden sm:inline-flex"
            >
              {d.todos_capitulos}
            </Link>
          </div>
        )}
      </div>

      {/* 4. Banner Informativo de Calidad para Películas en Cines */}
      {inTheaters && (
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border-2 border-amber-500/40 text-amber-200 text-xs sm:text-sm flex items-start gap-3.5 shadow-[0_4px_20px_rgba(245,158,11,0.15)]">
          <span className="text-2xl shrink-0 mt-0.5">🍿</span>
          <div className="min-w-0">
            <p className="font-extrabold text-amber-300 text-sm sm:text-base">
              {d.theater_notice_title}
            </p>
            <p className="text-amber-100/90 text-xs sm:text-sm mt-1 leading-relaxed">
              {d.theater_notice_desc}
            </p>
          </div>
        </div>
      )}

      {/* 5. Centro de Control de Reproducción y Servidores */}
      <div className="mt-5 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-zinc-900/60 border border-white/10 shadow-lg">
        <div className="flex items-center justify-between gap-3 mb-3.5 flex-wrap pb-3.5 border-b border-white/10">
          <div>
            <p className="text-xs text-zinc-400 font-medium">{d.servidor} activo:</p>
            <p className="text-base sm:text-lg font-black text-white flex items-center gap-2 mt-0.5">
              <span className="text-[#008CFF]">{p?.name || "…"}</span>
              {p?.id === recommended?.id && (
                <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-full text-emerald-300 font-bold inline-flex items-center gap-1">
                  ⭐ {lang === "pt" ? "Recomendado" : "Recomendado"}
                </span>
              )}
              {p?.is_beta && (
                <span className="text-[10px] bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full text-amber-300 font-bold inline-flex items-center gap-1">
                  🧪 Beta
                </span>
              )}
            </p>
          </div>

          {p && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs bg-white/5 border border-white/10 px-2.5 py-1 rounded-xl text-zinc-200 inline-flex items-center gap-1.5">
                <span>🔊 Audio:</span>
                <b className="text-white">
                  {(p.languages || [p.lang]).map((a) => `${getProviderLangMeta(a).flag} ${getProviderLangMeta(a).name}`).join(", ")}
                </b>
              </span>
              {p.subtitles && p.subtitles.length > 0 && (
                <span className="text-xs bg-sky-500/10 border border-sky-500/25 px-2.5 py-1 rounded-xl text-sky-300 inline-flex items-center gap-1.5">
                  <span>💬 Subs:</span>
                  <b className="text-sky-200">{p.subtitles.map((sub) => sub.toUpperCase()).join(", ")}</b>
                </span>
              )}
            </div>
          )}
        </div>

        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          {lang === "pt" ? "Outros servidores e idiomas disponíveis:" : "Otros servidores e idiomas disponibles:"}
        </p>

        {/* Cuadrícula de Servidores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {list.map((x) => {
            const isSelected = p?.id === x.id;
            const isRec = x.id === recommended?.id;
            const audios = x.languages && x.languages.length ? x.languages : [x.lang];
            const subs = x.subtitles || [];
            const primaryMeta = getProviderLangMeta(audios[0] || x.lang);

            return (
              <button
                key={x.id}
                onClick={() => setUserProvider(x.id)}
                className={`text-left p-3 rounded-2xl border transition-all duration-200 active:scale-[0.98] flex flex-col justify-between gap-2.5 touch-manipulation ${
                  isSelected
                    ? "bg-[#008CFF]/15 border-[#008CFF] shadow-[0_0_20px_rgba(0,140,255,0.3)] ring-1 ring-[#008CFF]"
                    : x.is_beta
                    ? "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/10 text-zinc-200"
                    : "bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/10 text-zinc-200"
                }`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className={`text-sm font-bold truncate ${isSelected ? "text-white" : "text-zinc-100"}`}>
                    {x.name}
                  </span>
                  {isSelected ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#008CFF] animate-pulse shrink-0" />
                  ) : isRec ? (
                    <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded-md shrink-0">
                      ⭐
                    </span>
                  ) : x.is_beta ? (
                    <span className="text-[9px] font-extrabold text-amber-400 bg-amber-500/20 px-1 py-0.5 rounded-md shrink-0">
                      BETA
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                  <span
                    className={`px-2 py-0.5 rounded-lg font-semibold inline-flex items-center gap-1 ${
                      isSelected ? "bg-white/20 text-white" : primaryMeta.color
                    }`}
                  >
                    <span>🔊</span>
                    <span>{audios.map((a) => getProviderLangMeta(a).badge).join("/")}</span>
                  </span>
                  {subs.length > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-lg font-medium inline-flex items-center gap-1 ${
                        isSelected ? "bg-white/20 text-white" : "bg-sky-500/15 border border-sky-500/30 text-sky-300"
                      }`}
                    >
                      <span>💬</span>
                      <span>{subs.map((sub) => sub.toUpperCase()).join("/")}</span>
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap text-xs text-zinc-400">
          <p className="flex items-center gap-1.5">
            <span>💡</span>
            <span>
              {lang === "pt"
                ? "Se o vídeo travar ou estiver sem som, selecione qualquer um dos outros servidores acima."
                : "Si el video se detiene o no tiene audio, selecciona cualquiera de los otros servidores arriba."}
            </span>
          </p>
          {listVersion && <span className="text-zinc-500 text-[11px]">v{listVersion}</span>}
        </div>
      </div>

      {/* 6. Nota amistosa de soporte */}
      <div className="mt-4 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs sm:text-sm text-zinc-400 flex items-start gap-2.5">
        <span className="text-base shrink-0">ℹ️</span>
        <p className="leading-relaxed">{d.watch_note}</p>
      </div>
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={<PlayerSkeleton />}>
      <WatchInner />
    </Suspense>
  );
}
