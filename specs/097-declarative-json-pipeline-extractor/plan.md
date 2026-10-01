# Plan de Implementación: Especificación 097

## Fase 1: Intérprete y Motor de Pipeline en `lib/hls-engine.ts`
1. Diseñar el evaluador de expresiones de contexto (`{{step_id.prop}}`, `{id}`, `{s}`, `{e}`, `{type}`).
2. Implementar los ejecutores de acciones:
   - `http_request`: Fetch con abort controller, reemplazo de variables y parsing JSON/Text.
   - `find_in_array`: Búsqueda de elementos según coincidencias (`url_contains`, `property_equals`, etc.).
   - `unpack_packer`: Implementación pura y segura del algoritmo de desempaquetado de Dean Edwards Packer `eval(p,a,c,k)` sin usar `eval()`.
   - `regex_extract`: Compilación y ejecución de regex con selección de grupo de captura.
   - `json_path`: Extracción segura por rutas de puntos (`a.b.0.c`).
   - `extract_subtitles_vimeos`: Parser de pistas de subtítulos dentro del código desofuscado.
3. Ensamblar la función `executePipeline(config, context)` con reporte de trazas paso a paso (`stepTraces`).
4. Conectar `runHlsExtractor` para que, si `config.mode === 'pipeline'` o `config.steps` existe, ejecute el pipeline nativo.

## Fase 2: Definición de Recetas de Pipeline (Presets)
1. Actualizar `EXTRACTOR_PRESETS.vimeos_json` con el pipeline completo de Cinecalidad que reemplaza a `lib/cinecalidad.ts`.
2. Actualizar `EXTRACTOR_PRESETS.nasriplay_token` con el pipeline de token chain y multi-mirror.
3. Actualizar `EXTRACTOR_PRESETS.playerflix`, `megaembed`, `watchplay`, `direct_m3u8` y `custom_api`.

## Fase 3: Migración de Base de Datos y Persistencia
1. Actualizar la clave `provider_extractor_configs` en Supabase con los nuevos pipelines declarativos.
2. Actualizar `supabase/seed.sql` y `supabase/migration_provider_extractor_config.sql`.

## Fase 4: Panel Administrativo (`app/admin/page.tsx`)
1. Mostrar la traza de pasos (`Paso 1: API HTTP 200`, `Paso 2: Host Vimeos encontrado`, etc.) en el resultado del Live Test.
2. Permitir editar y formatear el pipeline JSON con validación inmediata.

## Fase 5: Pruebas y Verificación
1. Actualizar `scripts/test-hls-engine.mjs` para verificar la ejecución del pipeline declarativo de Cinecalidad sin llamar a `lib/cinecalidad.ts`.
2. Ejecutar `npm run build` para garantizar cero errores.
