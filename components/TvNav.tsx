"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isTVUA } from "@/hooks/useIsTV";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isVisible(el: HTMLElement): boolean {
  if (!el || !el.isConnected) return false;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return false;
  const style = window.getComputedStyle(el);
  if (style.visibility === "hidden" || style.display === "none" || style.opacity === "0") return false;
  if (el.closest('[aria-hidden="true"]')) return false;
  return true;
}

function getFocusableElements(): HTMLElement[] {
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
  const root = dialog || document;
  const all = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return all.filter((el) => isVisible(el) && !el.hasAttribute("disabled"));
}

function setVisualFocus(target: HTMLElement) {
  // Limpiar indicadores visuales previos
  document.querySelectorAll(".tv-focused, [data-tv-focused='true']").forEach((node) => {
    node.classList.remove("tv-focused");
    node.removeAttribute("data-tv-focused");
  });

  target.classList.add("tv-focused");
  target.setAttribute("data-tv-focused", "true");
  target.focus({ preventScroll: true });

  const rail = target.closest(".rail");
  if (rail) {
    target.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  } else {
    target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }

  // Prevenir que el elemento quede tapado por la barra superior fija (~60-70px)
  const rect = target.getBoundingClientRect();
  if (rect.top < 80) {
    window.scrollBy({ top: rect.top - 90, behavior: "smooth" });
  } else if (rect.bottom > window.innerHeight - 20) {
    window.scrollBy({ top: rect.bottom - window.innerHeight + 40, behavior: "smooth" });
  }
}

type Direction = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

// 1. Navegación en el Menú Lateral (SideNav)
function navigateFromSideNav(current: HTMLElement, dir: Direction, candidates: HTMLElement[]): HTMLElement | null {
  const nav = current.closest('nav[aria-label="Principal"]');
  if (!nav) return null;

  const navItems = Array.from(nav.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible);
  const curIdx = navItems.indexOf(current);

  if (dir === "ArrowDown") {
    if (curIdx >= 0 && curIdx < navItems.length - 1) {
      return navItems[curIdx + 1];
    }
    return null;
  }

  if (dir === "ArrowUp") {
    if (curIdx > 0) {
      return navItems[curIdx - 1];
    }
    return null;
  }

  if (dir === "ArrowLeft") {
    return null;
  }

  if (dir === "ArrowRight") {
    // Salir del menú lateral hacia el contenido principal
    const mainCandidates = candidates.filter((c) => c.closest("main"));
    if (mainCandidates.length === 0) return null;

    // Prioridad 1: Botón Hero si está en pantalla
    const heroBtn = document.getElementById("hero-play-btn");
    if (heroBtn && isVisible(heroBtn)) {
      const hbRect = heroBtn.getBoundingClientRect();
      if (hbRect.top >= 0 && hbRect.top < window.innerHeight) {
        return heroBtn;
      }
    }

    // Prioridad 2: Elemento en main alineado verticalmente con la posición actual
    const curRect = current.getBoundingClientRect();
    let best: HTMLElement | null = null;
    let minDiff = Infinity;

    for (const cand of mainCandidates) {
      const cr = cand.getBoundingClientRect();
      if (cr.bottom > 60 && cr.top < window.innerHeight) {
        const diff = Math.abs(cr.top - curRect.top);
        if (diff < minDiff) {
          minDiff = diff;
          best = cand;
        }
      }
    }

    return best || mainCandidates[0];
  }

  return null;
}

// 2. Navegación en un carril horizontal (.rail)
function navigateFromRail(current: HTMLElement, dir: Direction, rail: HTMLElement, candidates: HTMLElement[]): HTMLElement | null {
  const railItems = Array.from(rail.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible);
  const curIdx = railItems.indexOf(current);

  if (dir === "ArrowRight") {
    if (curIdx >= 0 && curIdx < railItems.length - 1) {
      return railItems[curIdx + 1];
    }
    return null; // Fin del carril alcanzado
  }

  if (dir === "ArrowLeft") {
    if (curIdx > 0) {
      return railItems[curIdx - 1];
    }
    // curIdx === 0: Inicio del carril -> Transición fluida a SideNav
    const nav = document.querySelector<HTMLElement>('nav[aria-label="Principal"]');
    if (nav) {
      const navItems = Array.from(nav.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible);
      const currentActive = navItems.find((n) => n.getAttribute("aria-current") === "page");
      if (currentActive) return currentActive;
      const curRect = current.getBoundingClientRect();
      let closestNav = navItems[0];
      let minNavDiff = Infinity;
      for (const n of navItems) {
        const nr = n.getBoundingClientRect();
        const diff = Math.abs(nr.top - curRect.top);
        if (diff < minNavDiff) {
          minNavDiff = diff;
          closestNav = n;
        }
      }
      return closestNav || null;
    }
    return null;
  }

  const curRect = current.getBoundingClientRect();
  const curCenterX = curRect.left + curRect.width / 2;
  const curCenterY = curRect.top + curRect.height / 2;

  if (dir === "ArrowDown") {
    // Buscar el carril o sección debajo
    const mainCandidates = candidates.filter((c) => !rail.contains(c) && c.closest("main"));
    const below = mainCandidates.filter((c) => {
      const cr = c.getBoundingClientRect();
      return cr.top >= curRect.bottom - 10 && (cr.top + cr.height / 2) > curCenterY + 20;
    });

    if (below.length === 0) return null;

    let minTop = Infinity;
    for (const c of below) {
      const cr = c.getBoundingClientRect();
      if (cr.top < minTop) minTop = cr.top;
    }

    const nextRow = below.filter((c) => Math.abs(c.getBoundingClientRect().top - minTop) < 70);

    let bestCandidate = nextRow[0];
    let minXDiff = Infinity;
    for (const c of nextRow) {
      const cr = c.getBoundingClientRect();
      const candCenterX = cr.left + cr.width / 2;
      const diff = Math.abs(candCenterX - curCenterX);
      if (diff < minXDiff) {
        minXDiff = diff;
        bestCandidate = c;
      }
    }
    return bestCandidate;
  }

  if (dir === "ArrowUp") {
    const mainCandidates = candidates.filter((c) => !rail.contains(c) && c.closest("main"));
    const above = mainCandidates.filter((c) => {
      const cr = c.getBoundingClientRect();
      return cr.bottom <= curRect.top + 10 && (cr.top + cr.height / 2) < curCenterY - 20;
    });

    if (above.length === 0) {
      const heroBtn = document.getElementById("hero-play-btn");
      if (heroBtn && isVisible(heroBtn) && !rail.contains(heroBtn)) {
        return heroBtn;
      }
      return null;
    }

    let maxBottom = -Infinity;
    for (const c of above) {
      const cr = c.getBoundingClientRect();
      if (cr.bottom > maxBottom) maxBottom = cr.bottom;
    }

    const prevRow = above.filter((c) => Math.abs(c.getBoundingClientRect().bottom - maxBottom) < 70);

    let bestCandidate = prevRow[0];
    let minXDiff = Infinity;
    for (const c of prevRow) {
      const cr = c.getBoundingClientRect();
      const candCenterX = cr.left + cr.width / 2;
      const diff = Math.abs(candCenterX - curCenterX);
      if (diff < minXDiff) {
        minXDiff = diff;
        bestCandidate = c;
      }
    }
    return bestCandidate;
  }

  return null;
}

// 3. Algoritmo Espacial Proyectivo General (para cuadrículas .grid, páginas de detalle, búsqueda y hero)
function navigateGenericSpatial(current: HTMLElement, dir: Direction, candidates: HTMLElement[]): HTMLElement | null {
  const curRect = current.getBoundingClientRect();
  const curX = curRect.left + curRect.width / 2;
  const curY = curRect.top + curRect.height / 2;

  let best: HTMLElement | null = null;
  let bestScore = Infinity;

  // Si estamos en un elemento a la izquierda del contenido y vamos hacia la izquierda: pasar a SideNav
  if (dir === "ArrowLeft") {
    let hasLeftNeighbor = false;
    for (const cand of candidates) {
      if (cand === current || !cand.closest("main")) continue;
      const r = cand.getBoundingClientRect();
      if (r.right <= curRect.left + 5 && Math.abs(r.top - curRect.top) < 60) {
        hasLeftNeighbor = true;
        break;
      }
    }
    if (!hasLeftNeighbor && curRect.left < 280) {
      const nav = document.querySelector<HTMLElement>('nav[aria-label="Principal"]');
      if (nav) {
        const navItems = Array.from(nav.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible);
        const currentActive = navItems.find((n) => n.getAttribute("aria-current") === "page");
        if (currentActive) return currentActive;
        return navItems[0] || null;
      }
    }
  }

  for (const cand of candidates) {
    if (cand === current || cand.contains(current) || current.contains(cand)) continue;
    const r = cand.getBoundingClientRect();
    const candX = r.left + r.width / 2;
    const candY = r.top + r.height / 2;

    let dPrimary = 0;
    let dSecondary = 0;

    if (dir === "ArrowRight") {
      if (r.left >= curRect.left + 2 && candX > curX + 2) {
        dPrimary = candX - curX;
        dSecondary = Math.abs(candY - curY);
        const score = dPrimary + dSecondary * 3.5;
        if (score < bestScore) {
          bestScore = score;
          best = cand;
        }
      }
    } else if (dir === "ArrowLeft") {
      if (r.right <= curRect.right - 2 && candX < curX - 2) {
        dPrimary = curX - candX;
        dSecondary = Math.abs(candY - curY);
        const score = dPrimary + dSecondary * 3.5;
        if (score < bestScore) {
          bestScore = score;
          best = cand;
        }
      }
    } else if (dir === "ArrowDown") {
      if (r.top >= curRect.top + 2 && candY > curY + 2) {
        dPrimary = candY - curY;
        dSecondary = Math.abs(candX - curX);
        const score = dPrimary + dSecondary * 1.8;
        if (score < bestScore) {
          bestScore = score;
          best = cand;
        }
      }
    } else if (dir === "ArrowUp") {
      if (r.bottom <= curRect.bottom - 2 && candY < curY - 2) {
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

  // Fallbacks seguros de límites
  if (!best) {
    if (dir === "ArrowLeft" && !current.closest('nav[aria-label="Principal"]')) {
      const nav = document.querySelector<HTMLElement>('nav[aria-label="Principal"]');
      if (nav) {
        const navItems = Array.from(nav.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible);
        return navItems.find((n) => n.getAttribute("aria-current") === "page") || navItems[0] || null;
      }
    } else if (dir === "ArrowRight" && current.closest('nav[aria-label="Principal"]')) {
      const mainEls = candidates.filter((el) => el.closest("main"));
      return mainEls[0] || null;
    }
  }

  return best;
}

// Orquestador del siguiente foco espacial
function findNextTarget(current: HTMLElement, dir: Direction, candidates: HTMLElement[]): HTMLElement | null {
  if (current.closest('nav[aria-label="Principal"]')) {
    return navigateFromSideNav(current, dir, candidates);
  }

  const rail = current.closest(".rail") as HTMLElement | null;
  if (rail) {
    const railTarget = navigateFromRail(current, dir, rail, candidates);
    if (railTarget) return railTarget;
  }

  return navigateGenericSpatial(current, dir, candidates);
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

      // Botón D-Pad Center / OK (Android keycode 23, Enter 13 o 66)
      if (k === 23 || k === 13 || k === 66 || e.key === "Enter") {
        const ae = (document.querySelector(".tv-focused") || document.activeElement) as HTMLElement | null;
        if (ae && ae !== document.body) {
          // Si es un enlace o botón, ejecutar clic
          ae.click();
          e.preventDefault();
          return;
        }
      }

      // Flechas de navegación espacial (ArrowUp, ArrowDown, ArrowLeft, ArrowRight o keycodes 19, 20, 21, 22)
      let dir: Direction | null = null;
      if (e.key === "ArrowUp" || k === 19 || k === 38) dir = "ArrowUp";
      else if (e.key === "ArrowDown" || k === 20 || k === 40) dir = "ArrowDown";
      else if (e.key === "ArrowLeft" || k === 21 || k === 37) dir = "ArrowLeft";
      else if (e.key === "ArrowRight" || k === 22 || k === 39) dir = "ArrowRight";

      if (!dir) return;

      const candidates = getFocusableElements();
      if (candidates.length === 0) return;

      let ae = (document.querySelector(".tv-focused") || document.activeElement) as HTMLElement | null;

      // Si no hay elemento enfocado, o el foco está en el body, enfocar el primer elemento relevante
      if (!ae || ae === document.body || !candidates.includes(ae)) {
        const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
        const heroBtn = document.getElementById("hero-play-btn");
        const first = dialog
          ? candidates.find((el) => dialog.contains(el))
          : (heroBtn && isVisible(heroBtn) ? heroBtn : candidates.find((el) => el.closest("main")) || candidates[0]);
        if (first) {
          e.preventDefault();
          setVisualFocus(first);
        }
        return;
      }

      // Si el elemento activo es un input y se presiona izquierda o derecha dentro del texto, permitir edición
      if (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA") {
        const input = ae as HTMLInputElement;
        if (dir === "ArrowLeft" && input.selectionStart !== null && input.selectionStart > 0) {
          return;
        }
        if (dir === "ArrowRight" && input.selectionEnd !== null && input.selectionEnd < (input.value?.length || 0)) {
          return;
        }
      }

      // Si el foco está en el reproductor nativo, permitir que izquierda/derecha hagan seek sin perder foco
      if (ae.id === "tv-native-player" || ae.closest("#tv-native-player")) {
        if (dir === "ArrowLeft" || dir === "ArrowRight") {
          return;
        }
      }

      const target = findNextTarget(ae, dir, candidates);
      if (target) {
        e.preventDefault();
        setVisualFocus(target);
      }
    };

    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || el === document.body) return;

      // Si el elemento enfocado está en SideNav, NO guardarlo como el destino de foco de la ruta
      if (el.closest('nav[aria-label="Principal"]')) {
        return;
      }

      document.querySelectorAll(".tv-focused, [data-tv-focused='true']").forEach((node) => {
        if (node !== el) {
          node.classList.remove("tv-focused");
          node.removeAttribute("data-tv-focused");
        }
      });
      el.classList.add("tv-focused");
      el.setAttribute("data-tv-focused", "true");

      try {
        const key = "tvfocus:" + pathname;
        const id = el.id || el.getAttribute("href") || el.textContent?.slice(0, 40);
        if (id) sessionStorage.setItem(key, id);
      } catch {}
    };

    // Al mover el ratón por el contenido principal, retirar cualquier foco TV residual en SideNav
    const onPointerMove = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest('nav[aria-label="Principal"]')) {
        const sideNav = document.querySelector('nav[aria-label="Principal"]');
        if (sideNav) {
          sideNav.querySelectorAll(".tv-focused, [data-tv-focused='true']").forEach((node) => {
            node.classList.remove("tv-focused");
            node.removeAttribute("data-tv-focused");
          });
        }
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocusIn);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [pathname, router]);

  // Al cambiar de ruta o cargar la página: enfocar primer elemento relevante o restaurar sesión
  useEffect(() => {
    // 1. Limpiar SIEMPRE cualquier clase o indicador .tv-focused que haya quedado en SideNav
    const sideNav = document.querySelector('nav[aria-label="Principal"]');
    if (sideNav) {
      sideNav.querySelectorAll(".tv-focused, [data-tv-focused='true']").forEach((node) => {
        node.classList.remove("tv-focused");
        node.removeAttribute("data-tv-focused");
      });
      if (document.activeElement && sideNav.contains(document.activeElement)) {
        (document.activeElement as HTMLElement).blur();
      }
    }

    const timer = setTimeout(() => {
      let id: string | null = null;
      try { id = sessionStorage.getItem("tvfocus:" + pathname); } catch {}
      let el: HTMLElement | null = null;
      // NUNCA restaurar foco a un elemento de SideNav
      if (id && !id.startsWith("nav-")) {
        el = document.getElementById(id) ||
          (document.querySelector(`[href="${CSS.escape(id)}"]`) as HTMLElement | null);
        if (el && (!isVisible(el) || el.closest('nav[aria-label="Principal"]'))) el = null;
      }
      if (!el) {
        // En página de reproducción, priorizar el reproductor nativo o botón fullscreen
        if (pathname.startsWith("/watch")) {
          el = document.getElementById("tv-native-player") ||
               document.getElementById("btn-fullscreen") ||
               document.getElementById("tv-player-frame") ||
               null;
        }
        if (!el) {
          const heroBtn = document.getElementById("hero-play-btn");
          if (heroBtn && isVisible(heroBtn)) {
            el = heroBtn;
          } else {
            const candidates = getFocusableElements();
            // Buscar elemento enfocado exclusivamente dentro de <main>
            el = candidates.find((x) => x.closest("main")) || candidates[0] || null;
          }
        }
      }
      if (el) {
        setVisualFocus(el);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
