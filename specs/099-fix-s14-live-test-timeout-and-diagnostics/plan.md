# Plan de Implementación: Especificación 099

## Fase 1: Ajuste de Presets y Engine (`lib/hls-engine.ts`)
1. Actualizar `EXTRACTOR_PRESETS.megaembed`:
   - `timeout_ms: 25000` en el paso `embed_page`.
   - Cabeceras completas de navegador: `User-Agent`, `Accept`, `Referer: https://mgeb.top/`.
2. Actualizar timeout de extracción en `app/api/resolve/route.ts` a 25,000ms.

## Fase 2: Robustecimiento de Rutas y Panel Admin
1. En `app/api/admin/providers/route.ts`:
   - Aceptar `movieTpl: b.movie_tpl || b.movie_api_url` y `tvTpl: b.tv_tpl || b.tv_api_url`.
2. En `app/admin/page.tsx`:
   - `setTestExtractorResult(data.result || { success: false, error: data.error })` para no perder la traza ni el error.

## Fase 3: Sincronización Supabase y Seed
1. Ejecutar `scripts/update-supabase-pipelines.mjs` para aplicar el nuevo timeout y headers a Supabase.
2. Actualizar `supabase/seed.sql`.

## Fase 4: Pruebas y Certificación
1. Probar test en vivo desde script simulando llamada de administración.
2. Verificar compilación limpia con `npm run build`.
