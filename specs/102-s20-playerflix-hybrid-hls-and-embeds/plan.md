# Plan de Implementación - Spec 102

## 1. Modificación en `lib/hls-engine.ts`
- **Sub-extracción de streams HLS en `playerflix_resolve_options`:**
  - Mapear concurrentemente `rawOptions`:
    1. Si `opt.embed` contiene `watchplay.shop`:
       - Hacer `fetch(opt.embed)` con timeout de 3500ms.
       - Extraer regex `url:\s*"([^"]+playlist\.m3u8[^"]*)"` o `https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*`.
       - Si coincide, guardar stream HLS nativo.
    2. Si `opt.embed` contiene `embedplayer` o `opt.embed_id`:
       - Consultar la API de `embedplayer2.xyz/player/index.php?data=${id}&do=getVideo` con timeout de 3500ms.
       - Extraer `json.securedLink` o `json.videoSource` si contiene `.m3u8`.
  - Construir salida:
    - `hlsUrl`: primer stream HLS encontrado.
    - `backupHlsUrls`: streams HLS adicionales.
    - `embeds`: todas las opciones originales (`Embed Play`, `VIP Player`, `Premium`, `WatchPlay`).
    - `title`: título del contenido.
- **Preset `EXTRACTOR_PRESETS.playerflix`:**
  - Configurar salida:
    - `hlsUrl`: `{{playerflix_streams.hlsUrl}}`
    - `backupHlsUrls`: `{{playerflix_streams.backupHlsUrls}}`
    - `embeds`: `{{playerflix_streams.embeds}}`
    - `title`: `{{playerflix_ajax.data.title}}`

## 2. Actualización en Base de Datos
- Sincronizar el preset en `supabase/seed.sql` y ejecutar `scripts/update-supabase-pipelines.mjs` para actualizar Supabase en vivo y subir la versión a `116`.

## 3. Pruebas y Certificación
- Probar extracción de película `687163` y serie `1399` verificando presencia simultánea de `hlsUrl` y `embeds`.
- Ejecutar `npm run build` y asegurar 0 errores.
