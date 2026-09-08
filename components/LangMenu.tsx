"use client";
import { useEffect, useRef, useState } from "react";
import { LANGS, useLang } from "@/hooks/useLang";
import { t } from "@/lib/dict";
import { IconGlobe } from "@/components/Icons";

const NAMES = { es: "Español", en: "English", pt: "Português" } as const;

// Selector estándar: globo con desplegable.
export default function LangMenu() {
  const { lang, setLang } = useLang();
  const d = t(lang);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, []);

  return (
    <div ref={ref} className="relative shrink-0" title={d.lang_label}>
      <button onClick={() => setOpen((v) => !v)} aria-label={d.lang_label} aria-haspopup="menu" aria-expanded={open}
        className="flex items-center gap-1 rounded-xl border border-white/10 px-2.5 py-2 text-xs font-bold text-zinc-300 hover:text-white hover:border-white/30">
        <IconGlobe size={16} />
        <span className="uppercase">{lang}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-36 rounded-xl border border-white/10 bg-[#14141c] shadow-xl overflow-hidden z-50">
          {LANGS.map((l) => (
            <button key={l} role="menuitem" onClick={() => { setOpen(false); if (l !== lang) setLang(l); }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-white/5 ${l === lang ? "text-white" : "text-zinc-400"}`}>
              {NAMES[l]}
              {l === lang && <span className="text-[#008CFF]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
