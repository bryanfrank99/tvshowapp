# Plan de Implementación: Especificación 095

## Fases de Ejecución

### Fase 1: Actualización de la Base de Datos Supabase
1. Conectar a Supabase mediante service role.
2. Actualizar el registro `id: 'nasriplay'`:
   - `movie_tpl: 'https://nsrplay.space/embed/movie/{id}'`
   - `tv_tpl: 'https://nsrplay.space/embed/tv/{id}/{s}/{e}'`
   - `name: 'S17 (NasriPlay)'`
   - Asegurar `active: true`, `ord: 17`, `lang: 'es,lat'`.
3. Actualizar `supabase/seed.sql` línea 18 para reflejar estos cambios.

### Fase 2: Optimización del Extractor NasriPlay (`lib/nasriplay.ts`)
1. **Refactorización de Resolución HLS:**
   - Detectar `srv.playUrl` si contiene `stream-proxy` como candidato directo de stream HLS.
   - Detectar `srv.directUrl` si contiene `.m3u8` como candidato.
   - Iterar sobre todos los servidores con `token` y `directResolveEligible: true` para invocar `/api/v1/embed/resolve` en paralelo con timeout de 2000ms.
   - Pasar los candidatos por `isLivePlayableStream` con verificación HEAD/GET con rango bytes.
   - Extraer `primaryHlsUrl` y el resto como `backupHlsUrls`.
2. **Refactorización de Embeds Iframe:**
   - Para cada servidor con `token`, invocar `/api/v1/embed/server-url?token=...` en paralelo con timeout.
   - Asignar la URL web real devuelta a `opt.url`.
   - Asignar el nombre legible de host mediante `detectNasriPlayHost`.

### Fase 3: Pruebas y Validación
1. Crear `scripts/test-s17-multi-mirror.mjs`.
2. Verificar película 550 (Fight Club): comprobar múltiples HLS en `backupHlsUrls` y múltiples mirrors en `embedOptions`.
3. Verificar serie 1399 (Game of Thrones): comprobar HLS y mirrors.
4. Ejecutar `npm run build` para asegurar compilación limpia.
