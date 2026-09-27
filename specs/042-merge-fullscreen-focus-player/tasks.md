# Tasks: Fusión de "Enfocar Reproductor" en "Pantalla Completa"

- [x] 1. Actualizar `goFullscreen` en `app/watch/page.tsx` para integrar el sistema avanzado de `__enterPlayerMode()`, foco en iframe y bloqueo de mando.
- [x] 2. Eliminar el botón redundante `btn-focus-player` del JSX en `app/watch/page.tsx`.
- [x] 3. Asegurar que `exitPlayerMode` en `components/player/IframeSourcePlayer.tsx` retorne el foco a `btn-fullscreen`.
- [x] 4. Crear y ejecutar `scripts/test-merge-fullscreen-focus.mjs` y actualizar `scripts/test-player-trap.mjs`.
- [x] 5. Ejecutar `npm run build` para asegurar compilación limpia sin errores.


