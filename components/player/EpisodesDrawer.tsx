"use client";
import React, { useState, useEffect, useRef } from "react";

export interface EpisodeItem {
  episode_number: number;
  name?: string;
  title?: string;
  overview?: string;
  runtime?: number;
}

export interface SeasonInfo {
  season_number: number;
  name: string;
  episode_count?: number;
}

interface EpisodesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  seriesTitle: string;
  id: string;
  currentSeason: number;
  currentEpisode: number;
  lang?: string;
  onSelectEpisode: (season: number, episode: number) => void;
}

export default function EpisodesDrawer({
  isOpen,
  onClose,
  seriesTitle,
  id,
  currentSeason,
  currentEpisode,
  lang = "es",
  onSelectEpisode,
}: EpisodesDrawerProps) {
  const [seasons, setSeasons] = useState<SeasonInfo[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number>(currentSeason || 1);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [loading, setLoading] = useState(false);

  const episodesCacheRef = useRef<Map<number, EpisodeItem[]>>(new Map());
  const drawerRef = useRef<HTMLDivElement>(null);
  const activeEpisodeRef = useRef<HTMLButtonElement | null>(null);
  const firstEpisodeRef = useRef<HTMLButtonElement | null>(null);
  const seasonPillRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const episodeBtnRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Sincronizar temporada cuando cambie desde props
  useEffect(() => {
    if (currentSeason) {
      setSelectedSeason(currentSeason);
    }
  }, [currentSeason]);

  // Cargar lista de temporadas al abrir el drawer o cambiar de serie
  useEffect(() => {
    if (!isOpen || !id) return;

    let isMounted = true;
    const isTt = id.startsWith("tt");

    if (isTt) {
      fetch(`https://v3-cinemeta.strem.io/meta/series/${id}.json`)
        .then((r) => r.json())
        .then((data) => {
          if (!isMounted) return;
          const videos: any[] = data?.meta?.videos || [];
          if (videos.length > 0) {
            const seasonSet = new Set<number>();
            const grouped = new Map<number, EpisodeItem[]>();

            for (const v of videos) {
              const sNum = v.season || 1;
              const epNum = v.number || v.episode || 1;
              seasonSet.add(sNum);

              const list = grouped.get(sNum) || [];
              list.push({
                episode_number: epNum,
                name: v.title || v.name || `${lang === "pt" ? "Episódio" : "Episodio"} ${epNum}`,
                overview: v.overview || "",
              });
              grouped.set(sNum, list);
            }

            episodesCacheRef.current = grouped;
            const seasonList: SeasonInfo[] = Array.from(seasonSet)
              .sort((a, b) => a - b)
              .map((sNum) => ({
                season_number: sNum,
                name: `${lang === "pt" ? "T" : "T"}${sNum}`,
                episode_count: grouped.get(sNum)?.length || 0,
              }));

            setSeasons(seasonList);
            const eps = grouped.get(selectedSeason) || [];
            setEpisodes(eps);
          }
        })
        .catch(() => {});
    } else {
      fetch(`/api/tmdb/tv/${id}`)
        .then((r) => r.json())
        .then((data) => {
          if (!isMounted) return;
          const rawSeasons: any[] = (data?.seasons || []).filter(
            (s: any) => s.season_number > 0
          );
          if (rawSeasons.length > 0) {
            setSeasons(
              rawSeasons.map((s) => ({
                season_number: s.season_number,
                name: `${lang === "pt" ? "T" : "T"}${s.season_number}`,
                episode_count: s.episode_count,
              }))
            );
          }
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, id, lang, selectedSeason]);

  // Cargar episodios de la temporada seleccionada para TMDB
  useEffect(() => {
    if (!isOpen || !id || id.startsWith("tt")) return;

    if (episodesCacheRef.current.has(selectedSeason)) {
      setEpisodes(episodesCacheRef.current.get(selectedSeason) || []);
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetch(`/api/tmdb/tv/${id}/season/${selectedSeason}`)
      .then((r) => r.json())
      .then((data) => {
        if (!isMounted) return;
        const eps: any[] = data?.episodes || [];
        const formatted: EpisodeItem[] = eps.map((e) => ({
          episode_number: e.episode_number,
          name: e.name || `${lang === "pt" ? "Episódio" : "Episodio"} ${e.episode_number}`,
          overview: e.overview || "",
          runtime: e.runtime,
        }));
        episodesCacheRef.current.set(selectedSeason, formatted);
        setEpisodes(formatted);
        setLoading(false);
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, id, selectedSeason, lang]);

  // Auto-focus y centrado suave del episodio activo en apertura
  useEffect(() => {
    if (!isOpen || episodes.length === 0) return;

    const timer = setTimeout(() => {
      if (activeEpisodeRef.current) {
        activeEpisodeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        activeEpisodeRef.current.focus({ preventScroll: true });
      } else if (firstEpisodeRef.current) {
        firstEpisodeRef.current.focus({ preventScroll: true });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [isOpen, selectedSeason, episodes]);

  // Manejar atajos globales de control remoto (Escape, Back en Android TV / Tizen / WebOS)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Teclas Back en mandos Android TV y navegadores
      if (
        e.key === "Escape" ||
        e.key === "GoBack" ||
        e.keyCode === 27 ||
        e.keyCode === 10009 || // Tizen
        e.keyCode === 461      // WebOS
      ) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={drawerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Selector de episodios"
      onClick={(e) => {
        if (e.target === drawerRef.current) onClose();
      }}
      onKeyDown={(e) => {
        // Evitar que teclas de navegación se filtren al reproductor de video de fondo
        e.stopPropagation();
      }}
      className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end animate-fade-in text-white overflow-hidden"
    >
      {/* Panel lateral compacto (max-w-md / 420px) */}
      <div className="relative w-full max-w-md sm:max-w-[420px] h-full flex flex-col bg-zinc-950/95 border-l border-white/10 shadow-2xl overflow-hidden ring-1 ring-white/10">
        
        {/* 1. Cabecera Compacta */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-white/10 bg-zinc-900/70 shrink-0">
          <div className="min-w-0 pr-2">
            <h3 className="text-sm sm:text-base font-extrabold text-white truncate leading-tight">
              {seriesTitle}
            </h3>
            <p className="text-[11px] font-semibold text-[#008CFF] mt-0.5">
              {lang === "pt" ? "Temporada" : "Temporada"} {selectedSeason} • {lang === "pt" ? "Episódio" : "Episodio"} {currentEpisode}
            </p>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition active:scale-95 border border-white/10 outline-none focus:ring-2 focus:ring-white shrink-0"
            title={lang === "pt" ? "Fechar" : "Cerrar"}
            aria-label="Cerrar panel de episodios"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* 2. Barra de Temporadas en Píldoras Horizontales (Mando de TV: Flechas Izquierda / Derecha) */}
        {seasons.length > 1 && (
          <div className="flex items-center gap-1.5 p-2.5 sm:p-3 border-b border-white/10 overflow-x-auto no-scrollbar shrink-0 bg-black/40">
            {seasons.map((s, idx) => {
              const isSeasonActive = s.season_number === selectedSeason;
              return (
                <button
                  key={s.season_number}
                  ref={(el) => {
                    if (el) seasonPillRefs.current.set(s.season_number, el);
                  }}
                  type="button"
                  tabIndex={0}
                  onClick={() => setSelectedSeason(s.season_number)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowLeft") {
                      e.preventDefault();
                      const prevSeason = seasons[idx - 1];
                      if (prevSeason) {
                        setSelectedSeason(prevSeason.season_number);
                        seasonPillRefs.current.get(prevSeason.season_number)?.focus();
                      }
                    } else if (e.key === "ArrowRight") {
                      e.preventDefault();
                      const nextSeason = seasons[idx + 1];
                      if (nextSeason) {
                        setSelectedSeason(nextSeason.season_number);
                        seasonPillRefs.current.get(nextSeason.season_number)?.focus();
                      }
                    } else if (e.key === "ArrowDown") {
                      e.preventDefault();
                      if (activeEpisodeRef.current) {
                        activeEpisodeRef.current.focus();
                      } else if (firstEpisodeRef.current) {
                        firstEpisodeRef.current.focus();
                      }
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all outline-none cursor-pointer border ${
                    isSeasonActive
                      ? "bg-[#008CFF] text-white border-[#008CFF] shadow-sm shadow-[#008CFF]/30"
                      : "bg-white/5 hover:bg-white/15 text-zinc-300 border-white/10 hover:border-white/20"
                  } focus:ring-2 focus:ring-white focus:bg-white/25 focus:scale-105`}
                >
                  {s.name}
                  {s.episode_count ? ` (${s.episode_count})` : ""}
                </button>
              );
            })}
          </div>
        )}

        {/* 3. Lista Compacta de Episodios (Mando de TV: Flechas Arriba / Abajo + Enter) */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-1.5 custom-scrollbar">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-2.5 p-8 text-center">
              <div className="w-7 h-7 rounded-full border-2 border-[#008CFF] border-t-transparent animate-spin" />
              <p className="text-xs text-zinc-400 font-medium">
                {lang === "pt" ? "Carregando..." : "Cargando episodios..."}
              </p>
            </div>
          ) : episodes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-500">
              <p className="text-xs font-semibold">
                {lang === "pt"
                  ? "Nenhum episódio encontrado."
                  : "No se encontraron episodios."}
              </p>
            </div>
          ) : (
            episodes.map((ep, idx) => {
              const isCurrent =
                selectedSeason === currentSeason && ep.episode_number === currentEpisode;
              const isFirst = idx === 0;

              return (
                <button
                  key={ep.episode_number}
                  ref={(el) => {
                    if (el) episodeBtnRefs.current.set(ep.episode_number, el);
                    if (isCurrent && el) activeEpisodeRef.current = el;
                    if (isFirst && el) firstEpisodeRef.current = el;
                  }}
                  type="button"
                  tabIndex={0}
                  onClick={() => {
                    onSelectEpisode(selectedSeason, ep.episode_number);
                    onClose();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      const nextEp = episodes[idx + 1];
                      if (nextEp) {
                        const target = episodeBtnRefs.current.get(nextEp.episode_number);
                        target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                        target?.focus();
                      }
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      if (idx > 0) {
                        const prevEp = episodes[idx - 1];
                        if (prevEp) {
                          const target = episodeBtnRefs.current.get(prevEp.episode_number);
                          target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                          target?.focus();
                        }
                      } else if (seasons.length > 1) {
                        // Al subir desde el primer episodio, enfocar la píldora de temporada activa
                        seasonPillRefs.current.get(selectedSeason)?.focus();
                      }
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      onSelectEpisode(selectedSeason, ep.episode_number);
                      onClose();
                    }
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center gap-3 cursor-pointer outline-none group ${
                    isCurrent
                      ? "bg-[#008CFF]/20 border-[#008CFF] text-white shadow-sm ring-1 ring-[#008CFF]"
                      : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-zinc-300"
                  } focus:ring-2 focus:ring-white focus:bg-white/20 focus:text-white focus:scale-[1.01]`}
                >
                  {/* Badge de Número de Episodio */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-black text-xs shrink-0 border ${
                      isCurrent
                        ? "bg-[#008CFF] text-white border-[#008CFF] shadow-sm animate-pulse"
                        : "bg-black/60 text-zinc-400 border-white/15 group-hover:text-white group-hover:border-white/30"
                    }`}
                  >
                    E{ep.episode_number}
                  </div>

                  {/* Título y Estado */}
                  <div className="flex-1 min-w-0 pr-1">
                    <p
                      className={`text-xs sm:text-sm font-semibold truncate ${
                        isCurrent ? "text-white font-bold" : "text-zinc-200 group-hover:text-white"
                      }`}
                    >
                      {ep.name || `${lang === "pt" ? "Episódio" : "Episodio"} ${ep.episode_number}`}
                    </p>
                    {ep.runtime ? (
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        {ep.runtime} min
                      </p>
                    ) : null}
                  </div>

                  {/* Indicador de Reproducción Activa */}
                  {isCurrent && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#008CFF] text-white shrink-0 tracking-wide">
                      {lang === "pt" ? "No ar" : "Activo"}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
