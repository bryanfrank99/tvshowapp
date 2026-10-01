# Spec 107: Extracción Directa de HLS y Opciones Originales para S14 (MegaEmbed)

## 1. Contexto y Problema Actual
El usuario analizó las peticiones y respuestas del servidor original de S14 (`https://mgeb.top`) y determinó el mecanismo exacto de extracción:
- Para series: `GET https://mgeb.top/embed/{id}/{s}/{e}` (ej. `https://mgeb.top/embed/1399/1/1`)
- Para películas: `GET https://mgeb.top/embed/{id}` (ej. `https://mgeb.top/embed/550`)
- En el HTML devuelto, se encuentra el objeto:
  `var sources = [{"file":"...mp4","type":"mp4","label":"Opção 1"},{"file":"https://mgeb.top/../cache/hls/...m3u8","type":"hls","label":"Opção 2"}, ...];`
- El usuario solicita:
  > "actualiza el S14 dejalo respondiendo directamente desde su api original, configurando el Motor de Extracción HLS"

### Diagnóstico del Estado Actual de S14:
1. **Estado en Base de Datos:**
   - En la tabla `providers`, S14 (`megaembed`) estaba marcado como `active: false`.
2. **Motor de Extracción HLS (`megaembed_parse_sources`):**
   - Aunque la acción parseaba `sources_json`, no construía el listado estructurado de `embeds` para la entrega de mirrors/opciones a `/api/resolve`.
   - El output del pipeline en `provider_extractor_configs` no declaraba `"embeds": "{{mega_streams.embeds}}"`.
   - La normalización de URLs relativas como `https://mgeb.top/../cache/...` debe normalizar de forma infalible las barras `/../` para producir streams HLS válidos (`https://mgeb.top/cache/hls/...m3u8`).
3. **Modo de Transmisión por Defecto:**
   - S14 debe estar configurado en modo `"both"` (tanto en backend como en Supabase `provider_stream_modes`), para entregar:
     - `HLS - S14`: Stream nativo directo `.m3u8` con máxima prioridad (120).
     - `S14 (MegaEmbed)`: Tarjeta multi-mirror con todas las opciones originales (`Opção 1`, `Opção 2`, etc.).

---

## 2. Requerimientos y Criterios de Aceptación
1. **Pipeline de Extracción Declarativo (`lib/hls-engine.ts`):**
   - El paso `http_request` consulta directamente `https://mgeb.top/embed/{id}` para películas y `https://mgeb.top/embed/{id}/{s}/{e}` para series.
   - Extraer `var sources = [...]` mediante la acción `regex_extract`.
   - En `megaembed_parse_sources`:
     - Normalizar URLs relativas (resolviendo `/../` a `/`).
     - Priorizar streams HLS (`type === "hls"` o terminados en `.m3u8`) para `hlsUrl`.
     - Agregar mirrors restantes y MP4 a `backupHlsUrls`.
     - Generar el array estructurado `embeds` con todas las opciones encontradas (`Opção 1`, `Opção 2`, etc.) preservando metadatos.
     - Retornar `{ hlsUrl, backupHlsUrls, embeds, primaryUrl }`.
   - Declarar en el `output` del preset:
     ```json
     {
       "hlsUrl": "{{mega_streams.hlsUrl}}",
       "backupHlsUrls": "{{mega_streams.backupHlsUrls}}",
       "embeds": "{{mega_streams.embeds}}"
     }
     ```
2. **Activación y Paridad en Base de Datos Supabase:**
   - Activar S14 en la tabla `providers`: `active: true`.
   - Actualizar `provider_extractor_configs.megaembed` en la tabla `config`.
   - Configurar `provider_stream_modes.megaembed = 'both'`.
3. **Soporte en Backend API:**
   - En `app/api/resolve/route.ts`, `app/api/admin/providers/route.ts` y `app/admin/page.tsx`, `megaembed` debe tener modo por defecto `"both"`.
4. **Verificación y Pruebas:**
   - Crear script `scripts/test-s14-hybrid.mjs` que certifique la extracción directa de película 550 y serie 1399/1/1, así como la resolución en `/api/resolve`.
   - Compilar con `npm run build` sin errores.
   - Commit y push a `main`.
