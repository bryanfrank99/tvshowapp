"use client";
import { useEffect, useState } from "react";

// Reloj informativo en la barra superior (estático, no interactivo ni focusable).
export default function Clock({ className = "" }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(t);
  }, []);

  return (
    <time
      id="header-clock"
      tabIndex={-1}
      data-tv-skip="true"
      aria-label="Hora actual"
      className={`text-xs sm:text-sm font-bold tabular-nums text-zinc-300 shrink-0 min-w-[36px] sm:min-w-[44px] text-center px-1.5 py-0.5 select-none pointer-events-none ${className}`.trim()}
    >
      {now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"}
    </time>
  );
}
