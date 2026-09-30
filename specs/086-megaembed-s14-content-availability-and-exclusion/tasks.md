# Tasks: Spec 086 - MegaEmbed S14 Content Availability and Exclusion

- [x] Task 1: Robustecer `lib/megaembed.ts` con verificación de streams y normalización de URLs <!-- id: 1 -->
  - Implementar normalización de URLs relativas (reemplazo de `/../cache/` por `/cache/`).
  - Implementar función de verificación rápida de stream (`verifyStreamUrl`) con timeout de 1800ms.
  - Descartar streams con HTTP 403, 404, 5xx, o cuerpos que indiquen `"Assinatura inválida"` o falta de `#EXTM3U`.
  - Asegurar que `fetchMegaEmbedStream` solo retorne `success: true` cuando exista al menos un stream reproducible verificado.

- [x] Task 2: Modificar `app/api/resolve/route.ts` para exclusión total cuando S14 no tiene contenido <!-- id: 2 -->
  - Si `prov.id === "megaembed"` y `!directHlsUrl`: retornar `provSources` vacío inmediatamente, sin hacer fallback a iframe.
  - Asegurar que ni `HLS - S14` ni `S14` se agreguen a la lista de fuentes si no hay contenido válido.

- [x] Task 3: Purgar servidores sin contenido en `app/watch/page.tsx` <!-- id: 3 -->
  - Si un candidato a extracción (como `megaItem`) falla en la extracción (`!streamResult?.hlsUrl`), purgar la fuente de `sources` para que no quede ningún iframe muerto visible.

- [x] Task 4: Actualizar configuración en Supabase y `supabase/seed.sql` <!-- id: 4 -->
  - Limpiar `movie_list_url` y `tv_list_url` muertos de `megaembed` para evitar falsos timeouts en `isRedeflixAvailable`.

- [x] Task 5: Crear script de verificación y ejecutar validaciones <!-- id: 5 -->
  - Probar `/api/resolve` para títulos donde MegaEmbed no tiene contenido o tiene enlaces corruptos (ej. 1022789, 533535, 550) y verificar que S14 NO aparece.
  - Probar títulos con contenido válido y verificar que el stream retornado es funcional.
  - Ejecutar `npx tsc --noEmit`.

- [x] Task 6: Commit y Push con mensaje descriptivo y bump de versión <!-- id: 6 -->
