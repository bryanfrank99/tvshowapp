"use client";
import { useState, useEffect, useRef } from "react";
import type { Source } from "@/lib/sources";

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
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setLoading(true);
  }, [source.url]);

  return (
    <div className="relative w-full h-full bg-black">
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
      <iframe
        ref={frameRef}
        key={source.url}
        src={source.url}
        title={title}
        autoFocus
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
