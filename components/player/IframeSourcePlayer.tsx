"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import type { Source } from "@/lib/sources";
import { isTVUA } from "@/hooks/useIsTV";

interface IframeSourcePlayerProps {
  source: Source;
  title: string;
  onLoad?: () => void;
  onError?: () => void;
}

function enterFullscreen(el: HTMLElement) {
  if (el.requestFullscreen) {
    el.requestFullscreen().catch(() => {});
  } else if ((el as any).webkitRequestFullscreen) {
    (el as any).webkitRequestFullscreen();
  }
}

function exitFullscreen() {
  if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    }
  }
}

export default function IframeSourcePlayer({
  source,
  title,
  onLoad,
  onError,
}: IframeSourcePlayerProps) {
  const [loading, setLoading] = useState(true);
  const [isTv, setIsTv] = useState(false);
  const [isTrapped, setIsTrapped] = useState(false);
  const [hudNotice, setHudNotice] = useState<string | null>(null);
  const hudTimerRef = useRef<NodeJS.Timeout | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsTv(isTVUA() || document.body.classList.contains("tv"));
  }, []);

  useEffect(() => {
    setLoading(true);
  }, [source.url]);

  // Limpiar temporizador HUD al desmontar componente
  useEffect(() => {
    return () => {
      if (hudTimerRef.current) {
        clearTimeout(hudTimerRef.current);
      }
    };
  }, []);

  // Enviar mensajes postMessage multi-protocolo al iframe para intentar pausar/reproducir
  const sendIframeCommand = useCallback((cmd: "play" | "pause" | "seek", value?: number) => {
    const win = frameRef.current?.contentWindow;
    if (!win) return;

    try {
      if (cmd === "play") {
        win.postMessage(JSON.stringify({ event: "command", func: "playVideo" }), "*");
        win.postMessage({ type: "player:play" }, "*");
        win.postMessage({ action: "play" }, "*");
        win.postMessage("play", "*");
      } else if (cmd === "pause") {
        win.postMessage(JSON.stringify({ event: "command", func: "pauseVideo" }), "*");
        win.postMessage({ type: "player:pause" }, "*");
        win.postMessage({ action: "pause" }, "*");
        win.postMessage("pause", "*");
      } else if (cmd === "seek") {
        win.postMessage(JSON.stringify({ event: "command", func: "seekTo", args: [value || 0, true] }), "*");
        win.postMessage({ type: "player:seek", value }, "*");
        win.postMessage({ action: "seek", value }, "*");
      }
    } catch {}
  }, []);

  // Entrar en Modo Reproductor: Foco en iframe + Pantalla Completa obligatoria
  const enterPlayerMode = useCallback(() => {
    const frame = frameRef.current;
    const container = containerRef.current;
    if (!frame || !container) return;

    setIsTrapped(true);
    (window as any).__TV_PLAYER_LOCKED__ = true;
    try {
      (window as any).AndroidPlayerBridge?.setPlayerLocked(true);
    } catch {}

    // 1. Activar Pantalla Completa automáticamente
    enterFullscreen(container);

    // 2. Enfocar el iframe para capturar eventos de teclado/mando
    frame.focus();

    // 3. Mostrar guía flotante superior (se oculta automáticamente a los 10s)
    if (hudTimerRef.current) {
      clearTimeout(hudTimerRef.current);
    }
    setHudNotice("🎮 Modo Reproductor activo (Pulsa ATRÁS para salir)");
    hudTimerRef.current = setTimeout(() => {
      setHudNotice(null);
      hudTimerRef.current = null;
    }, 10000);
  }, []);

  // Salir de Modo Reproductor: Restaurar foco + Cerrar Pantalla Completa
  const exitPlayerMode = useCallback(() => {
    setIsTrapped(false);
    (window as any).__TV_PLAYER_LOCKED__ = false;
    try {
      (window as any).AndroidPlayerBridge?.setPlayerLocked(false);
    } catch {}

    // 1. Cerrar Pantalla Completa
    exitFullscreen();

    // 2. Desenfocar el iframe
    frameRef.current?.blur();
    containerRef.current?.blur();

    if (hudTimerRef.current) {
      clearTimeout(hudTimerRef.current);
      hudTimerRef.current = null;
    }
    setHudNotice(null);

    // 3. Devolver foco a los controles de la aplicación TVShow
    setTimeout(() => {
      const btn =
        document.getElementById("btn-focus-player") ||
        document.getElementById("btn-fullscreen");
      if (btn) {
        btn.focus();
        btn.classList.add("tv-focused");
        btn.setAttribute("data-tv-focused", "true");
      }
    }, 100);
  }, []);

  // Exponer métodos globales para activación y salida
  useEffect(() => {
    (window as any).__enterPlayerMode = enterPlayerMode;
    (window as any).__exitPlayerLocked = exitPlayerMode;
    return () => {
      delete (window as any).__enterPlayerMode;
      delete (window as any).__exitPlayerLocked;
    };
  }, [enterPlayerMode, exitPlayerMode]);

  // Captura global de la tecla ATRÁS cuando el modo bloqueado o pantalla completa está activo
  useEffect(() => {
    const onGlobalKeyDown = (e: KeyboardEvent) => {
      const k = e.keyCode;
      // Botón Atrás: Android keycode 4, Escape 27, GoBack
      if (e.key === "GoBack" || k === 4 || k === 27 || e.key === "Escape") {
        if (isTrapped || (window as any).__TV_PLAYER_LOCKED__ || document.fullscreenElement) {
          e.preventDefault();
          e.stopPropagation();
          exitPlayerMode();
        }
      }
    };

    window.addEventListener("keydown", onGlobalKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onGlobalKeyDown, true);
    };
  }, [exitPlayerMode, isTrapped]);

  // Si el usuario sale de pantalla completa mediante el sistema o navegador, salir también del modo reproductor
  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        if (isTrapped) {
          exitPlayerMode();
        }
      }
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
    };
  }, [exitPlayerMode, isTrapped]);

  return (
    <div
      ref={containerRef}
      id="tv-iframe-container"
      tabIndex={0}
      className="relative w-full h-full bg-black group outline-none focus:ring-2 focus:ring-[#008CFF]"
    >
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/85 pointer-events-none transition-opacity duration-300">
          <div className="flex flex-col items-center gap-2.5">
            <div className="w-8 h-8 rounded-full border-2 border-[#008CFF] border-t-transparent animate-spin" />
            <span className="text-xs text-zinc-300 font-medium tracking-wide">
              Conectando con {source.providerName}...
            </span>
          </div>
        </div>
      )}

      {/* Indicador flotante superior central: única leyenda para salir con la tecla Atrás (auto-ocultable a los 10s) */}
      {hudNotice && (
        <div
          onClick={exitPlayerMode}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-black/90 border border-[#008CFF]/60 text-white text-xs sm:text-sm font-semibold shadow-2xl animate-fade-in pointer-events-auto cursor-pointer select-none text-center hover:bg-black/95 transition"
          title="Haz clic o pulsa la tecla Atrás para salir"
        >
          {hudNotice}
        </div>
      )}

      <iframe
        ref={frameRef}
        key={source.url}
        src={source.url}
        title={title}
        tabIndex={0}
        referrerPolicy="origin"
        className="w-full h-full border-0 bg-black block"
        allowFullScreen
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        sandbox={source.sandbox || undefined}
        onLoad={() => {
          setLoading(false);
          onLoad?.();
        }}
        onError={() => {
          setLoading(false);
          onError?.();
        }}
      />
    </div>
  );
}
