"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isTVUA } from "@/hooks/useIsTV";

// Navegación TV: espacial con flechas + memoria de foco + tecla Atrás.
const FOCUSABLE = "a[href], button:not([disabled]), input, [tabindex]:not([tabindex='-1'])";

function visible(el: Element) {
  const r = (el as HTMLElement).getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function railOf(el: Element | null) {
  return el?.closest?.("[data-rail]") as HTMLElement | null;
}

function focusablesIn(root: Element) {
  return Array.from(root.querySelectorAll(FOCUSABLE)).filter(
    (el) => visible(el) && !(el as HTMLElement).hasAttribute("disabled")
  ) as HTMLElement[];
}

function nearestByX(from: DOMRect, els: HTMLElement[]) {
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  const cx = from.left + from.width / 2;
  for (const el of els) {
    const r = el.getBoundingClientRect();
    const score = Math.abs(r.left + r.width / 2 - cx) + Math.abs(r.top - from.top) * 0.2;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  return best;
}

function rails(): HTMLElement[] {
  // data-rail explícito, o rails/grids de contenido por convención.
  const found = Array.from(document.querySelectorAll("[data-rail], main .rail, main section div.grid, main div.grid"));
  const uniq = Array.from(new Set(found)).filter(visible) as HTMLElement[];
  // Fuera grids anidados (quedarse con el contenedor mayor).
  return uniq.filter((el) => !uniq.some((o) => o !== el && o.contains(el)));
}

export default function TvNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Marca body.tv en modo TV (para CSS: padding del sidebar en pantallas chicas).
  useEffect(() => {
    if (isTVUA()) document.body.classList.add("tv");
  }, []);

  // Tecla Atrás del mando.
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

  // Flechas espaciales dentro de rails + scroll al foco.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
      const ae = document.activeElement as HTMLElement | null;
      if (!ae || ae === document.body) return;
      if (/INPUT|TEXTAREA|SELECT/.test(ae.tagName)) return;
      const rail = railOf(ae);
      if (!rail) return;
      e.preventDefault();
      const items = focusablesIn(rail);
      const idx = items.indexOf(ae);
      const all = rails();
      const ri = all.indexOf(rail);
      const rect = ae.getBoundingClientRect();
      let target: HTMLElement | null = null;
      if (e.key === "ArrowRight") target = items[idx + 1] || null;
      if (e.key === "ArrowLeft") target = items[idx - 1] || null;
      if (e.key === "ArrowDown") {
        const next = all[ri + 1];
        target = next ? nearestByX(rect, focusablesIn(next)) : null;
      }
      if (e.key === "ArrowUp") {
        const prev = all[ri - 1];
        target = prev ? nearestByX(rect, focusablesIn(prev)) : null;
      }
      target?.focus({ preventScroll: true });
    };
    const onFocus = (e: FocusEvent) => {
      (e.target as HTMLElement)?.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "smooth" });
      try {
        const el = e.target as HTMLElement;
        const key = "tvfocus:" + pathname;
        const id = el.id || el.getAttribute("href") || el.textContent?.slice(0, 40);
        if (id) sessionStorage.setItem(key, id);
      } catch {}
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocus);
    };
  }, [pathname]);

  // Al cambiar de página: restaurar foco guardado o primero del contenido.
  useEffect(() => {
    let id: string | null = null;
    try { id = sessionStorage.getItem("tvfocus:" + pathname); } catch {}
    let el: HTMLElement | null = null;
    if (id) {
      el = document.getElementById(id) ||
        (document.querySelector(`[href="${CSS.escape(id)}"]`) as HTMLElement | null);
      if (el && !visible(el)) el = null;
    }
    if (!el && document.activeElement === document.body) {
      el = document.querySelector<HTMLElement>("main a, main button, main input");
    }
    el?.focus({ preventScroll: true });
  }, [pathname]);

  return null;
}
