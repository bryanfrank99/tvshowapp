# Tasks: Spec 068 - Extractor Nativo HLS para WatchPlay (S18)

- [x] Task 1: Crear módulo extractor `lib/watchplay.ts` con soporte para extracción de streams HLS fMP4.
- [x] Task 2: Crear endpoint API `app/api/watchplay/route.ts` con soporte para redirección y caché en BD.
- [x] Task 3: Integrar `watchplay` en `app/api/resolve/route.ts` con consulta de caché y timeout controlado.
- [x] Task 4: Integrar extracción client-side en `app/watch/page.tsx` para actualización en-sitio y persistencia a BD.
- [x] Task 5: Crear migración `supabase/migration_add_watchplay_provider.sql` y actualizar `supabase/seed.sql` con el proveedor S18.
- [x] Task 6: Crear y ejecutar suite de pruebas automatizadas `scripts/test-watchplay-extractor.mjs`.
- [x] Task 7: Ejecutar `npm run build` para asegurar compilación limpia sin errores de tipos.
