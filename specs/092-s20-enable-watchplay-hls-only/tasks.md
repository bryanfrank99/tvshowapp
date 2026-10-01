# Tareas: Spec 092 - Activar WatchPlay en S20 y Solo Servidores HLS

- [x] **Tarea 1: Modificar `lib/playerflix.ts`**
  - [x] Reactivar procesamiento de `watchplay.shop` mediante `extractFromWatchPlay`.
  - [x] Retirar la generación de opciones iframe (`embedplayer-iframe`, `playerflix-iframe-X`, `Embed Play`, `Premium`).
  - [x] Asegurar que `streams` contenga única y exclusivamente streams con `type: "hls"`.

- [x] **Tarea 2: Ajustar `app/api/resolve/route.ts`**
  - [x] Filtrar secundarias para incluir estrictamente `sec.type === "hls"`.
  - [x] Retornar array vacío si no hay fuentes HLS para evitar generación de iframe genérico de PlayerFlix.

- [x] **Tarea 3: Suite de pruebas y validación**
  - [x] Actualizar `scripts/test-playerflix-extractor.mjs` para validar WatchPlay activo y 0 iframes en S20.
  - [x] Ejecutar la suite de pruebas y verificar 100% aprobado (6/6 pruebas pasadas).
  - [x] Ejecutar `npm run build` y certificar 0 errores.
