# Plan de Implementación: Spec 092 - Activar WatchPlay en S20 y Solo Servidores HLS

## 1. Modificación de `lib/playerflix.ts`
- Reactivar el extractor `extractFromWatchPlay` para URLs que incluyan `watchplay.shop`, devolviendo el stream con `type: "hls"`, `id: "watchplay"`, `label: "WatchPlay"`.
- En `extractFromEmbedPlayer`, mantener la extracción HLS enrutada por `/api/playerflix/proxy` con `type: "hls"`, `id: "embedplayer"`, `label: "VIP Player"`.
- Omitir completamente la generación de `embedplayer-iframe`, `Embed Play` y `Premium` (descartar cualquier opción con `type: "iframe"`).
- Garantizar que `streams` en `PlayerFlixResult` contenga únicamente elementos con `type: "hls"`.

## 2. Ajuste en `app/api/resolve/route.ts`
- En el bloque de resolución de PlayerFlix:
  - Garantizar que solo se agreguen fuentes secundarias si `sec.type === "hls"`.
  - Si un título no tiene streams HLS disponibles, retornar `provSources` vacío `[]` inmediatamente, impidiendo la caída en `providersToSources` que crearía una fuente iframe a `playerflix.ink`.

## 3. Ajuste en `app/watch/page.tsx`
- En la tarea de extracción en background de PlayerFlix, verificar que solo se incorporen fuentes HLS si `streamResult.hlsUrl` es válido.

## 4. Pruebas y Validación
- Actualizar `scripts/test-playerflix-extractor.mjs`:
  - Verificar que WatchPlay HLS esté presente y activo.
  - Verificar que VIP Player HLS esté presente y activo.
  - Verificar que **0** streams sean de tipo iframe en los resultados de S20.
- Ejecutar suite de pruebas y `npm run build`.
