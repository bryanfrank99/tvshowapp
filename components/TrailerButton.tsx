"use client";
import { useState } from "react";
import { IconPlay } from "@/components/Icons";

// Botón que despliega el tráiler de YouTube en línea.
export default function TrailerButton({ videoKey, label }: { videoKey: string; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-200 hover:text-white">
        <IconPlay size={16} />{label}
      </button>
      {open && (
        <div className="mt-3 rounded-2xl overflow-hidden border border-white/10 bg-black max-w-3xl">
          <iframe
            src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0`}
            className="w-full aspect-video"
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            title={label}
          />
        </div>
      )}
    </div>
  );
}
