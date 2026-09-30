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

function formatRemainingTime(currentTime: number, duration: number): string {
  if (isNaN(duration) || duration <= 0) return "00:00";
  const rem = Math.max(0, duration - currentTime);
  return `-${formatTime(rem)}`;
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

  // Lista de URLs candidatas para failover automático
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
  const [showSubtitlesMenu, setShowSubtitlesMenu] = useState(false);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>("off");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPipAvailable, setIsPipAvailable] = useState(false);

  // Visibilidad de controles tipo Netflix TV
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
      if (!videoRef.current?.paused && !isDragging && !showSettings && !showSubtitlesMenu) {
        setShowControls(false);
        setOsdFeedback(null);
      }
    }, 4000);
  }, [isDragging, showSettings, showSubtitlesMenu]);

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

  // Inicialización y carga de stream
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
                console.warn("[NativePlayer] Error fatal de red en HLS stream, conmutando:", activeUrl);
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

  const selectSubtitleTrack = (subId: string) => {
    const video = videoRef.current;
    if (!video) return;
    setSelectedSubtitle(subId);
    for (let i = 0; i < video.textTracks.length; i++) {
      const track = video.textTracks[i];
      if (subId === "off") {
        track.mode = "disabled";
      } else {
        track.mode = (track.label === subId || track.language === subId) ? "showing" : "disabled";
      }
    }
    setShowSubtitlesMenu(false);
    triggerFeedback("💬", subId === "off" ? "Subtítulos desactivados" : `Subtítulos: ${subId}`);
  };

  // Manejo de teclado y mando a distancia de TV (D-Pad)
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

      // Volumen / OSD: D-Pad Up / Down
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
        if (showSubtitlesMenu) setShowSubtitlesMenu(false);
      }}
      className={`relative w-full h-full bg-black flex items-center justify-center select-none outline-none group ${
        !showControls && isPlaying ? "cursor-none" : "cursor-default"
      }`}
    >
      {error ? (
        <div className="p-8 text-center text-zinc-300 text-sm flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-500">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <span className="font-semibold text-white text-base">No se pudo reproducir este stream directo.</span>
          <button
            onClick={() => {
              setCurrentUrlIndex(0);
              setError(false);
            }}
            className="px-6 py-2 rounded-xl bg-[#E50914] text-white text-xs font-bold hover:bg-[#b80710] active:scale-95 transition shadow-lg"
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

          {/* 1. Header Superior tipo Netflix TV */}
          <div
            className={`absolute top-0 inset-x-0 pt-5 pb-12 px-6 sm:px-10 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between z-20 transition-opacity duration-300 pointer-events-none ${
              showControls ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base sm:text-xl font-black text-white tracking-wide drop-shadow-md line-clamp-1">
                {title}
              </h2>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-400">
                <span>{source.realName || source.providerName}</span>
                <span className="w-1 h-1 rounded-full bg-zinc-500" />
                <span className="text-[#008CFF] font-bold">1080p Full HD</span>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-white/10 text-zinc-300 border border-white/10 backdrop-blur-md">
                HLS Nativo
              </span>
            </div>
          </div>

          {/* 2. Trío de Controles Centrales (Netflix TV Style) */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className={`absolute inset-0 flex items-center justify-center gap-8 sm:gap-14 pointer-events-auto transition-opacity duration-300 z-10 ${
              !isPlaying || showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* Retroceder 10s */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                seek(-10);
              }}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 backdrop-blur-md text-white flex flex-col items-center justify-center transition-all hover:scale-110 active:scale-95 focus:ring-2 focus:ring-white focus:outline-none shadow-xl cursor-pointer"
              title="Retroceder 10s"
            >
              <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 0 1 5 5v2m-15-7l4-4m-4 4l4 4" />
              </svg>
              <span className="text-[9px] font-extrabold -mt-1 font-mono">10</span>
            </button>

            {/* Botón Central Play / Pausa Principal */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 hover:bg-white/30 border border-white/30 backdrop-blur-xl text-white shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex items-center justify-center transition-all hover:scale-110 active:scale-95 focus:ring-2 focus:ring-white focus:outline-none cursor-pointer"
              title={isPlaying ? "Pausar" : "Reproducir"}
            >
              {isPlaying ? (
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-current" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-current ml-1" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Avanzar 10s */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                seek(10);
              }}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 backdrop-blur-md text-white flex flex-col items-center justify-center transition-all hover:scale-110 active:scale-95 focus:ring-2 focus:ring-white focus:outline-none shadow-xl cursor-pointer"
              title="Avanzar 10s"
            >
              <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 0 0-5 5v2m15-7l-4-4m4 4l-4 4" />
              </svg>
              <span className="text-[9px] font-extrabold -mt-1 font-mono">10</span>
            </button>
          </div>

          {/* 3. Feedback OSD Flotante (Saltos de tiempo, volumen, fallbacks) */}
          {osdFeedback && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-scale-in">
              <div className="px-6 py-3.5 rounded-2xl bg-black/85 backdrop-blur-md border border-white/20 shadow-2xl flex items-center gap-3">
                <span className="text-3xl sm:text-4xl">{osdFeedback.icon}</span>
                <span className="text-sm sm:text-base font-extrabold text-white tracking-wide">
                  {osdFeedback.text}
                </span>
              </div>
            </div>
          )}

          {/* 4. Menú Flotante de Velocidad */}
          {showSettings && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-6 bottom-20 w-44 rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-white/20 shadow-2xl p-2 z-40 animate-scale-in"
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-3 py-1.5 mb-1 border-b border-white/10">
                Velocidad de Video
              </div>
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => changeSpeed(rate)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors focus:ring-1 focus:ring-white outline-none ${
                    playbackRate === rate
                      ? "bg-[#E50914] text-white"
                      : "text-zinc-200 hover:bg-white/10"
                  }`}
                >
                  <span>{rate === 1 ? "Normal (1x)" : `${rate}x`}</span>
                  {playbackRate === rate && <span>✓</span>}
                </button>
              ))}
            </div>
          )}

          {/* 5. Menú Flotante de Subtítulos */}
          {showSubtitlesMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-16 bottom-20 w-52 rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-white/20 shadow-2xl p-2 z-40 animate-scale-in"
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-3 py-1.5 mb-1 border-b border-white/10">
                Subtítulos
              </div>
              <button
                type="button"
                onClick={() => selectSubtitleTrack("off")}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors focus:ring-1 focus:ring-white outline-none ${
                  selectedSubtitle === "off"
                    ? "bg-[#E50914] text-white"
                    : "text-zinc-200 hover:bg-white/10"
                }`}
              >
                <span>Desactivados</span>
                {selectedSubtitle === "off" && <span>✓</span>}
              </button>
              {source.subtitles?.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => selectSubtitleTrack(sub.label || sub.lang)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors focus:ring-1 focus:ring-white outline-none ${
                    selectedSubtitle === (sub.label || sub.lang)
                      ? "bg-[#E50914] text-white"
                      : "text-zinc-200 hover:bg-white/10"
                  }`}
                >
                  <span className="truncate">{sub.label || sub.lang}</span>
                  {selectedSubtitle === (sub.label || sub.lang) && <span>✓</span>}
                </button>
              ))}
            </div>
          )}

          {/* 6. Barra de Controles Inferior (Estilo Netflix TV: simple, limpio, perfectamente alineado) */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute inset-x-0 bottom-0 pt-16 pb-4 px-6 sm:px-10 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-20 transition-opacity duration-300 pointer-events-auto flex flex-col gap-2.5 ${
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* Barra de progreso interactiva (Scrubbing tipo Netflix con rastro rojo) */}
            <div
              ref={progressContainerRef}
              onMouseDown={handleProgressBarMouseDown}
              onMouseMove={handleProgressBarMouseMove}
              onMouseLeave={handleProgressBarMouseLeave}
              className="relative w-full h-4 flex items-center cursor-pointer group/progress py-1"
            >
              {/* Pista de fondo */}
              <div className="relative w-full h-1 sm:h-1.5 bg-white/20 rounded-full overflow-hidden transition-all duration-200 group-hover/progress:h-2.5">
                {/* Buffer */}
                <div
                  className="absolute top-0 bottom-0 left-0 bg-white/35 transition-all duration-200 rounded-full"
                  style={{ width: `${Math.min(100, bufferPct)}%` }}
                />
                {/* Progreso jugado (Rojo Netflix) */}
                <div
                  className="absolute top-0 bottom-0 left-0 bg-[#E50914] rounded-full transition-all duration-75 shadow-[0_0_10px_rgba(229,9,20,0.8)]"
                  style={{ width: `${Math.min(100, progressPct)}%` }}
                />
              </div>

              {/* Cabezal deslizante / Thumb */}
              <div
                className="absolute w-3.5 h-3.5 sm:w-4 sm:h-4 bg-[#E50914] border-2 border-white rounded-full shadow-[0_0_8px_rgba(0,0,0,0.8)] -translate-x-1/2 pointer-events-none scale-0 group-hover/progress:scale-100 transition-transform duration-150"
                style={{ left: `${Math.min(100, progressPct)}%` }}
              />

              {/* Tooltip de tiempo flotante al pasar el mouse */}
              {hoverTime !== null && (
                <div
                  className="absolute -top-7 px-2 py-0.5 rounded bg-black/90 text-white font-mono text-[11px] font-bold pointer-events-none -translate-x-1/2 border border-white/20 shadow-md"
                  style={{ left: `${hoverX}px` }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}
            </div>

            {/* Fila de controles principales: Izquierda y Derecha simétricas y perfectamente alineadas */}
            <div className="flex items-center justify-between text-white">
              {/* Sección Izquierda: Play/Pausa, -10s, +10s, Volumen y Tiempo */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Botón Play/Pausa */}
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/10 active:scale-95 flex items-center justify-center text-white transition-all focus:ring-2 focus:ring-white focus:outline-none"
                  title={isPlaying ? "Pausar" : "Reproducir"}
                >
                  {isPlaying ? (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                {/* Retroceder 10s */}
                <button
                  type="button"
                  onClick={() => seek(-10)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/10 active:scale-95 flex items-center justify-center text-white transition-all focus:ring-2 focus:ring-white focus:outline-none"
                  title="Retroceder 10s"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 0 1 5 5v2m-15-7l4-4m-4 4l4 4" />
                  </svg>
                </button>

                {/* Avanzar 10s */}
                <button
                  type="button"
                  onClick={() => seek(10)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/10 active:scale-95 flex items-center justify-center text-white transition-all focus:ring-2 focus:ring-white focus:outline-none"
                  title="Avanzar 10s"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 0 0-5 5v2m15-7l-4-4m4 4l-4 4" />
                  </svg>
                </button>

                {/* Control de Volumen con slider suave */}
                <div className="flex items-center gap-1.5 group/vol ml-1">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/10 active:scale-95 flex items-center justify-center text-white transition-all focus:ring-2 focus:ring-white focus:outline-none"
                    title={isMuted ? "Activar sonido" : "Silenciar"}
                  >
                    {isMuted || volume === 0 ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    ) : volume < 0.5 ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m0 0a5 5 0 010-7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
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
                    className="w-0 group-hover/vol:w-16 sm:group-hover/vol:w-20 focus-within:w-20 transition-all duration-200 accent-[#E50914] cursor-pointer h-1.5 bg-white/20 rounded-full"
                    title={`Volumen: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                  />
                </div>

                {/* Contador de Tiempo Formato Netflix: Transcurrido / Restante */}
                <div className="text-xs sm:text-sm font-semibold tracking-wider text-zinc-300 font-mono tabular-nums select-none flex items-center gap-1.5 ml-2">
                  <span className="text-white font-bold">{formatTime(currentTime)}</span>
                  <span className="text-zinc-500 font-normal">/</span>
                  <span className="text-zinc-400">{formatRemainingTime(currentTime, duration)}</span>
                </div>
              </div>

              {/* Sección Derecha: Subtítulos, Velocidad, PiP, Pantalla Completa */}
              <div className="flex items-center gap-2 sm:gap-2.5">
                {/* Botón Subtítulos (si existen pistas) */}
                {source.subtitles && source.subtitles.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSubtitlesMenu(!showSubtitlesMenu);
                      setShowSettings(false);
                    }}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all focus:ring-2 focus:ring-white focus:outline-none ${
                      showSubtitlesMenu || selectedSubtitle !== "off"
                        ? "bg-white/20 text-[#E50914]"
                        : "hover:bg-white/10 text-zinc-300 hover:text-white"
                    }`}
                    title="Subtítulos y audio"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                  </button>
                )}

                {/* Selector de Velocidad (Pill compacto tipo Netflix) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSettings(!showSettings);
                    setShowSubtitlesMenu(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-extrabold tracking-wide transition-all border focus:ring-2 focus:ring-white focus:outline-none ${
                    showSettings || playbackRate !== 1
                      ? "bg-[#E50914] text-white border-[#E50914]"
                      : "bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white border-white/10"
                  }`}
                  title="Velocidad de reproducción"
                >
                  {playbackRate}x
                </button>

                {/* Botón Picture-in-Picture (PiP) */}
                {isPipAvailable && (
                  <button
                    type="button"
                    onClick={togglePip}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/10 active:scale-95 flex items-center justify-center text-zinc-300 hover:text-white transition-all focus:ring-2 focus:ring-white focus:outline-none"
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
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/10 active:scale-95 flex items-center justify-center text-zinc-300 hover:text-white transition-all focus:ring-2 focus:ring-white focus:outline-none"
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
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
