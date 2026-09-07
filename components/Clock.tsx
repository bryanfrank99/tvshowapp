"use client";
import { useEffect, useState } from "react";
import { LANGS, getClientLang, setClientLang } from "@/hooks/useLang";
import type { Lang } from "@/lib/dict";

// Reloj en el header. Clic = rotar idioma (también disponible en el rail).
export default function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  const [lang, setLang] = useState<Lang>("es");
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
    <button onClick={next} title={`Idioma: ${lang.toUpperCase()} (clic para cambiar)`}
      className="text-sm font-bold tabular-nums text-zinc-200 hover:text-white shrink-0">
      {now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"}
    </button>
  );
}
