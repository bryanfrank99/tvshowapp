# Plan de Implementación - Spec 101

## 1. Actualización en `lib/hls-engine.ts`
- **Acción `playerflix_resolve_options`:**
  - Recibe `step.input` (la lista `data.options` devuelta por `playerflix_ajax`).
  - Itera sobre cada opción y extrae:
    - `url`: la URL del embed original (`https://embedplayabyss.top/...`, `https://embedplayer2.xyz/video/...`, `https://superflixapi.quest/...`, `https://v1.watchplay.shop/...`).
    - `name`: `${opt.label || 'Servidor'} (${opt.lang || 'PT'})`.
    - `server`: identificador limpio (`embedplay`, `embedplayer`, `superflix`, `watchplay`).
    - `host`: nombre del host formateado.
    - `language`: normalizado a `pt`, `en`, `es`.
  - Construye el listado homogéneo `embeds`.
  - Define `primaryEmbed` (el primer servidor disponible) para emisión inmediata.
- **Preset `EXTRACTOR_PRESETS.playerflix`:**
  - Paso 1: `playerflix_ajax` (`http_request` contra `https://playerflix.ink/inc/Ajax.php?...` con cabeceras `X-Requested-With`, `Referer`, `User-Agent`).
  - Paso 2: `playerflix_options` (`playerflix_resolve_options` con input `{{playerflix_ajax.data.options}}`).
  - `output`:
    - `embeds`: `{{playerflix_options.embeds}}`
    - `title`: `{{playerflix_ajax.data.title}}`
    - `hlsUrl`: `{{playerflix_options.hlsUrl}}`
    - `backupHlsUrls`: `{{playerflix_options.backupHlsUrls}}`

## 2. Ajustes en `supabase/seed.sql`
- Actualizar el registro de `playerflix` en `provider_extractor_configs` y en la tabla `providers` con las URLs `movie_tpl` y `tv_tpl` directas a `https://playerflix.ink/inc/Ajax.php?...`.

## 3. Limpieza en `app/api/resolve/route.ts`
- Garantizar que si el extractor devuelve `embeds` para S20 (y `hlsUrl` no existe o no es necesario), se emita la fuente con `embedOptions` completas apuntando a los servidores originales.

## 4. Pruebas y Certificación
- Probar con `npx tsx` sobre película `687163` y serie `1399`.
- Ejecutar `npm run build` y verificar 0 errores.
