# Plan de Implementación: Spec 107 - Extracción Directa de S14 (MegaEmbed)

## Fase 1: Motor de Extracción Declarativo (`lib/hls-engine.ts`)
1. Mejorar la acción `megaembed_parse_sources`:
   - Parsear JSON del array `sources`.
   - Limpiar y normalizar URLs relativas (reemplazar `/../` por `/` y asegurar esquema `https:`).
   - Separar fuentes `hls` y `mp4`.
   - Seleccionar stream HLS primario para `hlsUrl` (o MP4 como fallback si no hay HLS).
   - Acumular el resto de streams HLS y MP4 en `backupHlsUrls`.
   - Construir array `embeds` estructurado con `{ name, server, host, language, url, embed, label, lang, budget, icon, type }`.
   - Retornar `{ hlsUrl, backupHlsUrls, embeds, primaryUrl }`.
2. Actualizar el preset `megaembed` en `EXTRACTOR_PRESETS`:
   - Mantener URLs del step 1:
     - `movie_url`: `https://mgeb.top/embed/{id}`
     - `tv_url`: `https://mgeb.top/embed/{id}/{s}/{e}`
   - Incluir `"embeds": "{{mega_streams.embeds}}"` en el bloque `output`.

## Fase 2: Configuración en APIs y Backend
1. En `app/api/resolve/route.ts`:
   - Incluir `megaembed` en los proveedores con modo de stream por defecto `"both"`:
     `(prov.id === "playerflix" || prov.id === "cinecalidad" || prov.id === "megaembed" ? "both" : ...)`
2. En `app/api/admin/providers/route.ts`:
   - Configurar `megaembed` con modo por defecto `"both"`.
3. En `app/admin/page.tsx`:
   - Configurar `megaembed` con modo por defecto `"both"`.
4. En `supabase/seed.sql`:
   - Actualizar pipeline de `megaembed` con `embeds` en el output y marcar `active = true`.

## Fase 3: Sincronización en Base de Datos Supabase
1. Crear y ejecutar `scripts/sync-s14-to-supabase.mjs`:
   - Actualizar tabla `providers` para `megaembed`: `active: true`.
   - Actualizar tabla `config`:
     - `provider_extractor_configs.megaembed`: nuevo pipeline con `output.embeds`.
     - `provider_stream_modes.megaembed = 'both'`.
   - Limpiar caché de streams para `megaembed`.

## Fase 4: Pruebas y Despliegue
1. Crear `scripts/test-s14-hybrid.mjs` y verificar:
   - Película 550: HLS extraído, backup URLs y embeds de todas las opciones.
   - Serie 1399/1/1: HLS extraído, backup URLs y embeds.
   - `/api/resolve`: ambas fuentes (`HLS - S14` y tarjeta `S14 (MegaEmbed)` con opciones).
2. Ejecutar `npm run build` certificando cero errores.
3. Commit y push a `main`.
