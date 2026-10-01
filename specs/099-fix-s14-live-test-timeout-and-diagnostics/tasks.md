# Tareas de Implementación: Especificación 099

- [x] 1. Ajustes en `lib/hls-engine.ts` y `app/api/resolve/route.ts`
  - [x] 1.1 Incrementar `timeout_ms` a 25000 y headers en `EXTRACTOR_PRESETS.megaembed`.
  - [x] 1.2 Aumentar timeout de carrera en `app/api/resolve/route.ts` a 25000ms.
- [x] 2. Correcciones en Panel Admin y API de Providers
  - [x] 2.1 En `app/api/admin/providers/route.ts`, soportar `movie_api_url` y `tv_api_url`.
  - [x] 2.2 En `app/admin/page.tsx`, preservar `data.result` y stepTraces en caso de fallo.
- [x] 3. Persistencia en Supabase
  - [x] 3.1 Actualizar `supabase/seed.sql`.
  - [x] 3.2 Actualizar `config.provider_extractor_configs` en Supabase.
- [x] 4. Pruebas y Verificación
  - [x] 4.1 Probar test en vivo con `test-admin-test-extractor.mjs`.
  - [x] 4.2 Ejecutar `npm run build` y certificar 0 errores.
