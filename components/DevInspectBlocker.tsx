"use client";
import { useEffect } from "react";

/**
 * Bloquea el menú contextual (clic derecho) y los atajos de teclado para
 * abrir herramientas de desarrollador (F12, DevTools, Inspeccionar, Ver Código Fuente)
 * únicamente en entornos de producción.
 */
export default function DevInspectBlocker() {
  useEffect(() => {
    // Solo activar en producción para permitir depuración libre en desarrollo local
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      const k = e.keyCode;
      const key = e.key ? e.key.toLowerCase() : "";

      // 1. F12 (DevTools)
      if (e.key === "F12" || k === 123) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 2. Ctrl + Shift + I / Cmd + Option/Shift + I (Inspeccionar Elemento)
      //    Ctrl + Shift + J / Cmd + Option/Shift + J (Consola)
      //    Ctrl + Shift + C / Cmd + Option/Shift + C (Selector de Elementos)
      if (isCmdOrCtrl && e.shiftKey && (key === "i" || key === "j" || key === "c" || k === 73 || k === 74 || k === 67)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 3. Ctrl + U / Cmd + U (Ver Código Fuente)
      if (isCmdOrCtrl && !e.shiftKey && (key === "u" || k === 85)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 4. Ctrl + S / Cmd + S (Guardar página completa)
      if (isCmdOrCtrl && !e.shiftKey && (key === "s" || k === 83)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    };

    window.addEventListener("contextmenu", onContextMenu, true);
    window.addEventListener("keydown", onKeyDown, true);

    return () => {
      window.removeEventListener("contextmenu", onContextMenu, true);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  return null;
}
