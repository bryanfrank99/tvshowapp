"use client";
import { useState, useEffect, useRef } from "react";
import { IconPlay } from "@/components/Icons";

// Botón que despliega el tráiler de YouTube en línea con soporte para mando de TV.
export default function TrailerButton({ videoKey, label }: { videoKey: string; label: string }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Escuchar botón Atrás de TV para cerrar el tráiler
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.keyCode;
      if (e.key === "GoBack" || k === 4 || k === 27 || e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div>
      <button
        ref={btnRef}
        id="btn-trailer-open"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-200 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/25 focus:ring-2 focus:ring-[#008CFF] outline-none transition"
      >
        <IconPlay size={16} />
        <span>{label}</span>
      </button>

      {open && (
        <div id="trailer-modal-box" className="mt-3 rounded-2xl overflow-hidden border border-white/15 bg-black max-w-3xl shadow-2xl animate-scale-in">
          <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-white/10">
            <span className="text-xs font-bold text-zinc-300 truncate">{label}</span>
            <button
              id="btn-trailer-close"
              autoFocus
              onClick={() => {
                setOpen(false);
                btnRef.current?.focus();
              }}
              className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500 border border-red-500/40 text-xs font-bold text-red-200 hover:text-white transition focus:ring-2 focus:ring-red-400 outline-none"
            >
              ✕ Cerrar (Atrás)
            </button>
          </div>
          <iframe
            id="trailer-youtube-frame"
            src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0&enablejsapi=1`}
            className="w-full aspect-video bg-black block"
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            title={label}
          />
        </div>
      )}
    </div>
  );
}
