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

export default function IframeSourcePlayer({
  source,
  title,
  onLoad,
  onError,
}: IframeSourcePlayerProps) {
  const [loading, setLoading] = useState(true);
  const [isTv, setIsTv] = useState(false);
  const [hudNotice, setHudNotice] = useState<string | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsTv(isTVUA() || document.body.classList.contains("tv"));
  }, []);

  useEffect(() => {
    setLoading(true);
  }, [source.url]);

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

  // Delegar foco directamente al iframe para permitir interacción con el D-pad en el reproductor embebido
  const focusIframe = useCallback(() => {
    const frame = frameRef.current;
    if (frame) {
      frame.focus();
      setHudNotice("Control en el reproductor (Pulsa Atrás para salir)");
      setTimeout(() => setHudNotice(null), 4000);
    }
  }, []);

  // Escuchar teclas cuando el contenedor tiene foco
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.keyCode;
      // D-Pad Center (23), Enter (13), Espacio (32)
      if (k === 23 || k === 13 || k === 32 || e.key === "Enter") {
        // Si el foco está en el contenedor general del iframe, enfocar el iframe
        if (document.activeElement === container) {
          e.preventDefault();
          focusIframe();
          sendIframeCommand("play");
        }
      }
      // Botón Atrás: si el foco estaba en el iframe o contenedor, devolver foco a la página
      if (k === 4 || k === 27 || e.key === "Escape") {
        container.blur();
        document.getElementById("btn-fullscreen")?.focus();
      }
    };

    container.addEventListener("keydown", onKeyDown);
    return () => {
      container.removeEventListener("keydown", onKeyDown);
    };
  }, [focusIframe, sendIframeCommand]);

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

      {/* Notificación flotante de control TV */}
      {hudNotice && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-black/90 border border-[#008CFF]/60 text-white text-xs sm:text-sm font-semibold shadow-2xl animate-fade-in pointer-events-none">
          🎮 {hudNotice}
        </div>
      )}

      {/* Botón flotante para TV: Permite transferir el mando al reproductor interno */}
      {isTv && !loading && (
        <div className="absolute bottom-3 right-3 z-20 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 group-focus:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={focusIframe}
            className="px-3 py-1.5 rounded-xl bg-black/80 hover:bg-[#008CFF] border border-white/20 hover:border-transparent text-white text-xs font-bold shadow-lg inline-flex items-center gap-1.5 backdrop-blur-md active:scale-95 transition"
            title="Enfocar el reproductor embebido con el mando"
          >
            <span>🎮</span>
            <span>Enfocar Reproductor</span>
          </button>
        </div>
      )}

      <iframe
        ref={frameRef}
        key={source.url}
        src={source.url}
        title={title}
        autoFocus={isTv}
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
