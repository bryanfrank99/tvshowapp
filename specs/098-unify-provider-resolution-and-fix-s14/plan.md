# Plan de Implementación: Especificación 098

## Fase 1: Reparación de S14 y Acción `megaembed_parse_sources` en `lib/hls-engine.ts`
1. Agregar acción `megaembed_parse_sources` al despachador `executeStep` en `lib/hls-engine.ts`:
   - Parsea el arreglo JSON capturado por regex.
   - Normaliza URLs relativas `/../cache/hls/` a host absoluto `https://mgeb.top`.
   - Separa y prioriza streams HLS `.m3u8` y streams MP4.
2. Definir el preset `EXTRACTOR_PRESETS.megaembed` con el pipeline declarativo de 3 pasos.
3. Actualizar `lib/megaembed.ts` aumentando el timeout a 12000ms y evitando descartar streams válidos.

## Fase 2: Unificación de `app/api/resolve/route.ts`
1. Reemplazar los 5 bloques hardcodeados (`cinecalidad`, `megaembed`, `watchplay`, `playerflix`, `nasriplay`) por un flujo único, homogéneo y elegante.
2. Enriquecer `fallbackExtractorConfigs` en `app/api/resolve/route.ts` con los presets de `EXTRACTOR_PRESETS` para garantizar paridad total incluso si la BD no tiene el JSON guardado.
3. Manejar de forma uniforme streams directos HLS, subtítulos (`subtitles`), y opciones de servidores (`embedOptions`).

## Fase 3: Sincronización de Base de Datos y Seed
1. Actualizar `supabase/seed.sql` con los pipelines JSON actualizados para S14, S17, S18, S19, S20.
2. Ejecutar script de actualización en Supabase para persistir los cambios inmediatamente.

## Fase 4: Pruebas y Validación
1. Probar extracción de S14 MegaEmbed para película (`550`) y serie (`1396`).
2. Ejecutar `scripts/test-hls-engine.mjs` para verificar todos los proveedores.
3. Probar `/api/resolve` simulando llamadas reales.
4. Compilar con `npm run build` para asegurar 0 errores de TypeScript y linting.
