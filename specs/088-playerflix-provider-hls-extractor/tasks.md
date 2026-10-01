# Tasks: Proveedor PlayerFlix con Extractor HLS Multi-Opción

- [x] 1. Crear `lib/playerflix.ts` con llamada a `/inc/Ajax.php` y extractores HLS para WatchPlay y EmbedPlayer → verificar: script node de prueba
- [x] 2. Crear `app/api/playerflix/route.ts` con manejo de caché Supabase (`stream_cache`) → verificar: GET `/api/playerflix?id=969681&type=movie`
- [x] 3. Actualizar `lib/providers.ts` con defaults lingüísticos de `playerflix` → verificar: compilación typescript
- [x] 4. Integrar resolución de `playerflix` en `app/api/resolve/route.ts` → verificar: GET `/api/resolve` con proveedor playerflix
- [x] 5. Integrar soporte en `app/watch/page.tsx` para sincronización y reemplazo de fuente a HLS nativo → verificar: tipos en watch/page
- [x] 6. Crear migración SQL `supabase/migration_add_playerflix_provider.sql` → verificar: sintaxis SQL válida
- [x] 7. Crear `scripts/test-playerflix-extractor.mjs` y validar ejecución → verificar: tests pasan 100%
- [x] 8. Ejecutar `npm run build` → verificar: 0 errores de compilación
