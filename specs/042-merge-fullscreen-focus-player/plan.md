# Implementation Plan: Fusión de "Enfocar Reproductor" en "Pantalla Completa"

## Changes to Implement

### 1. `app/watch/page.tsx`
- Modificar la función `goFullscreen` para invocar el sistema completo de `__enterPlayerMode`:
  ```tsx
  const goFullscreen = () => {
    if (typeof (window as any).__enterPlayerMode === "function") {
      (window as any).__enterPlayerMode();
    } else {
      const container = (document.querySelector<HTMLElement>("#tv-iframe-container, #tv-native-player, #tv-player-frame") || frameBox.current) as any;
      if (container) {
        container.focus();
        if (container.requestFullscreen) container.requestFullscreen().catch(() => {});
        else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
      }
    }
  };
  ```
- Eliminar el botón `id="btn-focus-player"` del JSX.
- Mantener y realzar el botón `id="btn-fullscreen"` como el botón principal de acción cinemática.

### 2. `components/player/IframeSourcePlayer.tsx`
- En `exitPlayerMode`, asegurar que el foco retorne primariamente a `btn-fullscreen`:
  ```ts
  const btn = document.getElementById("btn-fullscreen") || document.getElementById("btn-focus-player");
  ```

### 3. Tests & Regression
- Actualizar `scripts/test-player-trap.mjs` para validar que `btn-fullscreen` es el botón objetivo.
- Crear `scripts/test-merge-fullscreen-focus.mjs` para verificar la fusión limpia.
- Compilar con `npm run build`.
- Commitear y pushear.
