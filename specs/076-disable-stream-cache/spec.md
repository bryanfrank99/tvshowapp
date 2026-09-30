# Spec 076: Desactivar la Caché de Streams (`stream_cache`)

## 1. Contexto y Justificación
El usuario solicitó explícitamente desactivar la `stream_cache`.
Al desactivar la caché de streams:
- Se fuerza la extracción fresca/en vivo en cada solicitud para todos los servidores directos (Cinecalidad S19, NasriPlay S17, WatchPlay S18, MegaEmbed S14).
- Se evita el uso de URLs cacheadas que pudieran haber expirado o contener tokens obsoletos en la base de datos Supabase o en memoria.
- Se previene la inserción o persistencia de nuevos registros en la tabla `stream_cache` y en las claves de respaldo en la tabla `config`.

## 2. Modificaciones Realizadas
1. **Control Maestro en `lib/stream-cache.ts`**:
   - Se introdujo `STREAM_CACHE_ENABLED = process.env.ENABLE_STREAM_CACHE === "true"` (con valor por defecto `false`).
   - `getCachedStream()` retorna inmediatamente `null` sin consultar la memoria ni la tabla `stream_cache` de Supabase.
   - `setCachedStream()` retorna inmediatamente `false` sin realizar escrituras ni almacenar streams.
   - Función auxiliar `purgeAllStreamCache()` para purgar registros existentes.

2. **Purga Completa de Datos Previos**:
   - Se eliminaron todos los registros de la tabla `stream_cache` en Supabase.
   - Se eliminaron las claves temporales `stream:*` en la tabla `config`.

3. **Ajustes en Endpoints y Tests**:
   - `app/api/resolve/cache-stream/route.ts`: Notifica adecuadamente si el guardado en caché está desactivado.
   - `scripts/test-nasriplay-hls.mjs` y `scripts/test-cinecalidad-hls.mjs`: Validan que `stream_cache` responde como desactivada.
