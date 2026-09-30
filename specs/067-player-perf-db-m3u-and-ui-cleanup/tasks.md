# Tasks: Spec 067 - Optimización de Servidores, Caché M3U en BD, Ocultamiento de Servidor HLS y Limpieza UI

- [x] Task 1: Crear módulo `lib/stream-cache.ts` y script SQL de migración `supabase/migration_stream_cache.sql` para persistencia de streams en base de datos.
- [x] Task 2: Crear endpoint `app/api/resolve/cache-stream/route.ts` y optimizar `app/api/resolve/route.ts` con paralelización y lectura de caché BD.
- [x] Task 3: Ocultar el servidor HLS duplicado de la lista de servidores en `SourceSelectorGrid.tsx` y `app/watch/page.tsx`.
- [x] Task 4: Eliminar botones externos de "Tela cheia" y "Trocar servidor" en `app/watch/page.tsx`.
- [x] Task 5: Eliminar caja negra OSD de "Pausa" en `NativeSourcePlayer.tsx` y perfeccionar el pulso circular translúcido `centerPulse`.
- [x] Task 6: Crear y ejecutar suite de validación `scripts/test-stream-cache-and-ui-cleanup.mjs`.
- [x] Task 7: Ejecutar `npm run build` para verificar compilación sin errores.
