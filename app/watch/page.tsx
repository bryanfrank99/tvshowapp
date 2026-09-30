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
import PlayerContainer from "@/components/player/PlayerContainer";
import SourceSelectorGrid from "@/components/player/SourceSelectorGrid";
import { useSourceFallback } from "@/hooks/useSourceFallback";
import { getPlaybackKey } from "@/lib/playback-progress";
import { sortSourcesByPriority, type Source } from "@/lib/sources";

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
  const hasStartedPlaybackRef = useRef(false);

  // Cada vez que cambia el título, temporada o episodio, se restablece la selección manual y el estado de reproducción
  useEffect(() => {
    setUserSourceId(null);
    hasStartedPlaybackRef.current = false;
  }, [id, type, s, e, lang]);

  const goFullscreen = () => {
    if (typeof (window as any).__enterPlayerMode === "function") {
      (window as any).__enterPlayerMode();
    } else {
      const el = (document.querySelector<HTMLElement>("#tv-iframe-container, #tv-native-player, #tv-player-frame") || frameBox.current) as any;
      if (!el) return;
      if (el.focus) el.focus();
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    }
  };

  // Carga y resolución centralizada de fuentes desde /api/resolve
  const loadSources = useCallback(() => {
    if (!id) return;
    setError(false);
    setLocked(false);
    setLoading(true);
    hasStartedPlaybackRef.current = false;

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
          const rawList = [...data.sources];
          setVersion(data.version || "");
          const targetId = data.effectiveTmdbId || data.effectiveImdbId || id;

          // 1. Detectar proveedores candidatos para extracción client-side
          const megaItem = rawList.find(
            (s) => (s.providerId === "megaembed" || s.id.startsWith("megaembed")) && s.type !== "hls"
          );
          const watchPlayItem = rawList.find(
            (s) =>
              (s.providerId === "watchplay" || s.id.startsWith("watchplay") || s.providerId === "EmbedMovies-V2") &&
              s.type !== "hls"
          );
          const nasriItem = rawList.find(
            (s) => (s.providerId === "nasriplay" || s.id.startsWith("nasriplay")) && s.type !== "hls"
          );

          interface ExtractedStreamInfo {
            providerId: string;
            ord: number;
            tag: string;
            lang: "es" | "pt" | "en";
            hlsUrl: string;
            backupUrls: string[];
            isBeta?: boolean;
            simulatedName?: string;
            realName?: string;
          }

          const extractedList: ExtractedStreamInfo[] = [];

          // Helper para fusionar streams extraídos en la lista de fuentes (en memoria o estado)
          const mergeExtractedStreams = (baseSources: Source[], itemsToMerge: ExtractedStreamInfo[]): Source[] => {
            if (!itemsToMerge || itemsToMerge.length === 0) return baseSources;

            let updated = [...baseSources];

            // REGLA: Los servidores en modo beta (isBeta: true) NUNCA se colocan dentro de la pool unificada.
            // Se mantienen como fuentes independientes para permitir testearlos individualmente.
            const betaItems = itemsToMerge.filter((it) => !!it.isBeta);
            const stableItems = itemsToMerge.filter((it) => !it.isBeta);

            for (const bItem of betaItems) {
              const betaSource: Source = {
                id: `${bItem.providerId}-hls-beta`,
                providerId: bItem.providerId,
                providerName: bItem.simulatedName || bItem.tag,
                realName: `${bItem.realName || bItem.tag} (Beta)`,
                ord: bItem.ord,
                type: "hls",
                lang: bItem.lang as any,
                languages: [bItem.lang as any],
                priority: 80,
                url: bItem.hlsUrl,
                backupUrls: bItem.backupUrls,
                isBeta: true,
                tvOk: true,
                needsTmdb: true,
              };

              // Reemplazar la versión previa de este proveedor por su versión HLS Beta individual
              updated = updated.filter((s) => s.id !== bItem.providerId && s.id !== betaSource.id);
              updated.push(betaSource);
            }

            // Unificar únicamente los streams estables en la pool oficial
            const byLang = new Map<string, ExtractedStreamInfo[]>();
            for (const item of stableItems) {
              const list = byLang.get(item.lang) || [];
              list.push(item);
              byLang.set(item.lang, list);
            }

            for (const [itemLang, items] of byLang.entries()) {
              if (items.length === 0) continue;

              const existingPoolIndex = updated.findIndex(
                (s) =>
                  !s.isBeta &&
                  (s.ord === 0 || s.providerName === "HLS" || s.type === "hls") &&
                  (s.lang === itemLang || s.languages?.includes(itemLang as any))
              );

              if (existingPoolIndex !== -1) {
                const existing = updated[existingPoolIndex];
                const combinedBackups = [...(existing.backupUrls || [])];
                const newMap = { ...(existing.urlServerMap || {}) };

                for (const it of items) {
                  combinedBackups.push(it.hlsUrl, ...it.backupUrls);
                  if (!newMap[it.hlsUrl]) newMap[it.hlsUrl] = it.tag;
                  for (const b of it.backupUrls) {
                    if (!newMap[b]) newMap[b] = it.tag;
                  }
                }

                const uniqueBackups = Array.from(new Set(combinedBackups)).filter(
                  (u) => u && u !== existing.url
                );
                for (const b of uniqueBackups) {
                  if (!newMap[b]) newMap[b] = items[0]?.tag || "S1";
                }

                updated[existingPoolIndex] = {
                  ...existing,
                  backupUrls: uniqueBackups,
                  urlServerMap: newMap,
                };
              } else {
                const primaryItem = items[0];
                const backupUrls = Array.from(
                  new Set(
                    items.flatMap((it, idx) => (idx === 0 ? it.backupUrls : [it.hlsUrl, ...it.backupUrls]))
                  )
                ).filter((u) => u && u !== primaryItem.hlsUrl);

                const urlServerMap: Record<string, string> = { [primaryItem.hlsUrl]: primaryItem.tag };
                for (const it of items) {
                  urlServerMap[it.hlsUrl] = it.tag;
                  for (const b of it.backupUrls) {
                    if (!urlServerMap[b]) urlServerMap[b] = it.tag;
                  }
                }

                const newPool: Source = {
                  id: `hls-${itemLang}`,
                  providerId: primaryItem.providerId,
                  providerName: "HLS",
                  realName: `HLS (${itemLang.toUpperCase()})`,
                  ord: 0,
                  type: "hls",
                  lang: itemLang as any,
                  languages: [itemLang as any],
                  priority: 120,
                  url: primaryItem.hlsUrl,
                  backupUrls,
                  urlServerMap,
                  isBeta: false,
                  tvOk: true,
                  needsTmdb: true,
                };

                const convertedProviders = new Set(items.map((i) => i.providerId));
                updated = updated.filter(
                  (s) => !convertedProviders.has(s.providerId) || s.type === "hls"
                );
                updated.unshift(newPool);
              }
            }

            return updated;
          };

          // 2. Coordinar tareas de extracción paralelas
          const extractionTasks: Promise<void>[] = [];

          if (megaItem) {
            extractionTasks.push(
              (async () => {
                try {
                  const { fetchMegaEmbedStream } = await import("@/lib/megaembed");
                  const streamResult = await fetchMegaEmbedStream({
                    id: targetId,
                    type,
                    season: s,
                    episode: e,
                  });
                  if (streamResult?.hlsUrl) {
                    fetch("/api/resolve/cache-stream", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        providerId: megaItem.providerId || "megaembed",
                        type,
                        targetId,
                        season: s,
                        episode: e,
                        hlsUrl: streamResult.hlsUrl,
                        backupHlsUrls: streamResult.backupHlsUrls,
                      }),
                    }).catch(() => {});

                    const extracted: ExtractedStreamInfo = {
                      providerId: "megaembed",
                      ord: megaItem.ord || 14,
                      tag: megaItem.ord ? `S${megaItem.ord}` : "S14",
                      lang: "pt",
                      hlsUrl: streamResult.hlsUrl,
                      backupUrls: (streamResult.backupHlsUrls || []).filter(Boolean),
                      isBeta: Boolean(megaItem.isBeta),
                      simulatedName: megaItem.providerName,
                      realName: megaItem.realName,
                    };
                    extractedList.push(extracted);

                    // Si la interfaz ya está reproduciendo, incorporar backups sin reiniciar playback
                    if (hasStartedPlaybackRef.current) {
                      setSources((prev) => {
                        const merged = mergeExtractedStreams(prev, [extracted]);
                        return sortSourcesByPriority(merged, lang);
                      });
                    }
                  }
                } catch {}
              })()
            );
          }

          if (watchPlayItem) {
            extractionTasks.push(
              (async () => {
                try {
                  const { fetchWatchPlayStream } = await import("@/lib/watchplay");
                  const streamResult = await fetchWatchPlayStream({
                    id: targetId,
                    type,
                    season: s,
                    episode: e,
                  });
                  if (streamResult?.hlsUrl) {
                    fetch("/api/resolve/cache-stream", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        providerId: watchPlayItem.providerId || "watchplay",
                        type,
                        targetId,
                        season: s,
                        episode: e,
                        hlsUrl: streamResult.hlsUrl,
                        backupHlsUrls: streamResult.backupHlsUrls,
                      }),
                    }).catch(() => {});

                    const extracted: ExtractedStreamInfo = {
                      providerId: "watchplay",
                      ord: watchPlayItem.ord || 18,
                      tag: watchPlayItem.ord ? `S${watchPlayItem.ord}` : "S18",
                      lang: "pt",
                      hlsUrl: streamResult.hlsUrl,
                      backupUrls: (streamResult.backupHlsUrls || []).filter(Boolean),
                      isBeta: Boolean(watchPlayItem.isBeta),
                      simulatedName: watchPlayItem.providerName,
                      realName: watchPlayItem.realName,
                    };
                    extractedList.push(extracted);

                    if (hasStartedPlaybackRef.current) {
                      setSources((prev) => {
                        const merged = mergeExtractedStreams(prev, [extracted]);
                        return sortSourcesByPriority(merged, lang);
                      });
                    }
                  }
                } catch {}
              })()
            );
          }

          if (nasriItem) {
            extractionTasks.push(
              (async () => {
                try {
                  const { fetchNasriPlayStream } = await import("@/lib/nasriplay");
                  const streamResult = await fetchNasriPlayStream({
                    id: targetId,
                    type,
                    season: s,
                    episode: e,
                  });
                  if (streamResult?.hlsUrl) {
                    fetch("/api/resolve/cache-stream", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        providerId: "nasriplay",
                        type,
                        targetId,
                        season: s,
                        episode: e,
                        hlsUrl: streamResult.hlsUrl,
                        backupHlsUrls: streamResult.backupHlsUrls,
                      }),
                    }).catch(() => {});

                    const extracted: ExtractedStreamInfo = {
                      providerId: "nasriplay",
                      ord: nasriItem.ord || 17,
                      tag: nasriItem.ord ? `S${nasriItem.ord}` : "S17",
                      lang: "es",
                      hlsUrl: streamResult.hlsUrl,
                      backupUrls: (streamResult.backupHlsUrls || []).filter(Boolean),
                      isBeta: Boolean(nasriItem.isBeta),
                      simulatedName: nasriItem.providerName,
                      realName: nasriItem.realName,
                    };
                    extractedList.push(extracted);

                    if (hasStartedPlaybackRef.current) {
                      setSources((prev) => {
                        const merged = mergeExtractedStreams(prev, [extracted]);
                        return sortSourcesByPriority(merged, lang);
                      });
                    }
                  }
                } catch {}
              })()
            );
          }

          // 3. Fase de Coordinación Pre-Reproducción: Esperar a que terminen o hasta 2.8s
          if (extractionTasks.length > 0) {
            const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2800));
            await Promise.race([Promise.allSettled(extractionTasks), timeoutPromise]);
          }

          // 4. Consolidar todas las extracciones completadas en la lista inicial
          const mergedInitial = mergeExtractedStreams(rawList, extractedList);
          const sortedFinal = sortSourcesByPriority(mergedInitial, lang);

          setSources(sortedFinal);
          setRecommendedSourceId(sortedFinal[0]?.id || "");
          setLoading(false);
        } else {
          setError(true);
          setLoading(false);
        }
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
          id="btn-back-watch"
          href={`/title?type=${type}&id=${id}`}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition group py-1.5 px-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 active:scale-95 touch-manipulation focus:ring-2 focus:ring-[#008CFF] outline-none"
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
        onSourceLoad={() => {
          hasStartedPlaybackRef.current = true;
          handleSourceLoad();
        }}
        lang={lang}
        playbackKey={getPlaybackKey(type, id, s, e)}
      />

      {/* 3. Navegación de Episodios (Solo para series TV) */}
      {type === "tv" && (
        <div className="mt-3 flex items-center justify-end gap-2 flex-wrap">
          {e > 1 && (
            <Link
              id="btn-prev-ep"
              href={`/watch?type=tv&id=${id}&s=${s}&e=${e - 1}`}
              className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs sm:text-sm font-medium text-zinc-300 hover:text-white active:scale-95 transition focus:ring-2 focus:ring-[#008CFF] outline-none"
            >
              ← E{e - 1}
            </Link>
          )}
          <Link
            id="btn-next-ep"
            href={`/watch?type=tv&id=${id}&s=${s}&e=${e + 1}`}
            className="px-4 py-2 rounded-xl bg-[#008CFF] hover:bg-[#0077dd] text-white text-xs sm:text-sm font-bold active:scale-95 transition shadow-[0_0_16px_rgba(0,140,255,0.4)] inline-flex items-center gap-1.5 focus:ring-2 focus:ring-white outline-none"
          >
            <span>{d.siguiente} {d.ep_e}{e + 1}</span>
            <span>→</span>
          </Link>
          <Link
            id="btn-all-ep"
            href={`/title?type=tv&id=${id}&season=${s}`}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs sm:text-sm text-zinc-300 hover:text-white active:scale-95 transition hidden sm:inline-flex focus:ring-2 focus:ring-[#008CFF] outline-none"
          >
            {d.todos_capitulos}
          </Link>
        </div>
      )}

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
          onSelectSource={(source) => {
            setUserSourceId(source.id);
            if (
              (source.providerId === "megaembed" || source.id.startsWith("megaembed")) &&
              source.type !== "hls"
            ) {
              import("@/lib/megaembed").then(async ({ fetchMegaEmbedStream }) => {
                const streamResult = await fetchMegaEmbedStream({ id, type, season: s, episode: e });
                if (streamResult?.hlsUrl) {
                  fetch("/api/resolve/cache-stream", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      providerId: source.providerId || "megaembed",
                      type,
                      targetId: id,
                      season: s,
                      episode: e,
                      hlsUrl: streamResult.hlsUrl,
                      backupHlsUrls: streamResult.backupHlsUrls,
                    }),
                  }).catch(() => {});

                  setSources((prev) => {
                    const existingPtPool = prev.find(
                      (s) => (s.ord === 0 || s.providerName === "HLS") && (s.lang === "pt" || s.languages?.includes("pt"))
                    );

                    if (existingPtPool) {
                      return prev.map((src) => {
                        if (src.id === existingPtPool.id) {
                          const newBackups = Array.from(
                            new Set([...(src.backupUrls || []), streamResult.hlsUrl, ...(streamResult.backupHlsUrls || [])])
                          ).filter((u) => u && u !== src.url);

                          const updatedMap = { ...(src.urlServerMap || {}) };
                          const serverTag = source.ord ? `S${source.ord}` : "S14";
                          if (!updatedMap[streamResult.hlsUrl!]) updatedMap[streamResult.hlsUrl!] = serverTag;
                          for (const b of streamResult.backupHlsUrls || []) {
                            if (!updatedMap[b]) updatedMap[b] = serverTag;
                          }

                          return {
                            ...src,
                            backupUrls: newBackups,
                            urlServerMap: updatedMap,
                          };
                        }
                        return src;
                      });
                    }

                    return prev.map((src) =>
                      src.id === source.id
                        ? {
                            ...src,
                            type: "hls",
                            url: streamResult.hlsUrl!,
                            backupUrls: streamResult.backupHlsUrls,
                          }
                        : src
                    );
                  });
                }
              }).catch(() => {});
            }

            if (
              (source.providerId === "watchplay" || source.id.startsWith("watchplay") || source.providerId === "EmbedMovies-V2") &&
              source.type !== "hls"
            ) {
              import("@/lib/watchplay").then(async ({ fetchWatchPlayStream }) => {
                const streamResult = await fetchWatchPlayStream({ id, type, season: s, episode: e });
                if (streamResult?.hlsUrl) {
                  fetch("/api/resolve/cache-stream", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      providerId: source.providerId || "watchplay",
                      type,
                      targetId: id,
                      season: s,
                      episode: e,
                      hlsUrl: streamResult.hlsUrl,
                      backupHlsUrls: streamResult.backupHlsUrls,
                    }),
                  }).catch(() => {});

                  setSources((prev) => {
                    const existingPtPool = prev.find(
                      (s) => (s.ord === 0 || s.providerName === "HLS") && (s.lang === "pt" || s.languages?.includes("pt"))
                    );

                    if (existingPtPool) {
                      return prev.map((src) => {
                        if (src.id === existingPtPool.id) {
                          const newBackups = Array.from(
                            new Set([...(src.backupUrls || []), streamResult.hlsUrl, ...(streamResult.backupHlsUrls || [])])
                          ).filter((u) => u && u !== src.url);

                          const updatedMap = { ...(src.urlServerMap || {}) };
                          const serverTag = source.ord ? `S${source.ord}` : "S18";
                          if (!updatedMap[streamResult.hlsUrl!]) updatedMap[streamResult.hlsUrl!] = serverTag;
                          for (const b of streamResult.backupHlsUrls || []) {
                            if (!updatedMap[b]) updatedMap[b] = serverTag;
                          }

                          return {
                            ...src,
                            backupUrls: newBackups,
                            urlServerMap: updatedMap,
                          };
                        }
                        return src;
                      });
                    }

                    return prev.map((src) =>
                      src.id === source.id
                        ? {
                            ...src,
                            type: "hls",
                            url: streamResult.hlsUrl!,
                            backupUrls: streamResult.backupHlsUrls,
                          }
                        : src
                    );
                  });
                }
              }).catch(() => {});
            }

            if (
              (source.providerId === "nasriplay" || source.id.startsWith("nasriplay")) &&
              source.type !== "hls"
            ) {
              import("@/lib/nasriplay").then(async ({ fetchNasriPlayStream }) => {
                const streamResult = await fetchNasriPlayStream({ id, type, season: s, episode: e });
                if (streamResult?.hlsUrl) {
                  fetch("/api/resolve/cache-stream", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      providerId: "nasriplay",
                      type,
                      targetId: id,
                      season: s,
                      episode: e,
                      hlsUrl: streamResult.hlsUrl,
                      backupHlsUrls: streamResult.backupHlsUrls,
                    }),
                  }).catch(() => {});
                }
              }).catch(() => {});
            }
          }}
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
