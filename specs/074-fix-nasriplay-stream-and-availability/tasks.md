# Tasks: Spec 074 - Corrección de Extracción, Validación y Disponibilidad de S17 (NasriPlay)

- [x] **Tarea 1: Purgar registros envenenados de caché en Supabase DB**
  - [x] Eliminar de `stream_cache` cualquier registro de `nasriplay` con URLs 404 o `futurespacetravel.space`.

- [x] **Tarea 2: Validación HTTP de Streams en `lib/nasriplay.ts`**
  - [x] Añadir función de comprobación rápida `isLivePlayableStream(url)` con timeout de 1600ms.
  - [x] Descartar inmediatamente streams que devuelvan 404, 403 o no pasen comprobación.
  - [x] Priorizar streams con CORS `*` universal (ej. Uqload, Zilla-Networks, Vimeos con token de extensión directa).
  - [x] Retornar `{ success: false }` si ningún stream pasa la validación en vivo.

- [x] **Tarea 3: Garantizar Disponibilidad de S17 en `app/api/resolve/route.ts`**
  - [x] Si la extracción HLS de NasriPlay no devuelve un stream validado y vivo, emitir S17 como servidor iframe sin demora.
  - [x] Incluso si HLS está activo, conservar la opción de iframe de S17 como opción secundaria con `providerName: "S17"`, `realName: "NasriPlay"`, `ord: 17`, evitando que S17 desaparezca de la vista.

- [x] **Tarea 4: Soporte en `app/watch/page.tsx`**
  - [x] Añadir fallback de extracción client-side para `nasriplay` en `app/watch/page.tsx` idéntico a MegaEmbed y WatchPlay.

- [x] **Tarea 5: Pruebas y Validación**
  - [x] Probar resolución de película `1084244` y verificar que S17 aparece y reproduce correctamente.
  - [x] Ejecutar suite completa `scripts/test-nasriplay-hls.mjs`.
  - [x] Ejecutar `npx tsc --noEmit`.
