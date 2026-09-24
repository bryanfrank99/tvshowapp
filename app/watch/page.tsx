// @ts-nocheck
"use client";
import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useHistory } from "@/hooks/useHistory";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/dict";
import { PlayerSkeleton } from "@/components/Skeleton";
import { ensureSession } from "@/hooks/useSession";
import { isMovieInTheaters } from "@/lib/theaters";
import type { Source, ResolveResponse } from "@/lib/sources";
import PlayerContainer from "@/components/player/PlayerContainer";
import SourceSelectorGrid from "@/components/player/SourceSelectorGrid";
import { useSourceFallback } from "@/hooks/useSourceFallback";

function WatchInner() {
  const sp = useSearchParams();
  const type = (sp.get("type") || "movie") as "movie" | "tv";
  const id = sp.get("id") || "";
  const s = parseInt(sp.get("s") || "1", 10) || 1;
  const e = parseInt(sp.get("e") || "1", 10) || 1;
  const { save } = useHistory();
  const { lang } = useLang();
  const d = t(lang);

  const [title, setTitle] = useState(`#${id}`);
  const [sources, setSources] = useState<Source[]>([]);
  const [recommendedSourceId, setRecommendedSourceId] = useState<string>("");
  const [userSourceId, setUserSourceId] = useState<string | null>(null);
  const [version, setVersion] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [locked, setLocked] = useState(false);
  const spTheaters = sp.get("theaters") === "1" || sp.get("in_theaters") === "1";
  const [inTheaters, setInTheaters] = useState(spTheaters);
  const frameBox = useRef<HTMLDivElement>(null);

  // Cada vez que cambia el título, temporada o episodio, se restablece la selección manual
  useEffect(() => {
    setUserSourceId(null);
  }, [id, type, s, e, lang]);

  const goFullscreen = () => {
    const el = frameBox.current as any;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  };

  // Carga y resolución centralizada de fuentes desde /api/resolve
  const loadSources = useCallback(() => {
    if (!id) return;
    setError(false);
    setLocked(false);
    setLoading(true);

    ensureSession()
      .then(async (ok) => {
        if (!ok) {
          setLocked(true);
          setLoading(false);
          return;
        }

        const res = await fetch(
          `/api/resolve?type=${type}&id=${encodeURIComponent(id)}&s=${s}&e=${e}&lang=${encodeURIComponent(lang)}`,
          { cache: "no-store" }
        );

        if (res.status === 401) {
          setLocked(true);
          setLoading(false);
          return;
        }

        if (!res.ok) {
          setError(true);
          setLoading(false);
          return;
        }

        const data: ResolveResponse = await res.json();
        if (data && Array.isArray(data.sources)) {
          setSources(data.sources);
          setRecommendedSourceId(data.recommendedSourceId || data.sources[0]?.id || "");
          setVersion(data.version || "");
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (String((err as Error)?.message) === "locked") {
          setLocked(true);
        } else {
          setError(true);
        }
        setLoading(false);
      });
  }, [id, type, s, e, lang]);

  useEffect(() => {
    loadSources();
    const onSessionUpdated = () => {
      loadSources();
    };
    window.addEventListener("tvshow_session_updated", onSessionUpdated);
    return () => {
      window.removeEventListener("tvshow_session_updated", onSessionUpdated);
    };
  }, [loadSources]);

  // Hook de fallback inteligente
  const {
    activeSource,
    fallbackNotice,
    cycleNext,
    handleSourceError,
    handleSourceLoad,
  } = useSourceFallback({
    sources,
    userSourceId,
    recommendedSourceId,
    lang,
  });

  const handleCycleNext = () => {
    const next = cycleNext();
    if (next) setUserSourceId(next.id);
  };

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
        save({
          type,
          id,
          title: t || `#${id}`,
          poster: posterUrl,
          rating: m.vote_average ?? 0,
          season: s,
          episode: e,
        });

        if (type === "movie") {
          const isCine = isMovieInTheaters({
            ...m,
            in_theaters:
              d?.in_theaters !== undefined
                ? Boolean(d.in_theaters)
                : Boolean(m?.in_theaters) || (isTt ? spTheaters : false),
          });
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

      {/* Aviso de conmutación automática de servidor (si se activa fallback) */}
      {fallbackNotice && (
        <div className="mb-3 p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs sm:text-sm flex items-center gap-2 animate-fade-in shadow-lg">
          <span className="text-lg">🔄</span>
          <span className="font-medium">{fallbackNotice}</span>
        </div>
      )}

      {/* 2. Contenedor Maestro de Video */}
      <PlayerContainer
        ref={frameBox}
        source={activeSource}
        title={title}
        locked={locked}
        loading={loading}
        error={error}
        hasNoSources={sources.length === 0}
        onRetry={loadSources}
        onCycleNext={handleCycleNext}
        onSourceError={handleSourceError}
        onSourceLoad={handleSourceLoad}
        lang={lang}
      />

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

          {sources.length > 1 && (
            <button
              onClick={handleCycleNext}
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

      {/* 5. Centro de Control de Reproducción y Selector de Servidores */}
      {sources.length > 0 && (
        <SourceSelectorGrid
          sources={sources}
          activeSource={activeSource}
          recommendedSourceId={recommendedSourceId}
          onSelectSource={(source) => setUserSourceId(source.id)}
          lang={lang}
          version={version}
        />
      )}

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
