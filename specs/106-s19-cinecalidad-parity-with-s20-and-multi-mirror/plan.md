# Plan de Implementación: Spec 106 - Paridad de S19 (Cinecalidad) con S20

## Fase 1: Pipeline y Motor de Extracción Declarativo (`lib/hls-engine.ts`)
1. Implementar la acción de pipeline `cinecalidad_resolve_embeds`:
   - Entrada: array `embeds` recibido de `https://tmdb.allcalidad.re/v1/playback/movie/{id}` o `tvshow/{id}`.
   - Normalización de opciones: transformar cada embed en una opción estructurada con `name`, `server`, `host`, `url`, `embed`, `label`, `quality`, `lang`, etc.
   - Extracción concurrente de stream HLS:
     - Localizar embeds de Vimeos (`vimeos.net` o similar).
     - Fetch a la URL del embed con cabecera `Referer: https://cinecalidad.am/`.
     - Desempaquetado del script Packer (`eval(function(p,a,c,k,e,d)...)`).
     - Extracción del enlace master `.m3u8` y pistas de subtítulos (`tracks`).
     - Si hay otros embeds con `.m3u8` directo, extraerlos como `backupHlsUrls`.
   - Salida del paso:
     ```json
     {
       "hlsUrl": "<primary_hls_url>",
       "backupHlsUrls": ["<backup_hls_1>"],
       "subtitles": [...],
       "embeds": [...] // Todos los mirrors originales preservados
     }
     ```
2. Actualizar el preset `vimeos_json` / `cinecalidad` en `EXTRACTOR_PRESETS`:
   - Paso 1: `http_request` a `https://tmdb.allcalidad.re/v1/playback/movie/{id}` (o serie).
   - Paso 2: `cinecalidad_resolve_embeds` con entrada `{{cinecalidad_playback.embeds}}`.
   - Output: `hlsUrl`, `backupHlsUrls`, `subtitles`, `embeds`.

## Fase 2: Configuración del Proveedor y Fallbacks (`app/api/resolve/route.ts`, `app/api/admin/providers/route.ts`)
1. En `app/api/resolve/route.ts`:
   - Configurar `cinecalidad` para tener modo por defecto `"both"` si no está definido en `provider_stream_modes`, idéntico a `playerflix`.
2. En `app/api/admin/providers/route.ts`:
   - Asignar modo por defecto `"both"` para `cinecalidad` y `playerflix`.
3. Actualizar `supabase/seed.sql` con las URLs originales directas y el pipeline actualizado de S19.

## Fase 3: Sincronización con Base de Datos Supabase
1. Ejecutar script de actualización en Supabase:
   - Modificar tabla `providers` para `cinecalidad`:
     `movie_tpl = 'https://tmdb.allcalidad.re/v1/playback/movie/{id}'`
     `tv_tpl = 'https://tmdb.allcalidad.re/v1/playback/tvshow/{id}?season={s}&episode={e}'`
   - Modificar tabla `config`:
     Actualizar `provider_extractor_configs.cinecalidad` con el pipeline unificado.
     Actualizar `provider_stream_modes.cinecalidad` a `"both"`.

## Fase 4: Pruebas y Certificación
1. Crear `scripts/test-s19-multi-mirror.mjs` y verificar que la resolución de películas y series devuelva:
   - Stream directo HLS funcional.
   - Pistas de subtítulos válidas.
   - Array `embeds` con todos los mirrors originales (mínimo 2 opciones).
2. Ejecutar `npm run build` y verificar 0 errores.
3. Commit y push a `main`.
