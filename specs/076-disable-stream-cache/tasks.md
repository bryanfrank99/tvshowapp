# Tasks: Spec 076 - Desactivar stream_cache

- [x] **Tarea 1: Desactivación en el Módulo Central `lib/stream-cache.ts`**
  - [x] Agregar `STREAM_CACHE_ENABLED = process.env.ENABLE_STREAM_CACHE === "true"` (default `false`).
  - [x] Bypasear `getCachedStream` para retornar `null` inmediatamente.
  - [x] Bypasear `setCachedStream` para retornar `false` inmediatamente sin escribir en BD ni memoria.
  - [x] Implementar `purgeAllStreamCache()`.

- [x] **Tarea 2: Limpieza de Base de Datos Supabase**
  - [x] Purgar todos los registros existentes en la tabla `stream_cache`.
  - [x] Purgar claves residuales `stream:*` en la tabla `config`.

- [x] **Tarea 3: Verificación y Pruebas**
  - [x] Actualizar y ejecutar `scripts/test-nasriplay-hls.mjs` (10/10 PASS).
  - [x] Actualizar y ejecutar `scripts/test-cinecalidad-hls.mjs` (10/10 PASS).
  - [x] Ejecutar `npx tsc --noEmit` (0 errores).
