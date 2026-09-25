"use client";
import { useEffect, useRef, useState } from "react";
import type { Source } from "@/lib/sources";

interface NativeSourcePlayerProps {
  source: Source;
  title: string;
  onEnded?: () => void;
  onError?: () => void;
}

export default function NativeSourcePlayer({
  source,
  title,
  onEnded,
  onError,
}: NativeSourcePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    const video = videoRef.current;
    if (!video) return;

    video.src = source.url;
    video.load();
    video.play().catch(() => {
      // Autoplay restringido por política del navegador; el usuario interactuará con el botón de play
    });
  }, [source.url, source.type]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      {error ? (
        <div className="p-6 text-center text-amber-300 text-sm">
          No se pudo reproducir este stream directo.
        </div>
      ) : (
        <video
          ref={videoRef}
          controls
          playsInline
          title={title}
          className="w-full h-full bg-black object-contain"
          onError={() => {
            setError(true);
            onError?.();
          }}
          onEnded={onEnded}
        >
          {source.subtitles?.map((sub) => (
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
          ))}
          Tu navegador no soporta reproducción de video HTML5.
        </video>
      )}
    </div>
  );
}
