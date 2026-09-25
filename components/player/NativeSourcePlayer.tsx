"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { Source } from "@/lib/sources";
import { IconPlay } from "@/components/Icons";

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
  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [showOsd, setShowOsd] = useState(true);
  const [osdFeedback, setOsdFeedback] = useState<{ icon: string; text: string } | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetHideTimer = useCallback(() => {
    setShowOsd(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setShowOsd(false);
      setOsdFeedback(null);
    }, 3500);
  }, []);

  const triggerFeedback = useCallback((icon: string, text: string) => {
    setOsdFeedback({ icon, text });
    resetHideTimer();
  }, [resetHideTimer]);

  useEffect(() => {
    setError(false);
    const video = videoRef.current;
    if (!video) return;

    video.src = source.url;
    video.load();
    video.play().then(() => {
      setIsPlaying(true);
      resetHideTimer();
    }).catch(() => {
      setIsPlaying(false);
      resetHideTimer();
    });
  }, [source.url, source.type, resetHideTimer]);

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

  const adjustVolume = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    const newVol = Math.max(0, Math.min(1, video.volume + delta));
    video.volume = newVol;
    const pct = Math.round(newVol * 100);
    triggerFeedback(newVol === 0 ? "🔇" : "🔊", `Volumen: ${pct}%`);
  }, [triggerFeedback]);

  // Manejo de eventos de teclado y control remoto de TV
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      const k = e.keyCode;

      // Play / Pause: DPAD_CENTER (23), Enter (13, 66), Space (32), MediaPlayPause (179)
      if (k === 23 || k === 13 || k === 66 || k === 32 || k === 179 || e.key === "MediaPlayPause") {
        // Solo interceptar si el foco está en el reproductor o la ventana
        if (!target || target === document.body || containerRef.current?.contains(target)) {
          e.preventDefault();
          togglePlay();
          return;
        }
      }

      // Fast Forward: D-Pad Right (22, 39), MediaFastForward (228)
      if (k === 228 || (containerRef.current?.contains(target) && (k === 22 || k === 39 || e.key === "ArrowRight"))) {
        e.preventDefault();
        seek(10);
        return;
      }

      // Rewind: D-Pad Left (21, 37), MediaRewind (227)
      if (k === 227 || (containerRef.current?.contains(target) && (k === 21 || k === 37 || e.key === "ArrowLeft"))) {
        e.preventDefault();
        seek(-10);
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

      // Mostrar OSD ante cualquier actividad del mando
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
    if (!video) return;
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

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      id="tv-native-player"
      tabIndex={0}
      onMouseMove={resetHideTimer}
      onClick={togglePlay}
      className="relative w-full h-full bg-black flex items-center justify-center select-none outline-none group focus:ring-2 focus:ring-[#008CFF]"
    >
      {error ? (
        <div className="p-6 text-center text-amber-300 text-sm">
          No se pudo reproducir este stream directo.
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            playsInline
            title={title}
            className="w-full h-full bg-black object-contain pointer-events-auto"
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={onLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={() => {
              setError(true);
              onError?.();
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

          {/* Feedback Flotante Central (Play, Pausa, Saltos ⏩/⏪) */}
          {osdFeedback && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-scale-in">
              <div className="px-6 py-4 rounded-2xl bg-black/80 backdrop-blur-md border border-white/20 shadow-2xl flex flex-col items-center gap-2">
                <span className="text-4xl sm:text-5xl">{osdFeedback.icon}</span>
                <span className="text-sm sm:text-base font-extrabold text-white tracking-wide">
                  {osdFeedback.text}
                </span>
              </div>
            </div>
          )}

          {/* OSD Inferior TV (Barra de Progreso y Tiempos de 10 pies) */}
          <div
            className={`absolute inset-x-0 bottom-0 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent z-20 transition-opacity duration-300 pointer-events-none ${
              showOsd ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-white mb-2">
              <span className="truncate max-w-[70%]">{title}</span>
              <span className="tabular-nums tracking-wider text-zinc-300">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Barra de progreso */}
            <div className="relative w-full h-2 sm:h-2.5 bg-white/20 rounded-full overflow-hidden">
              {/* Buffer */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-white/30 transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(100, bufferPct)}%` }}
              />
              {/* Progreso jugado */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-[#008CFF] shadow-[0_0_12px_#008CFF] transition-all duration-100 rounded-full"
                style={{ width: `${Math.min(100, progressPct)}%` }}
              />
            </div>

            {/* Indicador de ayuda del mando */}
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-400 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">OK</kbd>
                <span>{isPlaying ? "Pausar" : "Reproducir"}</span>
                <span className="mx-1.5 text-zinc-600">·</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">◀ / ▶</kbd>
                <span>±10s</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">▲ / ▼</kbd>
                <span>Volumen</span>
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
