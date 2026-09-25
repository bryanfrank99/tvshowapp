"use client";
import { useEffect, useState } from "react";
import { LANGS, getClientLang, setClientLang } from "@/hooks/useLang";
import type { Lang } from "@/lib/dict";

// Reloj en el header. Clic = rotar idioma (también disponible en el rail).
export default function Clock({ className = "" }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  const [lang, setLang] = useState<Lang>("pt");
  useEffect(() => {
    setNow(new Date());
    setLang(getClientLang());
    const t = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(t);
  }, []);
  const next = () => {
    const i = LANGS.indexOf(lang);
    setClientLang(LANGS[(i + 1) % LANGS.length]);
  };
  return (
    <button
      onClick={next}
      title={`Idioma: ${lang.toUpperCase()} (clic para cambiar)`}
      className={`text-xs sm:text-sm font-bold tabular-nums text-zinc-300 hover:text-white shrink-0 min-w-[36px] sm:min-w-[44px] text-center px-1 py-0.5 rounded-lg hover:bg-white/5 active:scale-95 transition ${className}`.trim()}
    >
      {now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"}
    </button>
  );
}
