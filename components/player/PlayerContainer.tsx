"use client";
import React, { forwardRef } from "react";
import IframeSourcePlayer from "./IframeSourcePlayer";
import NativeSourcePlayer from "./NativeSourcePlayer";
import { PlayerSkeleton } from "@/components/Skeleton";
import AccessGate from "@/components/AccessGate";
import type { Source } from "@/lib/sources";

interface PlayerContainerProps {
  source: Source | null;
  title: string;
  locked: boolean;
  loading: boolean;
  error: boolean;
  hasNoSources: boolean;
  onRetry: () => void;
  onCycleNext: () => void;
  onSourceError?: () => void;
  onSourceLoad?: () => void;
  lang: string;
}

const PlayerContainer = forwardRef<HTMLDivElement, PlayerContainerProps>(
  (
    {
      source,
      title,
      locked,
      loading,
      error,
      hasNoSources,
      onRetry,
      onCycleNext,
      onSourceError,
      onSourceLoad,
      lang,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 bg-black shadow-[0_12px_40px_rgba(0,0,0,0.85)] ring-1 ring-white/5 min-h-[380px] portrait:aspect-[4/3] portrait:min-h-[380px] landscape:aspect-video landscape:max-h-[85vh] sm:aspect-video sm:min-h-0 sm:max-h-none transition-[min-height,aspect-ratio] duration-300"
      >
        {locked ? (
          <div className="w-full h-full min-h-[380px] sm:min-h-0 flex flex-col items-center justify-center gap-3 p-4 overflow-y-auto">
            <AccessGate onOk={onRetry} />
          </div>
        ) : error ? (
          <div className="w-full h-full min-h-[380px] sm:min-h-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm sm:text-base text-red-300 font-medium">
              {lang === "pt"
                ? "Erro ao carregar os servidores de reprodução."
                : "Error al cargar los servidores de reproducción."}
            </p>
            <button
              onClick={onRetry}
              className="px-5 py-2.5 rounded-xl bg-[#008CFF] hover:bg-[#0077dd] text-sm font-bold active:scale-95 transition shadow-lg"
            >
              {lang === "pt" ? "Tentar novamente" : "Reintentar"}
            </button>
          </div>
        ) : loading ? (
          <div className="w-full h-full min-h-[380px] sm:min-h-0 flex flex-col items-center justify-center p-6 bg-black">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-[#008CFF] border-t-transparent animate-spin" />
              <span className="text-xs text-zinc-400 font-medium tracking-wide">
                {lang === "pt" ? "Carregando servidor..." : "Cargando servidor..."}
              </span>
            </div>
          </div>
        ) : hasNoSources || !source ? (
          <div className="w-full h-full min-h-[380px] sm:min-h-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-sm sm:text-base text-amber-300 font-medium max-w-md">
              {lang === "pt"
                ? "Não foi possível reproduzir neste servidor. Selecione outro servidor abaixo."
                : "No se pudo reproducir en este servidor. Prueba seleccionando otro de la lista."}
            </p>
            <button
              onClick={onCycleNext}
              className="px-5 py-2.5 rounded-xl bg-[#008CFF] hover:bg-[#0077dd] text-sm font-bold active:scale-95 transition shadow-lg inline-flex items-center gap-2"
            >
              <span>🔄</span>
              <span>{lang === "pt" ? "Testar outro servidor" : "Probar otro servidor"}</span>
            </button>
          </div>
        ) : source.type === "iframe" ? (
          <IframeSourcePlayer
            key={source.url}
            source={source}
            title={title}
            onError={onSourceError}
            onLoad={onSourceLoad}
          />
        ) : (
          <NativeSourcePlayer
            key={source.url}
            source={source}
            title={title}
            onError={onSourceError}
          />
        )}
      </div>
    );
  }
);

PlayerContainer.displayName = "PlayerContainer";

export default PlayerContainer;
