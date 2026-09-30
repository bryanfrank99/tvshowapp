"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

export interface EpisodeItem {
  episode_number: number;
  name?: string;
  title?: string;
  overview?: string;
  still_path?: string;
  thumbnail?: string;
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
  const activeCardRef = useRef<HTMLButtonElement>(null);

  // Sincronizar temporada cuando cambie desde fuera
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
      // Cinemeta para IMDb IDs
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
                thumbnail: v.thumbnail || "",
              });
              grouped.set(sNum, list);
            }

            episodesCacheRef.current = grouped;
            const seasonList: SeasonInfo[] = Array.from(seasonSet)
              .sort((a, b) => a - b)
              .map((sNum) => ({
                season_number: sNum,
                name: `${lang === "pt" ? "Temporada" : "Temporada"} ${sNum}`,
                episode_count: grouped.get(sNum)?.length || 0,
              }));

            setSeasons(seasonList);
            const eps = grouped.get(selectedSeason) || [];
            setEpisodes(eps);
          }
        })
        .catch(() => {});
    } else {
      // TMDB API
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
                name: s.name || `${lang === "pt" ? "Temporada" : "Temporada"} ${s.season_number}`,
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
          still_path: e.still_path ? `https://image.tmdb.org/t/p/w300${e.still_path}` : undefined,
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

  // Desplazar automáticamente hacia el episodio activo al abrir
  useEffect(() => {
    if (isOpen && activeCardRef.current) {
      setTimeout(() => {
        activeCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        activeCardRef.current?.focus({ preventScroll: true });
      }, 200);
    }
  }, [isOpen, episodes]);

  // Manejar tecla Escape para cerrar
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={drawerRef}
      onClick={(e) => {
        if (e.target === drawerRef.current) onClose();
      }}
      className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col justify-end sm:justify-center p-2 sm:p-6 animate-fade-in text-white overflow-hidden"
    >
      <div className="relative w-full max-w-4xl mx-auto h-[90%] sm:h-[85%] flex flex-col bg-zinc-950/95 border border-white/15 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/10">
        {/* 1. Encabezado Estilo Netflix */}
        <div className="flex items-center justify-between gap-4 p-4 sm:p-5 border-b border-white/10 bg-zinc-900/60 shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#008CFF]">
              {lang === "pt" ? "Episódios & Temporadas" : "Episodios y Temporadas"}
            </p>
            <h3 className="text-base sm:text-xl font-black text-white truncate mt-0.5">
              {seriesTitle}
            </h3>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Selector de Temporadas */}
            {seasons.length > 1 && (
              <div className="relative">
                <select
                  value={selectedSeason}
                  onChange={(e) => {
                    const sNum = parseInt(e.target.value, 10) || 1;
                    setSelectedSeason(sNum);
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm py-2 px-3 sm:px-4 rounded-xl border border-white/20 outline-none focus:ring-2 focus:ring-[#008CFF] cursor-pointer appearance-none pr-8 transition"
                >
                  {seasons.map((s) => (
                    <option key={s.season_number} value={s.season_number} className="bg-zinc-900 text-white">
                      {s.name} {s.episode_count ? `(${s.episode_count} eps)` : ""}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-300">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            )}

            {/* Botón de Cierre */}
            <button
              onClick={onClose}
              type="button"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition active:scale-95 border border-white/10 outline-none focus:ring-2 focus:ring-white"
              title={lang === "pt" ? "Fechar" : "Cerrar"}
              aria-label="Cerrar panel de episodios"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        </div>

        {/* 2. Lista de Episodios con Scroll */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 p-12">
              <div className="w-8 h-8 rounded-full border-2 border-[#008CFF] border-t-transparent animate-spin" />
              <p className="text-xs sm:text-sm text-zinc-400 font-medium">
                {lang === "pt" ? "Carregando episódios..." : "Cargando episodios..."}
              </p>
            </div>
          ) : episodes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center text-zinc-400">
              <p className="text-sm font-semibold">
                {lang === "pt"
                  ? "Nenhum episódio encontrado para esta temporada."
                  : "No se encontraron episodios para esta temporada."}
              </p>
            </div>
          ) : (
            episodes.map((ep) => {
              const isCurrent =
                selectedSeason === currentSeason && ep.episode_number === currentEpisode;
              const thumbUrl = ep.still_path || ep.thumbnail;

              return (
                <button
                  key={ep.episode_number}
                  ref={isCurrent ? activeCardRef : null}
                  type="button"
                  onClick={() => {
                    onSelectEpisode(selectedSeason, ep.episode_number);
                    onClose();
                  }}
                  className={`w-full text-left p-2.5 sm:p-3.5 rounded-2xl border transition-all duration-200 flex items-start gap-3.5 sm:gap-4 group cursor-pointer outline-none ${
                    isCurrent
                      ? "bg-[#008CFF]/15 border-[#008CFF] shadow-[0_0_20px_rgba(0,140,255,0.25)] ring-1 ring-[#008CFF]"
                      : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-[0.99] text-zinc-300"
                  }`}
                >
                  {/* Miniatura / Número de Episodio */}
                  <div className="relative w-28 sm:w-36 aspect-video bg-zinc-900 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-sm flex items-center justify-center">
                    {thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbUrl}
                        alt={`Episodio ${ep.episode_number}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="text-center font-bold text-zinc-500">
                        <span className="text-lg">📺</span>
                      </div>
                    )}

                    {/* Badge de Número */}
                    <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-mono font-black text-white border border-white/20">
                      E{ep.episode_number}
                    </div>

                    {isCurrent ? (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="w-8 h-8 rounded-full bg-[#008CFF] flex items-center justify-center text-white shadow-lg animate-pulse">
                          <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </span>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-black">
                          <svg className="w-3.5 h-3.5 fill-current ml-0.5" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Metadatos del Episodio */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-white group-hover:text-[#008CFF] transition truncate">
                        {ep.episode_number}. {ep.name || `${lang === "pt" ? "Episódio" : "Episodio"} ${ep.episode_number}`}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#008CFF]/25 border border-[#008CFF]/50 text-[#008CFF]">
                          {lang === "pt" ? "Reproduzindo" : "Reproduciendo"}
                        </span>
                      )}
                    </div>

                    {ep.overview ? (
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                        {ep.overview}
                      </p>
                    ) : (
                      <p className="text-[11px] text-zinc-500 italic mt-1">
                        {lang === "pt" ? "Sem descrição disponível." : "Sin descripción disponible."}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
