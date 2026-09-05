"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

// Navegación TV: scroll al foco, tecla Atrás (Tizen/WebOS/Android TV) y foco inicial.
export default function TvNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Tecla "Atrás" del mando → volver (10009 Samsung, 461 LG, GoBack Android TV, Escape en web).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = (e as any).keyCode;
      if (e.key === "GoBack" || k === 10009 || k === 461) {
        e.preventDefault();
        router.back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  // Mantener el foco siempre visible (rails horizontales incluidos).
  useEffect(() => {
    const onFocus = (e: FocusEvent) => {
      (e.target as HTMLElement)?.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "smooth" });
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, []);

  // Al cambiar de página, si nada tiene foco (típico en TV), enfocar lo primero del contenido.
  useEffect(() => {
    if (document.activeElement === document.body) {
      document.querySelector<HTMLElement>("main a, main button, main input")?.focus({ preventScroll: true });
    }
  }, [pathname]);

  return null;
}
