# Tareas: Spec 091 - Corregir Reproducción HLS de S20 (PlayerFlix)

- [x] **Tarea 1: Actualizar `app/api/playerflix/proxy/route.ts`**
  - [x] Ampliar dominios autorizados para permitir CDNs dinámicos de PlayerFlix/EmbedPlayer (`*.xyz`, `playerflix.ink`, `hclod.qzz.io`, `*.watchplay.shop`, `*.top`, etc.) con protección anti-SSRF para rangos privados.
  - [x] Soportar cabeceras `Range` hacia upstream y retornar `206 Partial Content` con `Content-Range`.
  - [x] Reescribir URIs en etiquetas `#EXT-X-KEY`, `#EXT-X-MAP` y listas relativas en manifiestos M3U8.
  - [x] Añadir cabeceras CORS completas (`Access-Control-Expose-Headers`).

- [x] **Tarea 2: Ajustar identificación de fuentes en `lib/playerflix.ts` y `app/api/resolve/route.ts`**
  - [x] En `lib/playerflix.ts`, asegurar que cada opción devuelta tenga identificadores estables (`embedplayer`, `embedplayer-iframe`, `playerflix-iframe-X`).
  - [x] En `app/api/resolve/route.ts`, asignar IDs identificables (`playerflix-iframe-X`) y prioridades correctas para que convivan la fuente HLS directa y las opciones iframe secundarias.

- [x] **Tarea 3: Corregir preservación de alternativas en `app/watch/page.tsx`**
  - [x] En `mergeExtractedStreams`, evitar que se descarten las fuentes alternativas de PlayerFlix de tipo `iframe` o `alt`.

- [x] **Tarea 4: Suite de pruebas y validación de compilación**
  - [x] Extender `scripts/test-playerflix-extractor.mjs` para verificar la descarga de segmentos reales con CDNs `eloialu*.xyz`.
  - [x] Ejecutar la suite de pruebas y validar 100% de éxito (6/6 superadas).
  - [x] Ejecutar `npm run build` y certificar 0 errores.
