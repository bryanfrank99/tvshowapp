"use client";
import { useEffect, useRef } from "react";
import { useLang, LANGS, setClientLang } from "@/hooks/useLang";
import { t, type Lang } from "@/lib/dict";

const LANG_DETAILS: Record<Lang, { name: string; native: string; flag: string; desc: string }> = {
  pt: { name: "Português", native: "Português (Brasil)", flag: "🇧🇷", desc: "Idioma padrão da interface e catálogo" },
  es: { name: "Español", native: "Español", flag: "🇪🇸", desc: "Interfaz y catálogo en castellano / latino" },
  en: { name: "English", native: "English", flag: "🇺🇸", desc: "Interface and catalog in English" },
};

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LanguageModal({ isOpen, onClose }: LanguageModalProps) {
  const { lang } = useLang();
  const d = t(lang);
  const activeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (activeBtnRef.current) {
          activeBtnRef.current.focus();
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectLanguage = (l: Lang) => {
    onClose();
    if (l !== lang) {
      setClientLang(l);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lang-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#12121c] p-6 shadow-2xl text-left">
        <div className="flex items-center justify-between mb-5 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌐</span>
            <div>
              <h2 id="lang-modal-title" className="text-lg font-black text-white">
                {d.lang_label || "Idioma da interface"}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {lang === "pt"
                  ? "Selecione o idioma para navegação, sinopses e títulos"
                  : "Selecciona el idioma para la navegación, sinopsis y títulos"}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white inline-flex items-center justify-center text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-[#008CFF]"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-2.5 mb-5">
          {LANGS.map((l) => {
            const info = LANG_DETAILS[l];
            const isSelected = l === lang;
            return (
              <button
                key={l}
                ref={isSelected ? activeBtnRef : undefined}
                type="button"
                onClick={() => selectLanguage(l)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left group focus:outline-none ${
                  isSelected
                    ? "bg-[#008CFF]/20 border-[#008CFF] text-white shadow-lg shadow-blue-500/10 focus:ring-2 focus:ring-[#008CFF]"
                    : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white focus:ring-2 focus:ring-[#008CFF] focus:bg-white/15 focus:text-white"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-3xl">{info.flag}</span>
                  <div>
                    <p className="font-bold text-base text-white group-hover:text-[#008CFF] transition flex items-center gap-2">
                      <span>{info.native}</span>
                      {l === "pt" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                          Padrão
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">{info.desc}</p>
                  </div>
                </div>
                {isSelected ? (
                  <span className="w-7 h-7 rounded-full bg-[#008CFF] text-white inline-flex items-center justify-center font-black text-sm shadow">
                    ✓
                  </span>
                ) : (
                  <span className="w-7 h-7 rounded-full border border-white/20 inline-flex items-center justify-center text-transparent group-hover:border-white/40">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-[#008CFF]"
          >
            {d.volver || "Voltar"}
          </button>
        </div>
      </div>
    </div>
  );
}
