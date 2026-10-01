# Plan de Implementación: Especificación 096

## Fases de Ejecución

### Fase 1: Motor Unificado de Extracción HLS (`lib/hls-engine.ts`)
1. Crear `lib/hls-engine.ts` exportando la interfaz `ExtractorConfig` y la función `runHlsExtractor`.
2. Implementar los manejadores de recetas/presets:
   - `direct_m3u8`: Valida e interpola la URL directamente.
   - `vimeos_json`: Consulta el endpoint API con cabeceras y extrae playlist HLS (.m3u8) de Vimeos (S19).
   - `nasriplay_token`: Extrae PAGE_TOKEN de iframe y resuelve fuentes HLS directas con auto-failover (S17).
   - `playerflix`: Resuelve streams directos fMP4/HLS (S20).
   - `megaembed` / `watchplay`: Resuelve streams fMP4 de S14 y S18.
   - `custom_api`: Consulta genérica con cabeceras personalizadas y regex / json_path.
3. Asegurar validación en vivo rápida con timeout no bloqueante.

### Fase 2: Endpoint y Migración de Base de Datos
1. Crear `supabase/migration_provider_extractor_config.sql`.
2. Actualizar `app/api/admin/providers/route.ts`:
   - En `GET`: Enriquecer con `extractor_config` desde `providers.extractor_config` o `config.provider_extractor_configs`.
   - En `PUT`: Persistir `extractor_config` y el switch global `allow_embed_fallback`.
3. Implementar acción `test_extractor` en `app/api/admin/providers/route.ts` para pruebas inmediatas en el admin.
4. Poblar la base de datos Supabase:
   - Desactivar proveedores de solo-embed (`embos`, `moviesapi`, `cinesrc`, etc.).
   - Asignar los JSON de configuración a los 5 proveedores HLS (`nasriplay`, `cinecalidad`, `playerflix`, `megaembed`, `EmbedMovies-V2`).

### Fase 3: Interfaz de Administración en `/admin`
1. Simplificar el modal/formulario de edición de proveedores:
   - Eliminar campos obsoletos de catálogo TXT/JSON.
   - Añadir selector de Preset de Extractor HLS (Cinecalidad, NasriPlay, PlayerFlix, Directo, Custom).
   - Añadir Editor de Configuración JSON con validación en tiempo real.
   - Añadir botón de "▶ Probar Extractor en Vivo" con selector de película/serie de prueba y visualizador de resultados.
2. Añadir interruptor global de "Solo Servidores HLS" en la cabecera de la sección de Servidores.

### Fase 4: Integración en el Resolver y Reproductor
1. Actualizar `app/api/resolve/route.ts`:
   - Leer `allow_embed_fallback` desde `config`.
   - Si está desactivado, excluir fuentes que no sean de tipo `hls`.
   - Utilizar `runHlsExtractor` para resolver de forma unificada.

### Fase 5: Verificación Integral
1. Crear script `scripts/test-hls-engine.mjs` para testear todos los presets y el endpoint de test del admin.
2. Ejecutar `npm run build` y asegurar 0 errores de compilación.
