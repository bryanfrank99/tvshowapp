"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import type { Source } from "@/lib/sources";

interface NativeSourcePlayerProps {
  source: Source;
  title: string;
  onEnded?: () => void;
  onError?: () => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  }
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
}

export default function NativeSourcePlayer({
  source,
  title,
  onEnded,
  onError,
}: NativeSourcePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressContainerRef = useRef<HTMLDivElement>(null);

  // Lista de URLs candidatas para conmutación por fallo (failover automático)
  const candidateUrls = [
    source.url,
    ...(source.backupUrls || []).filter((u) => u && u !== source.url),
  ];
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const activeUrl = candidateUrls[currentUrlIndex] || source.url;

  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPipAvailable, setIsPipAvailable] = useState(false);

  // Visibilidad de controles OSD y feedback
  const [showControls, setShowControls] = useState(true);
  const [osdFeedback, setOsdFeedback] = useState<{ icon: string; text: string } | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Scrubbing interactivo
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      // No ocultar si está en pausa, si se está arrastrando o si el menú de settings está abierto
      if (!videoRef.current?.paused && !isDragging && !showSettings) {
        setShowControls(false);
        setOsdFeedback(null);
      }
    }, 3500);
  }, [isDragging, showSettings]);

  const triggerFeedback = useCallback((icon: string, text: string) => {
    setOsdFeedback({ icon, text });
    resetHideTimer();
  }, [resetHideTimer]);

  // Detección de soporte Picture-in-Picture
  useEffect(() => {
    if (typeof document !== "undefined" && "pictureInPictureEnabled" in document) {
      setIsPipAvailable(document.pictureInPictureEnabled);
    }
  }, []);

  // Monitorización de cambio a pantalla completa
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const triggerFeedbackRef = useRef(triggerFeedback);
  useEffect(() => {
    triggerFeedbackRef.current = triggerFeedback;
  }, [triggerFeedback]);

  const resetHideTimerRef = useRef(resetHideTimer);
  useEffect(() => {
    resetHideTimerRef.current = resetHideTimer;
  }, [resetHideTimer]);

  const isHlsStream = activeUrl.includes(".m3u8") || source.type === "hls";

  // Inicialización y carga de stream (con soporte Hls.js y Failover de streams)
  useEffect(() => {
    setError(false);
    const video = videoRef.current;
    if (!video || !activeUrl) return;

    let hls: Hls | null = null;
    let networkRetryCount = 0;

    const tryNextStream = () => {
      if (currentUrlIndex + 1 < candidateUrls.length) {
        const nextIdx = currentUrlIndex + 1;
        setCurrentUrlIndex(nextIdx);
        triggerFeedbackRef.current("🔄", `Probando stream alternativo (${nextIdx + 1}/${candidateUrls.length})`);
      } else {
        setError(true);
        onErrorRef.current?.();
      }
    };

    // 1. Soporte HLS nativo (Safari iOS/macOS, Android TV WebView)
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = activeUrl;
      video.load();
      video.play().then(() => {
        setIsPlaying(true);
        resetHideTimerRef.current();
      }).catch(() => {
        setIsPlaying(false);
      });
    } else if (isHlsStream && Hls.isSupported()) {
      // 2. Desktop Chrome / Windows Electron / Firefox vía hls.js
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 60,
        maxBufferLength: 45,
        maxMaxBufferLength: 90,
        maxBufferSize: 80 * 1024 * 1024,
        manifestLoadingTimeOut: 15000,
        manifestLoadingMaxRetry: 3,
        levelLoadingTimeOut: 15000,
        fragLoadingTimeOut: 15000,
        startFragPrefetch: true,
      });

      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls?.loadSource(activeUrl);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().then(() => {
          setIsPlaying(true);
          resetHideTimerRef.current();
        }).catch(() => {
          setIsPlaying(false);
        });
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (networkRetryCount < 2) {
                networkRetryCount++;
                console.warn("[NativePlayer] Reintentando carga de red HLS:", activeUrl);
                hls?.startLoad();
              } else {
                console.warn("[NativePlayer] Error fatal de red en HLS stream tras reintentos, conmutando:", activeUrl);
                tryNextStream();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              tryNextStream();
              break;
          }
        }
      });
    } else {
      // 3. Fallback genérico para mp4 o streams directos
      video.src = activeUrl;
      video.load();
      video.play().then(() => {
        setIsPlaying(true);
        resetHideTimerRef.current();
      }).catch(() => {
        setIsPlaying(false);
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [activeUrl, currentUrlIndex, candidateUrls.length, isHlsStream]);

  // Controles de reproducción
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
        triggerFeedback("▶", "Reproducir");
      }).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
      triggerFeedback("⏸", "Pausa");
    }
  }, [triggerFeedback]);

  const seek = useCallback((deltaSeconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const target = Math.max(0, Math.min(video.duration || 0, video.currentTime + deltaSeconds));
    video.currentTime = target;
    setCurrentTime(target);
    const label = deltaSeconds > 0 ? `+${deltaSeconds}s` : `${deltaSeconds}s`;
    triggerFeedback(deltaSeconds > 0 ? "⏩" : "⏪", `${label} (${formatTime(target)})`);
  }, [triggerFeedback]);

  const seekTo = useCallback((targetSeconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const target = Math.max(0, Math.min(video.duration || 0, targetSeconds));
    video.currentTime = target;
    setCurrentTime(target);
  }, []);

  const adjustVolume = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    const newVol = Math.max(0, Math.min(1, video.volume + delta));
    video.volume = newVol;
    setVolume(newVol);
    setIsMuted(newVol === 0);
    const pct = Math.round(newVol * 100);
    triggerFeedback(newVol === 0 ? "🔇" : "🔊", `Volumen: ${pct}%`);
  }, [triggerFeedback]);

  const setExactVolume = (val: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clean = Math.max(0, Math.min(1, val));
    video.volume = clean;
    setVolume(clean);
    setIsMuted(clean === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted || video.volume === 0) {
      video.muted = false;
      const restoreVol = volume > 0 ? volume : 0.8;
      video.volume = restoreVol;
      setVolume(restoreVol);
      setIsMuted(false);
      triggerFeedback("🔊", `Volumen: ${Math.round(restoreVol * 100)}%`);
    } else {
      video.muted = true;
      setIsMuted(true);
      triggerFeedback("🔇", "Silenciado");
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const togglePip = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (e: any) {
      console.warn("[NativePlayer] Error PiP:", e?.message);
    }
  };

  const changeSpeed = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettings(false);
    triggerFeedback("⚡", `Velocidad: ${rate}x`);
  };

  // Manejo de teclado y mando a distancia de TV
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      const k = e.keyCode;

      // Play / Pause: DPAD_CENTER (23), Enter (13), Espacio (32), MediaPlayPause (179), k/K
      if (k === 23 || k === 13 || k === 32 || k === 179 || e.key === "MediaPlayPause" || e.key === "k" || e.key === "K") {
        if (!target || target === document.body || containerRef.current?.contains(target)) {
          e.preventDefault();
          togglePlay();
          return;
        }
      }

      // Fast Forward: D-Pad Right (22, 39), MediaFastForward (228), l/L
      if (k === 228 || (containerRef.current?.contains(target) && (k === 22 || k === 39 || e.key === "ArrowRight" || e.key === "l" || e.key === "L"))) {
        e.preventDefault();
        seek(10);
        return;
      }

      // Rewind: D-Pad Left (21, 37), MediaRewind (227), j/J
      if (k === 227 || (containerRef.current?.contains(target) && (k === 21 || k === 37 || e.key === "ArrowLeft" || e.key === "j" || e.key === "J"))) {
        e.preventDefault();
        seek(-10);
        return;
      }

      // Pantalla Completa: f/F
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
        return;
      }

      // Mute: m/M
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
        return;
      }

      // PiP: p/P
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        togglePip();
        return;
      }

      // Volumen / OSD: D-Pad Up / Down cuando el reproductor está enfocado
      if (containerRef.current?.contains(target)) {
        if (k === 19 || k === 38 || e.key === "ArrowUp") {
          e.preventDefault();
          adjustVolume(0.1);
          return;
        }
        if (k === 20 || k === 40 || e.key === "ArrowDown") {
          e.preventDefault();
          adjustVolume(-0.1);
          return;
        }
      }

      resetHideTimer();
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [togglePlay, seek, adjustVolume, resetHideTimer]);

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || isDragging) return;
    setCurrentTime(video.currentTime);
    if (video.buffered.length > 0) {
      setBuffered(video.buffered.end(video.buffered.length - 1));
    }
  };

  const onLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration || 0);
  };

  // Lógica de Scrubbing en la barra de progreso
  const calculateScrubPosition = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    const rect = progressContainerRef.current?.getBoundingClientRect();
    if (!rect || !duration) return 0;
    const clientX = e.clientX;
    const relX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return (relX / rect.width) * duration;
  };

  const handleProgressBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressContainerRef.current?.getBoundingClientRect();
    if (!rect || !duration) return;
    const clientX = e.clientX;
    const relX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setHoverX(relX);
    setHoverTime((relX / rect.width) * duration);
  };

  const handleProgressBarMouseLeave = () => {
    setHoverTime(null);
  };

  const handleProgressBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDragging(true);
    const newTime = calculateScrubPosition(e);
    setCurrentTime(newTime);
    seekTo(newTime);

    const onMouseMove = (ev: MouseEvent) => {
      const posTime = calculateScrubPosition(ev);
      setCurrentTime(posTime);
      seekTo(posTime);
    };

    const onMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      id="tv-native-player"
      tabIndex={0}
      onMouseMove={resetHideTimer}
      onClick={() => {
        if (showSettings) setShowSettings(false);
      }}
      className={`relative w-full h-full bg-black flex items-center justify-center select-none outline-none group ${
        !showControls && isPlaying ? "cursor-none" : "cursor-default"
      }`}
    >
      {error ? (
        <div className="p-6 text-center text-amber-300 text-sm flex flex-col items-center gap-3">
          <span className="text-3xl">⚠️</span>
          <span>No se pudo reproducir este stream directo.</span>
          <button
            onClick={() => {
              setCurrentUrlIndex(0);
              setError(false);
            }}
            className="px-4 py-1.5 rounded-xl bg-[#008CFF] text-white text-xs font-bold hover:bg-[#0077dd] transition"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            playsInline
            title={title}
            className="w-full h-full bg-black object-contain pointer-events-auto cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={onLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={() => {
              if (currentUrlIndex + 1 < candidateUrls.length) {
                const nextIdx = currentUrlIndex + 1;
                setCurrentUrlIndex(nextIdx);
                triggerFeedback("🔄", `Conmutando stream (${nextIdx + 1}/${candidateUrls.length})`);
              } else {
                setError(true);
                onError?.();
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              onEnded?.();
            }}
          >
            {source.subtitles?.map((sub) =>
              sub.url ? (
                <track
                  key={sub.id}
                  kind="subtitles"
                  src={sub.url}
                  srcLang={sub.lang}
                  label={sub.label}
                  default={sub.isDefault}
                />
              ) : null
            )}
            Tu navegador no soporta reproducción de video HTML5.
          </video>

          {/* 1. Botón Central Grande Translúcido (Fiel a la imagen de referencia) */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className={`absolute inset-0 flex items-center justify-center pointer-events-auto transition-opacity duration-300 z-10 ${
              !isPlaying || showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <button
              type="button"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/25 hover:bg-white/35 backdrop-blur-md border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer group/btn"
              title={isPlaying ? "Pausar" : "Reproducir"}
            >
              {isPlaying ? (
                <svg className="w-10 h-10 text-white fill-current" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-10 h-10 text-white fill-current ml-1" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>

          {/* 2. Feedback OSD Flotante (Saltos de tiempo, volumen, fallbacks) */}
          {osdFeedback && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-scale-in">
              <div className="px-6 py-4 rounded-2xl bg-black/85 backdrop-blur-md border border-white/20 shadow-2xl flex flex-col items-center gap-2">
                <span className="text-4xl sm:text-5xl">{osdFeedback.icon}</span>
                <span className="text-sm sm:text-base font-extrabold text-white tracking-wide">
                  {osdFeedback.text}
                </span>
              </div>
            </div>
          )}

          {/* 3. Menú de Ajustes / Velocidad de Reproducción */}
          {showSettings && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-6 bottom-16 w-44 rounded-2xl bg-black/90 backdrop-blur-xl border border-white/20 shadow-2xl p-2 z-40 animate-scale-in"
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-3 py-1 mb-1 border-b border-white/10">
                Velocidad
              </div>
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => changeSpeed(rate)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                    playbackRate === rate
                      ? "bg-[#008CFF] text-white"
                      : "text-zinc-200 hover:bg-white/10"
                  }`}
                >
                  <span>{rate === 1 ? "Normal (1x)" : `${rate}x`}</span>
                  {playbackRate === rate && <span>✓</span>}
                </button>
              ))}
            </div>
          )}

          {/* 4. Barra de Controles Inferior (Idéntica a la imagen del usuario) */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute inset-x-0 bottom-0 pt-8 pb-3 px-4 sm:px-6 bg-gradient-to-t from-black/95 via-black/75 to-transparent z-20 transition-opacity duration-300 pointer-events-auto flex flex-col gap-2 ${
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* Barra de progreso interactiva (Scrubbing) */}
            <div
              ref={progressContainerRef}
              onMouseDown={handleProgressBarMouseDown}
              onMouseMove={handleProgressBarMouseMove}
              onMouseLeave={handleProgressBarMouseLeave}
              className="relative w-full h-3 flex items-center cursor-pointer group/progress py-1"
            >
              {/* Pista de fondo */}
              <div className="relative w-full h-1 sm:h-1.5 bg-white/20 rounded-full overflow-hidden transition-all duration-200 group-hover/progress:h-2">
                {/* Buffer */}
                <div
                  className="absolute top-0 bottom-0 left-0 bg-white/35 transition-all duration-200 rounded-full"
                  style={{ width: `${Math.min(100, bufferPct)}%` }}
                />
                {/* Progreso jugado */}
                <div
                  className="absolute top-0 bottom-0 left-0 bg-[#008CFF] rounded-full transition-all duration-75"
                  style={{ width: `${Math.min(100, progressPct)}%` }}
                />
              </div>

              {/* Cabezal deslizante / Thumb */}
              <div
                className="absolute w-3 h-3 sm:w-3.5 sm:h-3.5 bg-white rounded-full shadow-[0_0_8px_rgba(0,0,0,0.8)] -translate-x-1/2 pointer-events-none scale-0 group-hover/progress:scale-100 transition-transform duration-150"
                style={{ left: `${Math.min(100, progressPct)}%` }}
              />

              {/* Tooltip de tiempo al pasar el mouse */}
              {hoverTime !== null && (
                <div
                  className="absolute -top-7 px-2 py-0.5 rounded bg-black/90 text-white font-mono text-[10px] pointer-events-none -translate-x-1/2 border border-white/20 shadow-md"
                  style={{ left: `${hoverX}px` }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}
            </div>

            {/* Fila de controles principales: Izquierda [Play, Tiempos] / Derecha [Ajustes, PiP, Fullscreen, Volumen] */}
            <div className="flex items-center justify-between text-white">
              {/* Sección Izquierda */}
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Botón Play/Pausa */}
                <button
                  type="button"
                  onClick={togglePlay}
                  className="text-white hover:text-[#008CFF] transition-colors p-1 focus:outline-none"
                  title={isPlaying ? "Pausar" : "Reproducir"}
                >
                  {isPlaying ? (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                {/* Contador de Tiempo Exacto (25:37 / 52:00) */}
                <div className="text-xs sm:text-sm font-semibold tracking-wider text-zinc-300 font-mono tabular-nums select-none">
                  <span>{formatTime(currentTime)}</span>
                  <span className="mx-1 text-zinc-500">/</span>
                  <span className="text-zinc-400">{formatTime(duration)}</span>
                </div>
              </div>

              {/* Sección Derecha */}
              <div className="flex items-center gap-2 sm:gap-3.5">
                {/* Botón Ajustes (Engranaje) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSettings(!showSettings);
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${
                    showSettings
                      ? "text-[#008CFF] bg-white/10"
                      : "text-zinc-300 hover:text-white hover:bg-white/10"
                  }`}
                  title="Ajustes de reproducción"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>

                {/* Botón Picture-in-Picture (PiP) */}
                {isPipAvailable && (
                  <button
                    type="button"
                    onClick={togglePip}
                    className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                    title="Ventana flotante (Picture in Picture)"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <rect x="11" y="9" width="9" height="7" rx="1.5" fill="currentColor" />
                    </svg>
                  </button>
                )}

                {/* Botón Pantalla Completa */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                  title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                >
                  {isFullscreen ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0l5 0m-5 0l0 5m11 0l5-5m0 0l-5 0m5 0l0 5M9 15l-5 5m0 0l5 0m-5 0l0-5m11 0l5 5m0 0l-5 0m5 0l0-5" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  )}
                </button>

                {/* Botón Volumen y Slider interactivo */}
                <div className="flex items-center gap-1.5 group/vol">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                    title={isMuted ? "Activar sonido" : "Silenciar"}
                  >
                    {isMuted || volume === 0 ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    ) : volume < 0.5 ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    )}
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setExactVolume(parseFloat(e.target.value))}
                    className="w-0 group-hover/vol:w-16 sm:group-hover/vol:w-20 transition-all duration-200 accent-[#008CFF] cursor-pointer h-1 bg-white/20 rounded-full"
                    title={`Volumen: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
