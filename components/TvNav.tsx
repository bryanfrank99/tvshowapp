"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isTVUA } from "@/hooks/useIsTV";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isVisible(el: HTMLElement): boolean {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0";
}

function getFocusableElements(): HTMLElement[] {
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
  const root = dialog || document;
  const all = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return all.filter((el) => isVisible(el) && !el.hasAttribute("disabled"));
}

function findBestSpatialCandidate(current: HTMLElement, dir: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight", candidates: HTMLElement[]): HTMLElement | null {
  const curRect = current.getBoundingClientRect();
  const curX = curRect.left + curRect.width / 2;
  const curY = curRect.top + curRect.height / 2;

  let best: HTMLElement | null = null;
  let bestScore = Infinity;

  for (const cand of candidates) {
    if (cand === current) continue;
    const r = cand.getBoundingClientRect();
    const candX = r.left + r.width / 2;
    const candY = r.top + r.height / 2;

    let dPrimary = 0;
    let dSecondary = 0;
    let isValid = false;

    if (dir === "ArrowRight") {
      if (r.left >= curRect.left + 2 && candX > curX + 3) {
        dPrimary = candX - curX;
        dSecondary = Math.abs(candY - curY);
        // Strongly prefer elements in the same horizontal band
        const score = dPrimary + dSecondary * 2.8;
        if (score < bestScore) {
          bestScore = score;
          best = cand;
        }
      }
    } else if (dir === "ArrowLeft") {
      if (r.right <= curRect.right - 2 && candX < curX - 3) {
        dPrimary = curX - candX;
        dSecondary = Math.abs(candY - curY);
        const score = dPrimary + dSecondary * 2.8;
        if (score < bestScore) {
          bestScore = score;
          best = cand;
        }
      }
    } else if (dir === "ArrowDown") {
      if (r.top >= curRect.top + 2 && candY > curY + 3) {
        dPrimary = candY - curY;
        dSecondary = Math.abs(candX - curX);
        const score = dPrimary + dSecondary * 1.8;
        if (score < bestScore) {
          bestScore = score;
          best = cand;
        }
      }
    } else if (dir === "ArrowUp") {
      if (r.bottom <= curRect.bottom - 2 && candY < curY - 3) {
        dPrimary = curY - candY;
        dSecondary = Math.abs(candX - curX);
        const score = dPrimary + dSecondary * 1.8;
        if (score < bestScore) {
          bestScore = score;
          best = cand;
        }
      }
    }
  }

  // Fallback for moving between SideNav and Main content if no strict candidate
  if (!best) {
    if (dir === "ArrowRight" && current.closest('nav[aria-label="Principal"]')) {
      const mainEls = getFocusableElements().filter((el) => el.closest("main"));
      if (mainEls.length > 0) {
        let minDiff = Infinity;
        for (const m of mainEls) {
          const r = m.getBoundingClientRect();
          const diff = Math.abs(r.top - curRect.top);
          if (diff < minDiff) {
            minDiff = diff;
            best = m;
          }
        }
      }
    } else if (dir === "ArrowLeft" && !current.closest('nav[aria-label="Principal"]')) {
      const navEls = getFocusableElements().filter((el) => el.closest('nav[aria-label="Principal"]'));
      if (navEls.length > 0) {
        let minDiff = Infinity;
        for (const n of navEls) {
          const r = n.getBoundingClientRect();
          const diff = Math.abs(r.top - curRect.top);
          if (diff < minDiff) {
            minDiff = diff;
            best = n;
          }
        }
      }
    }
  }

  return best;
}

export default function TvNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Activación de clases tv en body y html para compatibilidad universal
  useEffect(() => {
    const tv = isTVUA();
    document.body.classList.toggle("tv", tv);
    document.documentElement.classList.toggle("tv", tv);
  }, []);

  // Manejo de teclas del mando (Atrás, D-Pad Center/OK, Flechas espaciales)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.keyCode;

      // Botón Atrás (Android 4, Escape 27, Tizen 10009, webOS 461)
      if (e.key === "GoBack" || k === 4 || k === 27 || k === 10009 || k === 461) {
        const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
        if (dialog) {
          e.preventDefault();
          const closeBtn = dialog.querySelector<HTMLElement>('button[aria-label="Close"], button:has(span), button');
          if (closeBtn) closeBtn.click();
          return;
        }
        e.preventDefault();
        router.back();
        return;
      }

      // Botón D-Pad Center / OK (Android keycode 23)
      if (k === 23) {
        const ae = document.activeElement as HTMLElement | null;
        if (ae && ae !== document.body) {
          ae.click();
          e.preventDefault();
          return;
        }
      }

      // Flechas de navegación espacial (ArrowUp, ArrowDown, ArrowLeft, ArrowRight o keycodes 19, 20, 21, 22)
      let dir: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | null = null;
      if (e.key === "ArrowUp" || k === 19 || k === 38) dir = "ArrowUp";
      else if (e.key === "ArrowDown" || k === 20 || k === 40) dir = "ArrowDown";
      else if (e.key === "ArrowLeft" || k === 21 || k === 37) dir = "ArrowLeft";
      else if (e.key === "ArrowRight" || k === 22 || k === 39) dir = "ArrowRight";

      if (!dir) return;

      const candidates = getFocusableElements();
      if (candidates.length === 0) return;

      let ae = document.activeElement as HTMLElement | null;

      // Si no hay elemento enfocado, o el foco está en el body, enfocar el primer elemento relevante
      if (!ae || ae === document.body || !candidates.includes(ae)) {
        const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
        const first = dialog
          ? candidates.find((el) => dialog.contains(el))
          : candidates.find((el) => el.closest("main")) || candidates[0];
        if (first) {
          e.preventDefault();
          first.focus({ preventScroll: true });
          first.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
        }
        return;
      }

      // Si el elemento activo es un input y se presiona izquierda o derecha dentro del texto, permitir edición
      if (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA") {
        const input = ae as HTMLInputElement;
        if (dir === "ArrowLeft" && input.selectionStart !== null && input.selectionStart > 0) {
          return; // Dejar que el cursor del input se mueva
        }
        if (dir === "ArrowRight" && input.selectionEnd !== null && input.selectionEnd < (input.value?.length || 0)) {
          return; // Dejar que el cursor del input se mueva
        }
      }

      const target = findBestSpatialCandidate(ae, dir, candidates);
      if (target) {
        e.preventDefault();
        target.focus({ preventScroll: true });
        target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      }
    };

    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || el === document.body) return;
      el.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "smooth" });
      try {
        const key = "tvfocus:" + pathname;
        const id = el.id || el.getAttribute("href") || el.textContent?.slice(0, 40);
        if (id) sessionStorage.setItem(key, id);
      } catch {}
    };

    window.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [pathname, router]);

  // Al cambiar de ruta o cargar la página: enfocar primer elemento relevante
  useEffect(() => {
    const timer = setTimeout(() => {
      let id: string | null = null;
      try { id = sessionStorage.getItem("tvfocus:" + pathname); } catch {}
      let el: HTMLElement | null = null;
      if (id) {
        el = document.getElementById(id) ||
          (document.querySelector(`[href="${CSS.escape(id)}"]`) as HTMLElement | null);
        if (el && !isVisible(el)) el = null;
      }
      if (!el) {
        const candidates = getFocusableElements();
        el = candidates.find((x) => x.closest("main")) || candidates[0] || null;
      }
      if (el) {
        el.focus({ preventScroll: true });
        el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
